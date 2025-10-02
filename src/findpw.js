// Content script for ssp
'use strict';
let debugMode = false; // Let's me send messages when the developer window has the focus
let logging = false;
let hideLabels = true; // Make it easy to turn off label hiding
let clickSitePassword = "Click SitePassword";
let clickSitePasswordTitle = "Click on the SitePassword icon"
let clickHere = "Click here for password";
let pasteHere = "Dbl-click or paste your password";
let sspPlaceholders = [clickHere, pasteHere, clickSitePassword];
let insertUsername = "Dbl-click if your username goes here";
let sitepw = "";
let username = "";
let usernameEdited = false;
let usernameEntered = false;
let dupNotified = false;
let cleared = false; // Has password been cleared from the clipboard
let readyForClick = false;
let mutationObserver;
let maybeUsernameFields = [];
let lastcpi = null; // Last countpwid result
let messageQueue = Promise.resolve();
let lasttry = setTimeout(() => { // I want to be able to cancel without it firing
    if (logging) console.log("findpw initialize last try timer")
}, 1000000);
let observerOptions = {
    attributes: true,
    characterData: false,
    childList: true,
    subtree: true,
    attributeOldValue: false,
    characterDataOldValue: false
};
let start = Date.now();
if (logging) if (logging) console.log(document.URL, Date.now() - start, "findpw starting");
// Most pages work if I start looking for password fields as soon as the basic HTML is loaded
let started = false;
function startupOnce() {
    document.removeEventListener("DOMContentLoaded", startupOnce);
    if (started) return;
    if (document.readyState === "interactive" || document.readyState === "complete") {
        started = true;
        startup();
    }
}
document.addEventListener("DOMContentLoaded", startupOnce); // In case DOM is not ready
startupOnce();                                              // In case DOM is ready
// Some other pages don't find the password fields until all downloads have completed.
window.onload = async function () {
    if (logging)console.log(document.URL, Date.now() - start, "findpw onload");
    username = await getUsername();
    startupOnce();
}
window.onerror = function (message, source, lineno, colno, error) {
    console.log(document.URL, Date.now() - start, "findpw error", message, source, lineno, colno, error);
    return chrome.runtime?.id ? true : false; // Don't suppress errors if the extension has not been removed
}
// Other pages add additional CSS at runtime that makes a password field visible
// Modified from https://www.phpied.com/when-is-a-stylesheet-really-loaded/
let cssnum = document.styleSheets.length;
// Need var because you can only use let inside a block
if (!startupInterval) var startupInterval = setInterval(() => {
    if (!document.hidden && document.hasFocus() && document.styleSheets.length > cssnum) {
        cssnum = document.styleSheets.length;
        if (logging) console.log(document.URL, Date.now() - start, "findpw css added", cssnum);
        // alert("findpw document startupInterval");
        startup();
    }
}, 2000);
// A password field can be hidden when the page loads, and then made visible when
// the user scrolls the page.  The following listener checks when scrolling stops.
// Thanks, Copilot with some changes by me.
let scrollTimeout;
window.addEventListener('scroll', function() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(async function() {
        // Scrolling has stopped
        let cpi = await countpwid();
        setpwPlaceholder(username, cpi);
        sendpageinfo(cpi, false, false);
    }, 50); // 50ms after last scroll event
});
// Some sites change the page contents based on the fragment
window.addEventListener("hashchange", async (_href) => {
    if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid and sendpageinfo from hash change listener");
    let cpi = await countpwid();
    await sendpageinfo(cpi, false, true);
});
// A few sites put their password fields in a shadow root to isolate it from the rest of the page.
// The only way to find one is to walk the DOM.  That's expensive, so I only do it once.  That
// means I'll miss a shadow root if it's added late.
// From Domi at https://stackoverflow.com/questions/38701803/how-to-get-element-in-user-agent-shadow-root-with-javascript
function searchShadowRoots(element) {
    if (extensionRemoved()) return []; // Don't do anything if the extension has been removed
    if (!element) return [];
    if (logging) console.log("findpw searchShadowRoots", document.location.origin, element);
    // This code results in an security policy error on some pages that doesn't hit
    // the catch block because it's not a JavaScript error.
    try {
        let shadows = Array.from(element.querySelectorAll('*')).reduce((acc, el) => {
            if (el.shadowRoot) acc.push(el.shadowRoot);
            return acc;
        }, []);
        let childResults = shadows.map(child => searchShadowRoots(child));
        let result = Array.from(element.querySelectorAll("input"));
        return result.concat(childResults).flat();
    } catch (error) {
        console.log("Error searching shadow roots:", error);
        return [];
    }
}
// Tell the service worker that the user has copied something to the clipboard
// so it can clear the icon
document.oncopy = async function () {
    if (extensionRemoved()) return; // Don't do anything if the extension has been removed
    try {
        await retrySendMessage({"cmd": "resetIcon"});
    } catch (error) {
        console.error(document.URL, Date.now() - start, "findpw document.oncopy error", error);
    }
    if (logging) console.log(document.URL, Date.now() - start, "findpw reset icon");
}
async function startup() {
    if (!document || !document.body) return; // Don't do anything if the document is not ready
    if (logging) console.log(document.URL, Date.now() - start, "findpw startup");
    if (extensionRemoved()) return true; // Don't do anything if the extension has been removed
    if (document.hidden && document.hasFocus()) return; // Don't do anything if the page is not visible
    // You wouldn't normally go to sitepassword.info on a machine that has the extension installed.
    // However, someone may have hosted the page at a different URL.  Hence, the test.
    // Don't do anything if this is a SitePasswordWeb page
    if (document.getElementById("SitePasswordWebMarker")) return;
    // The code in this function used to be called once, but now it's called several times.
    // There is no reason to declare new mutation observers and listeners on every call.
    if (!mutationObserver) {
        // Some pages change CSS to make the password field visible after clicking the Sign In button
        document.body.onclick = function () {
            if (logging) console.log("findpw click on body");
            setTimeout(() => {
                if (logging) console.log("findpw body.onclick");
                startup();
            }, 500);
        };
        mutationObserver = new MutationObserver(handleMutations);
        mutationObserver.observe(document.body, observerOptions);
        chrome.runtime?.onMessage.addListener(async function (request, _sender, sendResponse) {
            messageQueue = messageQueue.then( async () => {
                if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid from listener");
                readyForClick = request.readyForClick;
                let cpi = await countpwid();
                switch (request.cmd) {
                    case "fillfields":
                        if (logging) console.log(document.URL, Date.now() - start, "findpw fillfields", cpi, request);
                        username = request.u;
                        fillfield(cpi.idfield, username);
                        fillfield(cpi.pwfields[0], request.p);
                        setpwPlaceholder(username, cpi);
                        sendResponse("fillfields");
                        break;
                    case "update":
                        // If the user changes a setting in the popup, the password
                        // on the page may not be what the user thinks it is.  However,
                        // I can't just fill the form if the password field is empty.
                        username = request.u;
                        fillfield(cpi.idfield, username);
                        sitepw = request.p;
                        if (cpi.pwfields[0] && cpi.pwfields[0].value) {
                            if (cpi.pwfields.length === 1 && cpi.pwfields[0].value !== sitepw) cpi.pwfields[0].value = "";
                            setpwPlaceholder(username, cpi);
                            sendResponse("updated");
                        }
                        break;
                    case "count":
                        let pwdomain = document.location.hostname;
                        let pwcount = cpi.pwfields.length || 0;
                        let uid = cpi.idfield ? cpi.idfield.value : "";
                        if (logging) console.log(document.URL, Date.now() - start, "findpw got count request", pwcount, pwdomain);
                        sendResponse({ "pwcount": pwcount, "id": uid, "pwdomain": pwdomain });
                        break;
                    case "clear":
                        if (cpi.idfield) cpi.idfield.value = "";
                        for (let i = 0; i < cpi.pwfields.length || 0; i++) {
                            cpi.pwfields[i].value = "";
                        }
                        setpwPlaceholder("", cpi);
                        sendResponse("clear");
                        break;
                    case "activated":
                        if (logging) console.log(document.URL, Date.now() - start, "findpw got activated message");
                        sendResponse("activated");
                        cpi = await countpwid();
                        await sendpageinfo(cpi, false, true);
                        break;
                    default:
                        if (logging) console.log(document.URL, Date.now() - start, "findpw unexpected message", request);
                        sendResponse("default");
                }
            });
        });
    }
    if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid and sendpageinfo from onload");
    let cpi = await countpwid();
    await sendpageinfo(cpi, false, true);
    return true;
}
// I never deal with individual mutations, just the fact that something changed.
let cpiTimeout = null; // Only call countpwid after things have settled down
async function handleMutations(mutations) {
    if (extensionRemoved()) return; // Don't do anything if the extension has been removed
    if (!mutations || mutations.length === 0) return; // Nothing to do if no mutations
    if (!debugMode && (document.hidden || !document.hasFocus())) return; // Only deal the active tab unless debugging   
    if (mutations.every(m => m.target.setbyssp === true)) return; // Don't do anything if all the mutations were caused by me
    clearTimeout(lasttry);
    clearTimeout(cpiTimeout); // Only call countpwid() once things have settled down
    // Without this delay, certain warnings from the page get reported as coming from isHidden().
    // (See https://www.fastcompany.com/91277240/how-to-spot-fake-job-postings-and-avoid-scams.)
    // The problem is that element style properities are evaluated lazily, and my code is the 
    // first to do that after the mutation.  The delay gives the page a chance to check 
    // the style properties before I do.  As a result, the warning gets reported as coming 
    // from the page, not the content script.
    cpiTimeout = setTimeout(async () => {
        // Find the userid and password fields in case they were added late
        let cpi = await countpwid();
        if (logging) console.log(document.URL, Date.now() - start, "findpw DOM changed", cpi, mutations);
        await sendpageinfo(cpi, false, true);
    }, 200); // A delay of 100 didn't work, so 200 ms might not be long enough.
}
function fillfield(field, text) {
    // Don't change unless there is a different value to avoid mutationObserver cycling
    if (!field || !text || text.trim() === field.value.trim()) return;
    // Don't change what the user entered in the username field
    if (maybeUsernameFields.includes(field) && usernameEdited) return;
    if (logging) console.log(document.URL, Date.now() - start, "findpw fillfield value text", field.value, text);
    field.value = text.trim();
    // Setting a value should not be reported as a mutation, but sometimes it is.
    field.setbyssp = true; // To avoid recursion in mutation observer
    fixfield(field, text.trim());
    if (maybeUsernameFields.includes(field)) {
        usernameEntered = true;
        usernameEdited = false;
    }
}
// Some pages don't know the field has been updated
function fixfield(field, text) {
    // Maybe I just need to tell the page that the field changed
    makeEvent(field, "change");
    makeEvent(field, "onchange");
    makeEvent(field, "input");
    makeEvent(field, "HTMLEvents");
    makeEvent(field, "keydown");
    makeEvent(field, "keypress");
    makeEvent(field, "keyup");
    makeEvent(field, "cut");
    makeEvent(field, "paste");
    // Is there a better test for telling if the page knows the value has been set?
    if (logging) console.log(document.URL, Date.now() - start, "findpw focus test", field.value, text);
}
// Sometimes the page doesn't know that the value is set until an event is triggered
function makeEvent(field, type) {
    let event = new Event(type, { bubbles: true, view: window, cancelable: true });
    field.dispatchEvent(event);
}
async function sendpageinfo(cpi, clicked, onload) {
    if (extensionRemoved()) return; // Don't do anything if the extension has been removed
    // Only send page info if this tab has focus
    if (!document.hidden && document.hasFocus()) {
        await sendpageinfoRest(cpi, clicked, onload);
    } else {
        const visHandler = document.addEventListener("visibilitychange", async () => {
            if (document.hidden && document.hasFocus()) return;
            document.removeEventListener("visibilitychange", visHandler);
            await sendpageinfoRest(cpi, clicked, onload);
            return;
        });
    }
}
// Needed to avoid recursion in visibility change test
async function sendpageinfoRest(cpi, clicked, onload) {
    if (extensionRemoved()) return; // Don't do anything if the extension has been removed
    // No need to send page info if no password fields found.  The user will have to open
    // the popup, which will supply the needed data
    if (cpi.pwfields.length === 0) return;
    if (logging) console.log(document.URL, Date.now() - start, "findpw sending page info: pwcount = ", cpi.pwfields.length || 0);
    let response = {};
    try {
        response = await retrySendMessage({
            "cmd": "pageInfo",
            "count": cpi.pwfields.length || 0,
            "clicked": clicked,
            "onload": onload
        });
    } catch (error) {
        console.error(document.URL, Date.now() - start, "findpw sendpageinfo error", error);
        return;
    }
    if (!response) return; // No response means something went wrong
    if (response === "unknown request") {
        alert("The SitePassword extension got an unknown request.");
    }
    if (response === "multiple") {
        alert("You have more than one entry in your bookmarks with a title SitePasswordData.  Delete or rename the ones you don't want SitePassword to use.  Then reload this page.");
        return;
    }
    if (response === "duplicate" && !dupNotified) {
        dupNotified = true;
        let alertString = "You have one or more duplicate bookmarks in your SitePasswordData bookmark folder.  ";
        alertString += "Open the Bookmark Manager and delete the ones in the SitePasswordData folder ";
        alertString += "that you don't want.  Then reload this page.\n\n";
        alertString += "The easiest way to see what's in the duplicate bookmarks is to click on them.  "
        alertString += "They will open sitepassword.info with the settings for that bookmark filled in.";
        alert(alertString);
        return;
    }
    if (logging) console.log(document.URL, Date.now() - start, "findpw response", response);
    readyForClick = response.readyForClick;
    username = response.u;
    sitepw = response.p;
    fillfield(cpi.idfield, username);
    setpwPlaceholder(username, cpi);
    if (username) fillfield(cpi.pwfields[0], "");
    if (logging) console.log("findpw sendpageinfo my mutations", myMutations);
}
// Some sites use placeholders and tooltips to tell the user what to do.
// I don't want to hide that information from the user, so I don't overwrite 
// existing placeholders.  However, I still need to tell the user what to do. 
// My strategy that if there is more than one password field, and any of them 
// has a placeholder, I won't overwrite them except for Click SitePassword. 
// I'll communicate with the user by replacing the any tooltips provided by 
// the site.
async function setpwPlaceholder(username, cpi) {
    if (logging) console.log(document.URL, Date.now() - start, "findpw setpwPlaceholder", username, readyForClick, cpi.pwfields);
    if (!cpi || !cpi.pwfields || cpi.pwfields.length === 0) return;
    let placeholder = (cpi.pwfields.length === 1) ? clickHere : pasteHere;
    if (!readyForClick || !username) placeholder = clickSitePassword;
    if (logging) console.log(document.URL, Date.now() - start, "findpw setpwPlaceholder", placeholder);
    for (let i = 0; i < cpi.pwfields.length; i++) {
        let pwfield = cpi.pwfields[i];
        pwfield.title = placeholder; // Unconditionally set the title
        let oneOfMine = sspPlaceholders.includes(placeholder); 
        if (!oneOfMine && pwfield.setbyssp) continue; // Don't overwrite if I previously set it and the page then changed it.
        pwfield.setbyssp = true; // To avoid recursion in mutation observer
        pwfield.placeholder = placeholder;
        pwfield.ariaPlaceholder = placeholder;
        clearLabel(pwfield);
    }
}
function elementHasPlaceholder(element) {
    // I do want to replace the placeholder even if it's not one of mine
    // let hasFloating = await isFloatingLabel(element);
    if (!element.placeholder) return false;
    return element &&  
            !(element.placeholder === clickHere ||
            element.placeholder === pasteHere ||
            element.placeholder === clickSitePassword);
}
async function pwfieldOnclick(event) {
    if (extensionRemoved()) return; // Don't do anything if the extension has been removed
    if (logging) console.log(document.URL, Date.now() - start, "findpw get sitepass", event);
    if (this.placeholder !== clickSitePassword) {
        let response;
        try {
            response = await retrySendMessage({ "cmd": "getPassword" });
        } catch (error) {
            console.error(document.URL, Date.now() - start, "findpw pwfieldOnclick error", error);
            alert("Error getting password: " + error.message);
            return;
        }
        sitepw = response;
        if (logging) console.log(document.URL, Date.now() - start, "findpw response", response);
        fillfield(this, response);
        if (logging) console.log(document.URL, Date.now() - start, "findpw got password", this, response);
    } else {
        // Because people don't always pay attention
        if (!this.placeholder || this.placeholder === clickSitePassword) alert(clickSitePassword);
        await Promise.resolve(); // To match the await in the other branch
    }
}
async function countpwid() {
    if (extensionRemoved()) return {pwfields: [], idfield: null}; // Don't do anything if the extension has been removed
    let usernamefield = null;
    let visible = true;
    let pwfields = [];
    let pwcount = 0;
    maybeUsernameFields = [];
    let inputs = document.getElementsByTagName("input");
    if (inputs.length === 0) inputs = searchShadowRoots(document.body);
    for (let i = 0; i < inputs.length; i++) {
        visible = !isHidden(inputs[i]);
        if (visible) {
            // I'm only interested in visible text and email fields, 
            // and splitting the condition makes it easier to debug
            if ((inputs[i].type === "text" || inputs[i].type === "email")) {
                maybeUsernameFields.push(inputs[i]);
            } else if (inputs[i].type && (inputs[i].type.toLowerCase() === "password")) {
                // At least one bank disables the password field until I focus on the username field.
                // Note that the field can be readOnly, and clicking will fill it in.
                inputs[i].disabled = false;
                if (logging) console.log(document.URL, Date.now() - start, "findpw found password field", i, inputs[i], visible);
                let pattern = inputs[i].getAttribute("pattern"); // Pattern [0-9]* is a PIN or SSN
                if (pattern !== "[0-9]*") {
                    if (self.origin === null || self.origin === "null") {
                        inputs[i].type = "text";
                        inputs[i].value = "Untrusted: Input disabled.";
                        inputs[i].style.opacity = 1;
                        inputs[i].disabled = true;
                        //inputs[i].style.display = "none";
                        inputs[i].title = "Since this login form is probably provided by someone who is trying to steal your password, ";
                        inputs[i].title += "the password field will not accept input from you.  ";
                        inputs[i].title += "If you must use this form, turn off SitePassword in the extensions manager, ";
                        inputs[i].title += "reload the page, and enter your password manually."
                    } else {
                        pwfields.push(inputs[i]);
                        pwcount++;
                        if (logging) console.log(document.URL, Date.now() - start, "findpw adding click handler to pwfield");
                        if (inputs[i].onclick !== pwfieldOnclick) inputs[i].onclick = pwfieldOnclick;
                    }
                }
            }
        }
    }
    // If there is only 1 text input before the password field, it's likely to be a username field.
    if (maybeUsernameFields.length === 1) usernamefield = maybeUsernameFields[0];
    // Allow dbl click to fill in the username if there is a username,
    // the text field is empty, and there is no dblclick handler.
    if (username && maybeUsernameFields.length > 0) {
        for (let i = 0; i < maybeUsernameFields.length; i++) {
            let element = maybeUsernameFields[i];
            // By reassigning usernamefield, I ensure it always points to the username field closest to the password field
            if (isUsernameField(maybeUsernameFields[i])) usernamefield = maybeUsernameFields[i];
            let oneOfMine = element.placeholder === insertUsername; 
            if (!oneOfMine && element.setbyssp) continue; // Don't overwrite if I previously set it and the page then changed it.
               if (element.title !== insertUsername) {
                element.title = insertUsername;
                element.setbyssp = true; // To avoid recursion in mutation observer
            }
            if (!element.ondblclick) {
                 if (logging) console.log(document.URL, Date.now() - start, "findpw adding dblclick to username field", element);
                element.ondblclick = async function () {
                    if (extensionRemoved()) return; // Don't do anything if the extension has been removed
                    fillfield(this, username);
                    if (logging) console.log(document.URL, Date.now() - start, "findpw got username", this, username, myMutations);
                }
            }
        }
    }
    if (usernamefield) {
        usernamefield.onkeyup = function (e) {
            usernameEdited = true;
        };
    }
    if (logging) console.log(document.URL, Date.now() - start, "findpw: countpwid", pwcount, pwfields, usernamefield);
    lastcpi = { pwfields: pwfields, idfield: usernamefield };
    return { pwfields: pwfields, idfield: usernamefield };
}
function clearLabel(field) {
    if (!field || !hideLabels) return;
    let labels = Array.from(document.querySelectorAll("label, [for]"));
    for (let i = 0; i < labels.length; i++) {
        let target = labels[i].getAttribute("for");
        if (target && field && (target === field.id || target === field.name || target === field.ariaLabel)) {
            if (overlaps(field, labels[i]) && field.style.visibility !== "visible" && !labels[i].contains(field)) {
                field.style.visibility = "visible";
                labels[i].style.visibility = "hidden";
                if (isHidden(field)) labels[i].style.visibility = "visible";
                // Could break here if performance becomes a problem
            }
        }
    }
}
// Thanks, Copilot plus some help from me
// There are 2 reasons to hide the element
//     Because the page owner wants it hidden
//     For clickjacking
function isHidden(field) {
    if (!field) return true;
    // ------------------------------------------------
    // These tests look for when the owner wants it hidden

    const style = window.getComputedStyle(field);
    // Check if the element is hidden via CSS properties
    if (style.display === 'none' || style.visibility === 'hidden') {
        return true;
    }

    // Check if the element is within the viewport
    const rect = field.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    if (rect.top >= viewportHeight || rect.bottom <= 0 || rect.left >= viewportWidth || rect.right <= 0) {
        return true;
    }

    // Element is hidden if it or any ancestor has opacity less than 1
    let el = field;
    while (el) {
        const style = window.getComputedStyle(el);
        if (Number(style.opacity) < 1) {
            return true;
        }
        el = el.parentElement;
    }

    // Check if the element is hidden by its parent
    if (field.offsetParent === null && style.position !== 'fixed') {
        return true;
    }
    // Check if the element is covered by another element
    // Doesn't work for shadow DOM elements.
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(centerX, centerY);    
    if (isInShadowRoot(field) && style.pointerEvents !== "none") return false;
    // I want to treat an element as visible even if its label is on top of it
    if (topElement && topElement.getAttribute("for") !== field.id && topElement !== field && 
        !field.contains(topElement) && !topElement.contains(field)) 
    {
        return true;
    }

    // ------------------------------------------------
    // The following tests provide partial protection against clickjacking

    // Check size
    if (rect.width <= 20 || rect.height <= 20) {
        return true;
    }

    // Check color against background
    const bgColor = style.backgroundColor.trim();
    const fieldColor = style.color.trim();
    if (fieldColor === "transparent" || isColorSimilar(bgColor, fieldColor)) {
        // If field has a border, assume it's a different color
        let hasBorder = false;
        for (let i = 0; i < style.length; i++) {
            const prop = style[i];
            if (prop.includes('border')) {
                hasBorder = true;
            }
        }
        // The colors may match, but the label/placeholder will still be visible, assume
        if (!hasBorder && !hasLabel(field) && !field.placeholder) {
            return true;
        }
    }

    // Check transform
    const transform = style.transform;
    if (transform && transform !== 'none') {
        return true;
    }

    // Check if the element is clipped with clip or clip-path
    //getBoundingClientRect will still return the position and size of the un-clipped element, not its clipped area! 
    const clip = style.clip;
    const clipPath = style.clipPath;
    if ((clip && clip !== 'auto' && clip !== 'none') || (clipPath && clipPath !== 'none')) {
        return true;
    }
    // Check if the element overlaps a popover or dialog
    if (isObscuredByPopoverOrDialog(field.id)) {
        return true;
    }

    return false;
}
// Thank you, Copilot
function isColorSimilar(color1, color2) {
    // Simple color similarity check (you can improve this)
    // Parse rgb(a) or hex colors to compare similarity
    function parseColor(color) {
        if (!color) return [0, 0, 0];
        if (color.startsWith("#")) {
            // hex format
            let hex = color.replace("#", "");
            if (hex.length === 3) hex = hex.split("").map(x => x + x).join("");
            let num = parseInt(hex, 16);
            return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
        }
        // rgb or rgba format
        let match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        return [0, 0, 0];
    }
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    // Euclidean distance between colors
    const dist = Math.sqrt(
        Math.pow(c1[0] - c2[0], 2) +
        Math.pow(c1[1] - c2[1], 2) +
        Math.pow(c1[2] - c2[2], 2)
    );
    // Consider colors similar if distance is less than 40 (tweak as needed)
    return dist < 40;
}
// Thank you, perpexity.ai
function isObscuredByPopoverOrDialog(targetId = 'password') {
    const el = document.getElementById(targetId);
    if (!el || !(el instanceof Element)) return false;

    const elRect = el.getBoundingClientRect();
    if (elRect.width === 0 || elRect.height === 0) return false; // not visible at all

    // Check open popovers (Popover API)
    const popovers = document.querySelectorAll('[popover]:popover-open');
    // Check open modal dialogs
    const dialogs = Array.from(document.querySelectorAll('dialog[open]'))
        .filter(d => typeof d.showModal === "function" && d.open);

    // Combine popovers and dialogs into a single list
    const overlays = [...popovers, ...dialogs];

    for (const overlay of overlays) {
        // Only count overlays that are rendered (not display:none, etc)
        const style = window.getComputedStyle(overlay);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

        const overlayRect = overlay.getBoundingClientRect();

        // If overlay fully covers or even partially covers the password element
        const isCovered = !(
            elRect.right < overlayRect.left ||
            elRect.left > overlayRect.right ||
            elRect.bottom < overlayRect.top ||
            elRect.top > overlayRect.bottom
        );

        if (isCovered) return true;
    }
    return false;
}
function overlaps(field, label) {
    // Only worry about labels above or to the left of the field
    let floc = field.getBoundingClientRect();
    let lloc = label.getBoundingClientRect();
    if (floc.top >= lloc.bottom) return false;
    if (floc.left >= lloc.right) return false;
    return true;
}
// Thanks, perplexity.ai, but I can't get it to work properly
function isFloatingLabel(input) {
    // Get label related to input
    const label = input.labels && input.labels[0];
    if (!label) return false;

    // Get position before focus
    const beforeRect = label.getBoundingClientRect();

    // Simulate focus or value change
    input.value = input.value;
    // Optionally, try input.focus();

    // Allow for potential CSS transition
    return new Promise(resolve => {
        setTimeout(() => {
            const afterRect = label.getBoundingClientRect();
            // If label moved or changed size, likely a floating label
            const moved = (
                beforeRect.top !== afterRect.top ||
                beforeRect.left !== afterRect.left ||
                beforeRect.width !== afterRect.width ||
                beforeRect.height !== afterRect.height
            );
            resolve(moved);
        }, 150); // adjust for transition duration if needed
    });
}
/**
 * Returns true if the input element is likely a username field.
 * @param {HTMLInputElement} element
 * @returns {boolean}
 */
