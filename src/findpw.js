// Content script for ssp
'use strict';
let logging = false;
let hideLabels = true; // Make it easy to turn off label hiding
let clickSitePassword = "Click SitePassword";
let clickSitePasswordTitle = "Click on the SitePassword icon"
let clickHere = "Click here for password";
let pasteHere = "Dbl-click or paste your password";
let insertUsername = "Dbl-click for user name";
let sitepw = "";
let userid = "";
let maxidfields = 0;
let keyPressed = false;
let dupNotified = false;
let cleared = false; // Has password been cleared from the clipboars
let cpi = { count: 0, pwfields: [], idfield: null };
let readyForClick = false;
let mutationObserver;
let oldpwfield = null;
let savedPlaceholder = "";
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
window.onload = function () {
    if (cpi.pwfields.length === 0) startup(); // In case DOM is already ready
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
// Some sites change the page contents based on the fragment
window.addEventListener("hashchange", async (_href) => {
    if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid and sendpageinfo from hash change listener");
    cpi = await countpwid();
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
        cpi = await countpwid();
        // Firefox doesn't preserve sessionStorage across restarts of
        // the service worker.  Sending periodic messages keeps it
        // alive, but there's no point to keep sending if there's an error.
        // let keepAlive = setInterval(() => {
        //     chrome.runtime.sendMessage({"cmd": "keepAlive"}, (alive) => {
        //         if (chrome.runtime.lastError) {
        //             console.log("findpw keepAlive error", error);
        //             clearInterval(keepAlive);
        //         } else {
        //             if (!alive.keepAlive) clearInterval(keepAlive);
        //         }
        //     });
        // }, 10_000);
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
            if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid from listener");
            readyForClick = request.readyForClick;
            let mutations = mutationObserver.takeRecords();
            cpi = await countpwid();
            switch (request.cmd) {
                case "fillfields":
                    if (logging) console.log(document.URL, Date.now() - start, "findpw fillfields", cpi, request);
                    userid = request.u;
                    fillfield(cpi.idfield, userid);
                    fillfield(cpi.pwfields[0], request.p);
                    setPlaceholder(userid);
                    sendResponse("fillfields");
                    break;
                case "update":
                    // If the user changes a setting in the popup, the password
                    // on the page may not be what the user thinks it is.  However,
                    // I can't just fill the form if the password field is empty.
                    userid = request.u;
                    fillfield(cpi.idfield, userid);
                    sitepw = request.p;
                    if (cpi.pwfields[0] && cpi.pwfields[0].value) {
                        if (cpi.pwfields.length === 1 && cpi.pwfields[0].value !== sitepw) cpi.pwfields[0].value = "";
                        setPlaceholder(userid);
                        sendResponse("update");
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
                    setPlaceholder("");
                    sendResponse("clear");
                    break;
                default:
                    if (logging) console.log(document.URL, Date.now() - start, "findpw unexpected message", request);
                    sendResponse("default");
            }
            let myMutations = mutationObserver.takeRecords();
            if (logging) console.log("findpw listener fillfields my mutations", myMutations);
            handleMutations(mutations);
        });
    }
    if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid and sendpageinfo from onload");
    cpi = await countpwid();
    await sendpageinfo(cpi, false, true);
    return true;
}
async function handleMutations(mutations) {
    if (extensionRemoved()) return; // Don't do anything if the extension has been removed
    if (!mutationObserver) return; // No need to handle mutations if the observer has been removed
    if (document.hidden && document.hasFocus() || !mutations[0]) return;
    clearTimeout(lasttry);
    // Find password field if added late
    if (logging) console.log(document.URL, Date.now() - start, "findpw DOM changed", cpi, mutations);
    if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid and sendpageinfo from mutation observer");
    // Without this delay, certain warnings from the page get reported as coming from isHidden().
    // (See https://www.fastcompany.com/91277240/how-to-spot-fake-job-postings-and-avoid-scams.)
    // The problem is that element style properities are evaluated lazily, and my code is the 
    // first to do that after the mutation.  The delay gives the page a chance to check 
    // the style properties before I do.  As a result, the warning gets reported as coming 
    // from the page, not the content script.
    setTimeout(async () => {
        cpi = await countpwid();
        if (!cpi) return; // Should never happen, but it does
        oldpwfield = cpi.pwfields[0];
        await sendpageinfo(cpi, false, true);
        // The mutation observer can be null if the extension has been removed
        if (mutationObserver) {
            let myMutations = mutationObserver.takeRecords();
            if (logging) console.log("findpw handleMutations my mutations", myMutations);
        }
    }, 10); // A delay of 0 didn't work, so 10 ms might not be long enough.
}
function fillfield(field, text) {
    // Don't change unless there is a different value to avoid mutationObserver cycling
    if (field && text && text !== field.value) {
        if (logging) console.log(document.URL, Date.now() - start, "findpw fillfield value text", field.value, text);
        field.value = text.trim();
        fixfield(field, text.trim());
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
    if (document.hidden && document.hasFocus()) return; // Don't do anything if the page is not visible
    // No need to send page info if no password fields found.  The user will have to open
    // the popup, which will supply the needed data
    if (cpi.pwfields.length === 0) return;
    if (logging) console.log(document.URL, Date.now() - start, "findpw sending page info: pwcount = ", cpi.pwfields.length || 0);
    let response = {};
    try {
        response = await retrySendMessage({
            "count": cpi.pwfields.length || 0,
            "clicked": clicked,
            "onload": onload
        });
    } catch (error) {
        console.error(document.URL, Date.now() - start, "findpw sendpageinfo error", error);
        return;
    }
    if (!response) return; // No response means something went wrong
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
    userid = response.u;
    let mutations = mutationObserver.takeRecords();
    fillfield(cpi.idfield, userid);
    setPlaceholder(userid, response.p);
    if (userid) fillfield(cpi.pwfields[0], "");
    let myMutations = mutationObserver.takeRecords();
    if (logging) console.log("findpw sendpageinfo my mutations", myMutations);
    await handleMutations(mutations);
}
// Some sites use placeholders and tooltips to tell the user what to do.
// I don't want to hide that information from the user, so I don't overwrite 
// existing placeholders.  However, I still need to tell the user what to do. 
// My strategy that if there is more than one password field, and any of them 
// has a placeholder, I won't overwrite them except for Click SitePassword. 
// I'll communicate with the user by replacing the any tooltips provided by 
// the site.
async function setPlaceholder(userid) {
    if (logging) console.log(document.URL, Date.now() - start, "findpw setPlaceholder", userid, readyForClick, cpi.pwfields);
    if (userid) clearLabel(cpi.idfield);
    // See if any password fields have a placholder
    let hasPlaceholder = cpi.pwfields.some((field) => field.placeholder !== "" && 
                                                      field.placeholder !== clickSitePassword &&
                                                      field.placeholder !== clickHere &&
                                                      field.placeholder !== pasteHere);
    if (cpi.pwfields[0] && readyForClick && userid) {
        let placeholder = (cpi.pwfields.length === 1) ? clickHere : pasteHere;
        if (logging) console.log(document.URL, Date.now() - start, "findpw setPlaceholder", placeholder);
        if (cpi.pwfields[0].placeholder ===  clickSitePassword) {
            cpi.pwfields[0].placeholder = savedPlaceholder || placeholder;
        }
        for (let i = 0; i < cpi.pwfields.length; i++) {
            if (cpi.pwfields.length > 1 ) {
                cpi.pwfields[i].onclick = null;
                if (!cpi.pwfields[i].ondblclick) cpi.pwfields[i].ondblclick = pwfieldOnclick;
            }
            if (!hasPlaceholder || cpi.pwfields.length === 1) {
                cpi.pwfields[i].placeholder = placeholder;
                cpi.pwfields[i].ariaPlaceholder = placeholder;
            }
            cpi.pwfields[i].title = placeholder;
            clearLabel(cpi.pwfields[i]);
        }
    } else if (cpi.pwfields.length > 0) {
        if (elementHasPlaceholder(cpi.pwfields[0])) savedPlaceholder = cpi.pwfields[0].placeholder || "";
        if (logging) console.log(document.URL, Date.now() - start, "findpw setPlaceholder", clickSitePassword);
        cpi.pwfields[0].placeholder = clickSitePassword;
        cpi.pwfields[0].ariaPlaceholder = clickSitePassword;
        if (!elementHasPlaceholder(cpi.pwfields[0])) cpi.pwfields[0].title = clickSitePasswordTitle;
        clearLabel(cpi.pwfields[0]);
    }
    function elementHasPlaceholder(element) {
        return element && element.placeholder && 
             !(element.placeholder === clickHere || 
               element.placeholder === pasteHere ||
               element.placeholder === clickSitePassword);
    }
}
async function pwfieldOnclick(event) {
    if (extensionRemoved()) return; // Don't do anything if the extension has been removed
    if (logging) console.log(document.URL, Date.now() - start, "findpw get sitepass", event);
    if (!(this.placeholder === clickSitePassword)) {
        let response;
        try {
            response = await retrySendMessage({ "cmd": "getPassword" });
        } catch (error) {
            console.error(document.URL, Date.now() - start, "findpw pwfieldOnclick error", error);
            return;
        }
        sitepw = response;
        if (logging) console.log(document.URL, Date.now() - start, "findpw response", response);
        let mutations = mutationObserver.takeRecords();
        fillfield(this, response);
        let myMutations = mutationObserver.takeRecords();
        if (logging) console.log(document.URL, Date.now() - start, "findpw got password", this, response, myMutations);
        await handleMutations(mutations);
    } else {
        // Because people don't always pay attention
        if (!this.placeholder || this.placeholder === clickSitePassword) alert(clickSitePassword);
        await Promise.resolve(); // To match the await in the other branch
    }
}
async function countpwid() {
    if (extensionRemoved()) return {pwfields: [], idfield: null}; // Don't do anything if the extension has been removed
    let useridfield = null;
    let visible = true;
    let pwfields = [];
    let found = -1;
    let c = 0;
    let maybeUsernameFields = [];
    let inputs = document.getElementsByTagName("input");
    if (cpi.pwfields.length === 0 && inputs.length === 0) inputs = searchShadowRoots(document.body);
    for (let i = 0; i < inputs.length; i++) {
        visible = !isHidden(inputs[i]);
        // I'm only interested in visible text and email fields, 
        // and splitting the condition makes it easier to debug
        if (visible && (inputs[i].type === "text" || inputs[i].type === "email")) {
            maybeUsernameFields.push(inputs[i]);
        }
        if (visible && inputs[i].type && (inputs[i].type.toLowerCase() === "password")) {
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
                    c++;
                    if (c === 1) {
                        found = i;
                        inputs[i].onkeydown = function (event) {
                            if (event.key) {
                                keyPressed = true;
                            }
                        }
                    }
                    inputs[i].onclick = pwfieldOnclick;
                }
            }
        }
    }
    // Some sites let you see your passwords, which changes the input type from
    // password to text.  The result is that the heuristic for finding a userid
    // field actually finds a password field with a visible password and replaces
    // the password with the userid.
    if (c > maxidfields) maxidfields = c;
    if (maxidfields == 1) {
        for (let i = found - 1; i >= 0; i--) {
            // Skip over invisible input fields above the password field
            visible = !isHidden(inputs[i]);
            if (visible && (inputs[i].type == "text" || inputs[i].type == "email")) {
                inputs[i].onkeydown = function (event) {
                    if (event.key) {
                        keyPressed = true;
                    }
                }
                useridfield = inputs[i];
                break;
            }
        }
    }
    // Allow dbl click to fill in the username if there is exactly one text field,
    // no password fields, the text field is empty, and there is no ondblclick handler.
    if (c === 0 && maybeUsernameFields.length === 1 && !maybeUsernameFields[0].value && !maybeUsernameFields[0].ondblclick) {
        maybeUsernameFields[0].ondblclick = async function () {
            if (extensionRemoved()) return; // Don't do anything if the extension has been removed
           let response;
            try {
                if (logging) console.log(document.URL, Date.now() - start, "findpw getUsername", maybeUsernameFields[0]);
                response = await retrySendMessage({ "cmd": "getUsername" });
            } catch (error) {
                console.error(document.URL, Date.now() - start, "findpw getUsername error", error);
                return;
            }
            if (!response) return; // No response means something went wrong
            let mutations = mutationObserver.takeRecords();
            fillfield(this, response);
            let myMutations = mutationObserver.takeRecords();
            if (logging) console.log(document.URL, Date.now() - start, "findpw got username", this, response, myMutations);
            await handleMutations(mutations);    
        }    
    }
    if (logging) console.log(document.URL, Date.now() - start, "findpw: countpwid", c, pwfields, useridfield);
    return { pwfields: pwfields, idfield: useridfield };
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
// Thanks, Copilot
function isHidden(field) {
    if (!field) return true;

    const style = window.getComputedStyle(field);

    // Check if the element is hidden via CSS properties
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return true;
    }

    // Check if the element is within the viewport
    const rect = field.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    if (rect.top >= viewportHeight || rect.bottom <= 0 || rect.left >= viewportWidth || rect.right <= 0) {
        return true;
    }

    // Check if the element is hidden by its parent
    if (field.offsetParent === null && style.position !== 'fixed') {
        return true;
    }
    // Check if the element is covered by another element
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(centerX, centerY);
    // Checking if the element is covered by another element
    // doesn't work for shadow DOM elements.
    let pointerEvents = window.getComputedStyle(field).pointerEvents;
    if (isInShadowRoot(field) && pointerEvents !== "none") return false;
    if (topElement && topElement !== field && !field.contains(topElement) && !topElement.contains(field)) {
        return true;
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
    if (document.hidden && !document.hasFocus()) return; // Don't send messages if the page is not visible
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await chrome.runtime.sendMessage(message);
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
    if (chrome.runtime?.onMessage) chrome.runtime?.onMessage.removeListener();
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