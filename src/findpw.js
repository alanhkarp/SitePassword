// Content script for ssp
'use strict';
var logging = false;
var hideLabels = true; // Make it easy to turn off label hiding
var clickSitePassword = "Click SitePassword";
var clickHere = "Click here for password";
var pasteHere = "Paste your password here";
var sitepw = "";
var userid = "";
var keyPressed = false;
var cleared = false; // Has password been cleared from the clipboars
var cpi = { count: 0, pwfields: [], idfield: null };
var readyForClick = false;
var mutationObserver;
var oldpwfield = null;
var lasttry = setTimeout( () => { // I want to be able to cancel without it firing
    if (logging) console.log("findpw initialize last try timer")
}, 1000000);
var observerOptions = {
    attributes: true,
    characterData: false,
    childList: true,
    subtree: true,
    attributeOldValue: false,
    characterDataOldValue: false
};
var start = Date.now();
if (logging) if (logging) console.log(document.URL, Date.now() - start, "findpw starting");
// Most pages work if I start looking for password fields as soon as the basic HTML is loaded
if (document.readyState !== "loading") {
    if (logging) if (logging) console.log(document.URL, Date.now() - start, "findpw running", document.readyState);
    startup();
} else {
    if (logging) console.log(document.URL, Date.now() - start, "findpw running document.onload");
    document.onload = startup;
}
// A few other pages don't find the password fields until all downloads have completed
window.onload = function () {
    if (logging) console.log(document.URL, Date.now() - start, "findpw running window.onload");
    startup();
}
// Other pages add additional CSS at runtime that makes a password field visible
// Modified from https://www.phpied.com/when-is-a-stylesheet-really-loaded/
var cssnum = document.styleSheets.length;
setInterval(() => {
    if (document.styleSheets.length > cssnum) {
        cssnum = document.styleSheets.length;
        if (logging) console.log(document.URL, Date.now() - start, "findpw css added", cssnum);
        startup();
    }
}, 2000);
// Some pages change CSS to make the password field visible after clicking the Sign In button
document.body.onclick = function () {
    if (logging) console.log("findpw click on body");
    setTimeout(() => {
        if (logging) console.log("findpw body.onclick");
        startup();
    }, 500);
};
// Some sites change the page contents based on the fragment
window.addEventListener("hashchange", (_href) => {
    if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid and sendpageinfo from hash change listener");
    cpi = countpwid();
    sendpageinfo(cpi, false, true);
});
// A few sites put their password fields in a shadow root to isolate it from the rest of the page.
// The only way to find one is to walk the DOM.  That's expensive, so I only do it once.  That
// means I'll miss a shadow root if it's added late.
// From Domi at https://stackoverflow.com/questions/38701803/how-to-get-element-in-user-agent-shadow-root-with-javascript
function searchShadowRoots(element) {
    //return []; // Turned off because too much overhead for sites that have frequent changes, e.g.,
    let shadows = Array.from(element.querySelectorAll('*'))
        .map(el => el.shadowRoot).filter(Boolean);
    let childResults = shadows.map(child => searchShadowRoots(child));
    let result = Array.from(element.querySelectorAll("input"));
    return result.concat(childResults).flat();
}
function startup() {
    // The code in this function used to be called once, but now it's called several times.
    // There is no reason to declare new mutation observers and listeners on evert call.
    if (!mutationObserver) {
        mutationObserver = new MutationObserver(handleMutations);
        mutationObserver.observe(document.body, observerOptions);
        chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
            if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid from listener");
            readyForClick = request.readyForClick;
            let mutations = mutationObserver.takeRecords();
            switch (request.cmd) {
                case "fillfields":
                    userid = request.u;
                    fillfield(cpi.idfield, userid);
                    setPlaceholder(userid);
                    break;
                case "count":
                    cpi = countpwid();
                    let pwdomain = document.location.hostname;
                    let count = cpi.pwfields.length;
                    if (logging) console.log(document.URL, Date.now() - start, "findpw got count request", count, pwdomain);
                    sendResponse({ "pwcount": count, "pwdomain": pwdomain });
                    break;
                case "clear":
                    cpi = countpwid();
                    if (cpi.idfield) cpi.idfield.value = "";
                    for (let i = 0; i < cpi.pwfields.length; i++) {
                        cpi.pwfields[i].value = "";
                    }
                    setPlaceholder("");
                    break;
                default:
                    if (logging) console.log(document.URL, Date.now() - start, "findpw unexpected message", request);
            }
            let myMutations = mutationObserver.takeRecords();
            if (logging) console.log("findpw listener fillfields my mutations", myMutations);
            handleMutations(mutations);
            return true;
        });
    }
    if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid and sendpageinfo from onload");
    cpi = countpwid();
    sendpageinfo(cpi, false, true);
}
function handleMutations(mutations) {
    if (!mutations[0]) return;
    clearTimeout(lasttry);
    // Find password field if added late
    if (logging) console.log(document.URL, Date.now() - start, "findpw DOM changed", cpi, mutations);
    // Fill in the userid and password fields half a second after the last mutation
    // in case the page cleared the values.
    lasttry = setTimeout(() => {
        let mutations = mutationObserver.takeRecords();
        if (logging) console.log("findpw last try");
        if (userid && cpi.idfield && cpi.idfield.value !== userid && !keyPressed) { // In case the mutations took away my changes
            fillfield(cpi.idfield, userid);
        }
        if (sitepw && cpi.pwfields[0] && cpi.pwfields[0].value !== sitepw) {
            fillfield(cpi.pwfields[0], sitepw);
        }
        keyPressed = false;
        setPlaceholder(userid);
        let myMutations = mutationObserver.takeRecords();
        if (logging) console.log("findpw lastry my mutations", myMutations);
        handleMutations(mutations);
    }, 500);
    if (oldpwfield && oldpwfield === cpi.pwfields[0]) return; // Stop looking once I've found a password field
    if (logging) console.log(document.URL, Date.now() - start, "findpw calling countpwid and sendpageinfo from mutation observer");
    cpi = countpwid();
    sendpageinfo(cpi, false, true);
    oldpwfield = cpi.pwfields[0];
    let myMutations = mutationObserver.takeRecords();
    if (logging) console.log("findpw handleMutations my mutations", myMutations);
}
function fillfield(field, text) {
    // Don't change if there is a value to avoid mutationObserver cycling
    if (field && text && field.value !== text) {
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
    // Is there a better test for telling if the page knows the value has been set?
    if (logging) console.log(document.URL, Date.now() - start, "findpw focus test", field.value, text);
}
// Sometimes the page doesn't know that the value is set until an event is triggered
function makeEvent(field, type) {
    let event = new Event(type, { bubbles: true, view: window, cancelable: true });
    field.dispatchEvent(event);
}
function sendpageinfo(cpi, clicked, onload) {
    // No need to send page info if no password fields found.  User will have to open
    // the popup, which will supply the needed data
    if (cpi.pwfields.length === 0) return;
    if (logging) console.log(document.URL, Date.now() - start, "findpw sending page info: pwcount = ", cpi.pwfields.length);
    chrome.runtime.sendMessage({
        "count": cpi.pwfields.length,
        "clicked": clicked,
        "onload": onload
    }, (response) => {
        if (response === "multiple") {
            alert("You have more than one entry in your bookmarks with a title SitePasswordData.  Remove or rename the ones you don't want SitePassword to use.  Then reload this page.");
            return;
        }
        if (chrome.runtime.lastError) if (logging) console.log(document.URL, Date.now() - start, "findpw error", chrome.runtime.lastError);
        if (logging) console.log(document.URL, Date.now() - start, "findpw response", response);
        readyForClick = response.readyForClick;
        userid = response.u;
        let mutations = mutationObserver.takeRecords();
        fillfield(cpi.idfield, userid);
        setPlaceholder(userid, response.p);
        if (userid) fillfield(cpi.pwfields[0], "");
        let myMutations = mutationObserver.takeRecords();
        if (logging) console.log("findpw sendpageinfo my mutations", myMutations);
        handleMutations(mutations);
    });
}
function setPlaceholder(userid) {
    if (logging) console.log(document.URL, Date.now() - start, "findpw setPlaceholder", userid, readyForClick, cpi.pwfields);
    if (userid) clearLabel(cpi.idfield);
    if (cpi.pwfields[0] && readyForClick && userid) {
        let placeholder = (cpi.pwfields.length === 1) ? clickHere : pasteHere;
        if (cpi.pwfields[0].placeholder !== placeholder) {
            if (logging) console.log(document.URL, Date.now() - start, "findpw setPlaceholder", placeholder);
            cpi.pwfields[0].placeholder = placeholder;
            cpi.pwfields[0].ariaPlaceholder = placeholder;
            cpi.pwfields[0].title = placeholder;
            if (placeholder === pasteHere) {
                cpi.pwfields[0].onclick = null;
            }
            clearLabel(cpi.pwfields[0]);
            for (let i = 1; i < cpi.pwfields.length; i++) {
                cpi.pwfields[i].placeholder = pasteHere;
                cpi.pwfields[i].ariaPlaceholder = pasteHere;
                cpi.pwfields[i].title = pasteHere;
                cpi.pwfields[i].onclick = null;
                clearLabel(cpi.pwfields[i]);
            }
        }
    } else if (cpi.pwfields[0]) {
        if (cpi.pwfields[0].placeholder !== clickSitePassword) {
            if (logging) console.log(document.URL, Date.now() - start, "findpw setPlaceholder", clickSitePassword);
            cpi.pwfields[0].placeholder = clickSitePassword;
            cpi.pwfields[0].ariaPlaceholder = clickSitePassword;
            cpi.pwfields[0].title = clickSitePassword;
            clearLabel(cpi.pwfields[0]);
        }
    }
}
function pwfieldOnclick() {
    if (logging) console.log(document.URL, Date.now() - start, "findpw get sitepass");
    if ((!this.placeholder) || this.placeholder === clickHere) {
        chrome.runtime.sendMessage({ "cmd": "getPassword" }, (response) => {
            sitepw = response;
            let mutations = mutationObserver.takeRecords();
            fillfield(this, response);
            let myMutations = mutationObserver.takeRecords();
            if (logging) console.log(document.URL, Date.now() - start, "findpw got password", this, response, myMutations);
            handleMutations(mutations);
        });
    } else {
        // Because people don't always pay attention
        if (!this.placeholder || this.placeholder === clickSitePassword) alert(clickSitePassword);
    }
}
function countpwid() {
    // You wouldn't normally go to sitepassword.info on a machine that has the extension installed.
    if (document.location.host === "sitepassword.info") return { "pwfields": [], "useridfield": null };
    var useridfield = null;
    var visible = true;
    var pwfields = [];
    var found = -1;
    var c = 0;
    let inputs = document.getElementsByTagName("input");
    if (cpi.pwfields.length === 0 && inputs.length === 0) inputs = searchShadowRoots(document.body);
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].type && (inputs[i].type.toLowerCase() == "password")) {
            visible = !isHidden(inputs[i]);
            if (logging) console.log(document.URL, Date.now() - start, "findpw found password field", i, inputs[i], visible);
            let pattern = inputs[i].getAttribute("pattern"); // Pattern [0-9]* is a PIN or SSN
            if (visible && pattern !== "[0-9]*") {
                pwfields.push(inputs[i]);
                c++;
                if (c === 1) {
                    found = i;
                    inputs[i].onkeydown = function(event) {
                        if (event.key) {
                            keyPressed = true;
                        }
                    }
                }
                inputs[i].onclick = pwfieldOnclick;
            }
        }
    }
    if (c > 0) {
        for (var i = found - 1; i >= 0; i--) {
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
function isHidden(field) {
    let hidden =
        (window.getComputedStyle(field).display === 'none') ||
        (field.offsetParent === null) ||
        (field.ariaHidden === "true");
    return hidden;
}
function overlaps(field, label) {
    // Only worry about labels above or to the left of the field
    let floc = field.getBoundingClientRect();
    let lloc = label.getBoundingClientRect();
    if (floc.top >= lloc.bottom) return false;
    if (floc.left >= lloc.right) return false;
    return true;
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