function isUsernameField(element) {
    if (!element || element.tagName !== "INPUT") return false;
    const type = element.type?.toLowerCase();
    if (type !== "text" && type !== "email") return false;
    // Heuristics: id/name/placeholder contains "user", "login", "email", etc.
    const attrs = [
        element.id || "",
        element.name || "",
        element.placeholder || "",
        element.getAttribute("aria-label") || "",
        element.getAttribute("autocomplete") || ""
    ].map(s => s.toLowerCase());

    const usernameKeywords = [
        "user", "login", "email", "username", "userid", "account"
    ];

    // Check autocomplete attribute
    if (attrs[4] === "username" || attrs[4] === "email") return true;

    // Check for keywords in other attributes
    return usernameKeywords.some(keyword =>
        attrs.some(attr => attr.includes(keyword))
    );
}
async function getUsername() {
    try {
        if (logging) console.log(document.URL, Date.now() - start, "findpw getUsername", maybeUsernameFields);
        username = await retrySendMessage({ "cmd": "getUsername" });
        if (logging) console.log(document.URL, Date.now() - start, "findpw getUsername", username);
    } catch (error) {
        console.error(document.URL, Date.now() - start, "findpw getUsername error", error);
        return "";
    }
    return username || "";
}
function isInShadowRoot(element) {
    return element && element.getRootNode() instanceof ShadowRoot;
}
// Sometimes messages fail because the receiving side isn't quite ready.
// That's most often the service worker as it's starting up.
/**
 * Retry sending a message.
 * @param {object} message - The message to send.
 * @param {number} retries - The number of retry attempts.
 * @param {number} delay - The delay between retries in milliseconds.
 * @returns {Promise} - A promise that resolves when the message is successfully sent or rejects after all retries fail.
 */
async function retrySendMessage(message, retries = 5, delay = 100) {
    if (extensionRemoved()) return null; // Don't do anything if the extension has been removed
    // I'll let the page send messages when debugging even though the focus is on the developer tools
    if (!debugMode && (document.hidden || !document.hasFocus())) return; // Don't send messages if the page is not visible
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            if (logging) console.log("findpw retrySendMessage", message);
            const response = await chrome.runtime.sendMessage(message);
            if (response.error) throw new Error(response.error);
            if (logging) console.log("findpw retrySendMessage response", response);
            return response; // Message sent successfully
        } catch (error) {
            console.log(`Attempt ${attempt} failed:`, message, error);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
            } else {
                throw new Error(`Failed to send message after ${retries} attempts`, error);
            }
        }
    }
}
/**
 * Returns true if the element has an associated label or is wrapped in a label.
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function hasLabel(element) {
    if (!element) return false;
    // Check if wrapped in a <label>
    if (element.closest('label')) return true;
    if (!element.id) return false;
    // According to HTML spec, label[for] only associates with an element's id.
    return !!document.querySelector(`label[for="${element.id}"]`);
}
// A content script keeps running even after it's replaced with exectuteScript.
// This function cleans up all the event listeners, timers, and the mutation observer.
function extensionRemoved() {
    if (chrome.runtime?.id !== undefined) return false; // The extension is still installed
    if (logging) console.log(document.URL, Date.now() - start, "findpw cleanup");
    if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
    }
    if (document.body) document.body.onclick = null;
    if (document.oncopy) document.oncopy = null;
    if (window.onerror) window.onerror = null;
    if (window.onload) window.onload = null;
    if (window.onhashchange) window.onhashchange = null;
    if (document.readyState !== "loading") document.onload = null;
    let cpi = lastcpi || { pwfields: [], idfield: null };
    try {
        if (cpi && cpi.idfield) cpi.idfield.onclick = null;
        for (let pwfield of cpi.pwfields) {
            pwfield.onclick = null;
            pwfield.ondblclick = null;
        }
    } catch (error) {
        console.log(document.URL, Date.now() - start, "findpw cleanup error", error);
    }
    if (startupInterval) clearInterval(startupInterval);
    if (lasttry) clearTimeout(lasttry);
    if (typeof chrome !== "undefined" &&
        chrome.runtime &&
        typeof chrome.runtime.id !== "undefined" &&
        chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener();
    }
    return true; // Indicate that the extension has been removed
}   
/* 
This code is a major modification of the code released with the
following licence.  Neither Hewlett-Packard Company nor Hewlett-Packard
Enterprise were involved in the modification.  This source code is
available at https://github.com/alanhkarp/SitePassword.

Copyright 2011 Hewlett-Packard Company. This library is free software;
you can redistribute it and/or modify it under the terms of the GNU
Lesser General Public License (LGPL) as published by the Free Software
Foundation; either version 2.1 of the License, or (at your option) any
later version. This library is distributed in the hope that it will
be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
Lesser General Public License for more details. You should have
received a copy of the GNU Lesser General Public License (LGPL) along
with this library; if not, write to the Free Software Foundation,
Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
Please contact the Hewlett-Packard Company <www.hp.com> for
information regarding how to obtain the source code for this library.
*/