'use strict';
import {$, get} from "./domElements.js";
import { bgBaseDefault, config, databaseDefault, isUrlMatch, isReadyForClick, webpage } from "./bg.js";
import { resolvers, runTests } from "./test.js";
import { characters, isConsistent, generatePassword, isSuperPw, normalize, stringXorArray, xorStrings } from "./generate.js";
import { isSharedCredentials } from "./sharedCredentials.js"; 
import { commonSuffix } from "./public_suffix_list.js"; 
let testMode = false; // testMode must start as false.  Its value will come in a message from bg.js.
const debugMode = false; // Keeps the popup from closing when the mouse leaves the main panel.  Adds a 3 second delay before form fills in.

const logging = false;
const recordEvents = false;
if (logging) console.log("Version 3.4");

let messageQueue = Promise.resolve();
let autoclose = true;
let exporting = false;
let sameacct = true;
let activetab;
let domainname;
let mainPanelTimer;
let lastFocused = null;
// The following is needed to trigger the event when debugging or testing
document.addEventListener('focus', e => { 
    lastFocused = e.target;     
    return done(e);
}, true);
const strengthText = ["Too Weak", "Very weak", "Weak", "Good", "Strong"];
const strengthColor = ["#bbb", "#f06", "#f90", "#093", "#036"]; // 0,3,6,9,C,F
const defaultTitle = "SitePassword";

let warningMsg = false;
const bgDefault = clone(bgBaseDefault);
let bg = clone(bgDefault);
// Some actions prevent the settings being saved when mousing out of the main panel.
// However, some tests want to save the settings.  This function sets certain values
// to what they have when the popup is opened.
export async function restoreForTesting() {
    autoclose = true;
    exporting = false;
    warningMsg = false;
    warnings.forEach(msg => msg.ison = false);
    await chrome.storage.local.remove("alertString");
}
// I need all the metadata stored in database for both the phishing check
// and for downloading the site data.
let database = clone(databaseDefault);
if (logging) console.log("popup starting", database);
// window.onunload appears to only work for background pages, which
// no longer work.  Fortunately, using the password requires a click
// outside the popup window.  I can't use window.onblur because the 
// popup window closes before the message it sends gets delivered.
window.onload = async function (e) {
    // I need to set activetab before the await if I'm in debug mode.
    // Otherwise, activetab is undefined when the popup opens.
    try {
        let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        activetab = tabs[0];
    } catch (error) {
        console.error("Error querying active tab window onload:", error);
        return;
    }
    if (debugMode) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        debugger;
    }
    if (logging) console.log("popup check clipboard");
    let v = await chrome.storage.local.get("onClipboard");
    if (v.onClipboard) {
        if (logging) console.log("popup clipboard used");
        $.logopw.title = "A site password may be on the clipboard."
        $.logo.style.display = "none";
        $.logopw.style.display = "block";
        // Don't worry about waiting for these to complete
        await chrome.action.setTitle({title: "A site password may be on the clipboard."});
        await chrome.action.setIcon({"path": "images/icon128pw.png"});
    } else {
        if (logging) console.log("popup clipboard not used");
        $.logo.title = defaultTitle;
        $.logo.style.display = "block";
        $.logopw.style.display = "none";
        // Don't worry about waiting for these to complete
        await chrome.action.setTitle({title: defaultTitle});
        await chrome.action.setIcon({"path": "../images/icon128.png"});
        // Hide some instructions if the browser doesn't support the bookmarks API
    }
    let tohide = document.getElementsByName("hideifnobookmarks");
    for (let element of tohide) {
        if (!chrome.bookmarks) element.classList.add("nodisplay");
    }
    if (logging) console.log("popup tab", activetab);
    let protocol = activetab.url.split(":")[0];
    if ( protocol === "file") {
        domainname = activetab.url.split("///")[1];
    } else if (protocol === "mailto") {
        domainname = activetab.url.split(":")[1];
    } else {
        domainname = activetab.url.split("/")[2]
    }
    $.domainname.value = domainname;
    $.sitepw.value = "";
    if (logging) console.log("popup got tab", domainname, activetab);
    if (logging) console.log("popup getting metadata");
    instructionSetup();
    sectionrefSetup();
    await getsettings();
    return done(e);
}
async function init() {
    await fill();
    let protocol = activetab.url.split(":")[0];
    if (logging) console.log("popup testing for http", protocol);
    warning("http", protocol !== "https");
    if ($.superpw.value) {
        setMeter("superpw");
        setMeter("sitepw");
    }
    $.main.style.padding = "6px " + scrollbarWidth() + "px 9px 12px";
    updateExportButton();
}
export async function getsettings() {
    if (logging) console.log("popup getsettings", domainname);
    let response;
    try {
        response = await retrySendMessage({
            "cmd": "getMetadata",
            "domainname": domainname,
            "activetab": activetab
        });
        if (!response) throw new Error("No response received");
    } catch (error) {
        console.error("Error getting metadata:", error);
    }
    if (logging) console.log("popup getsettings response", response);
    let alertString = "";
    if (response.duplicate) {
        alertString += "You have duplicate bookmarks with the title '" + response.duplicate + "'.  Please delete one and try again.\n\n";
        if (response.duplicate === "CommonSettings") {
            alertString += "You can see what's in each of them by mousing over the entry by opening the Bookmarks Manager,";
            alertString += "clicking on the SitePasswordData folder, and mousing over the CommonSettings entry.";
        } else {
            alertString += "An easy way to see what's in the other duplicate bookmarks is to dbl-click on them.  "
            alertString += "They will open sitepassword.info with the settings for that bookmark.";
        }
    }
    if (response.multiple) {
        alertString += "You have multiple bookmark folders with the title '" + response.multiple + "'.  Please delete one and try again.\n\n";
        alertString += "You can look at which bookmarks are in the folders to decide which one you want to keep.";
     }
    if (alertString) {
        if (testMode) {
            await chrome.storage.local.set({ "alertString": alertString });
        } else {
            alert(alertString);
        }
        return;
    }
    bg = response.bg;
    database = response.database;
    hidesitepw();
    if (!bg.settings.sitename) {
        bg.settings.sitename = "";
    }
    $.domainname.value = bg.settings.pwdomainname || bg.settings.domainname || domainname;
    $.superpw.value = response.superpw || "";
    bg.superpw = response.superpw || "";
    await init();
    let readyForClick = isReadyForClick($.superpw.value, $.sitename.value, $.username.value);
    if (readyForClick) {
        let phishingDomain = await getPhishingDomain($.sitename.value);
        if (logging) console.log("popup mainpanel mouseleave", phishingDomain);
        if (phishingDomain) openPhishingWarning(phishingDomain);
    }
    if (logging) console.log("popup got metadata", bg, database);
    if (!testMode && response.test) { // Only run tests once
        testMode = true;
        // Give popup DevTools time to attach before runTests hits debugger statements.
        await new Promise(resolve => setTimeout(resolve, 750));
        await runTests();
    }
    try {
        if (logging) console.log("popup sending update", activetab.url, $.username.value || "", readyForClick); 
        // Do not send a password in this message since it goes to all frames
        await chrome.tabs.sendMessage( activetab.id, { "cmd": "update", "u": $.username.value || "", "p": "", "readyForClick": readyForClick });
    } catch (err) {
        if (logging) console.warn("popup: could not send update message to tab", activetab.url, err);
    }
}
// This function sends a message to the service worker when the mouse leaves the 
// outermost div on the window.  When the user clicks outside the popup, the window
// loses focus and closes.  Any messages in flight will be lost.  That means there
// is a race between message delivery and the next user click.  Fortunately, messages
// are delivered in just a couple of ms, so there's no problem.  Just be aware that
// this race is the source of any problems related to loss of the message sent here.
($.root).onmouseleave = function (e) {
    // If I close the window immediately, then messages in flight get lost
    if (autoclose && !exporting && !testMode && !document.elementFromPoint(e.pageX, e.pageY)) {
        if (!debugMode) $.root.style.opacity = 0.1;
        mainPanelTimer = setTimeout(() => {
            if (!debugMode && !testMode) window.close();
        }, 750);
    }
    return done(e);
}
$.root.onmouseenter = function (e) {
    $.root.style.opacity = 1; 
    defaultfocus();
    clearTimeout(mainPanelTimer);
    return done(e);
}
$.mainpanel.onmouseenter = function (e) {
    // Let the user type if the mouse reenters the popup
    if (logging) console.log("popup mainpanel mouseenter", e);
    $.superpw.disabled = false;
    $.sitename.disabled = false;
    $.username.disabled = false;
    $.superpw.tabIndex = 0;
    $.sitename.tabIndex = 0;
    $.username.tabIndex = 0;
    return done(e);
}
$.mainpanel.onmouseleave = async function (e) {
    if (logging) console.log("popup mainpanel mouseleave", e);
    // Force a blur event on the currently focused element.  There is an inherent race condition
    // between the mouseleave event and the blur event in that the blur processing might not
    // complete before the popup closes.  This is not a problem in practice because of the delay 
    // in closing the popup. Explicitly blur the last focused element rather than relying on focus movement,
    // which doesn't work in DevTools or during tests.
    if (lastFocused && lastFocused !== $.mainpanel && $.mainpanel.contains(lastFocused)) {
        lastFocused.dispatchEvent(new Event("blur"));
        lastFocused = null;
    }
    let element = e ? (e.pageX ? document.elementFromPoint(e.pageX || 0, e.pageY || 0) : null) : null;
    // In case the user tries to type when the mouse is outside the popup
    if (!element) {
        $.superpw.disabled = true;
        $.sitename.disabled = true;
        $.username.disabled = true;
        $.superpw.tabIndex = -1;
        $.sitename.tabIndex = -1;
        $.username.tabIndex = -1;
    }
    if (warningMsg) {   
        autoclose = false;
    } 
    let phishingDomain = await getPhishingDomain($.sitename.value);
    if (logging) console.log("popup mainpanel mouseleave", phishingDomain);
    if (phishingDomain) openPhishingWarning(phishingDomain);
    if (logging) console.log("popup onmouseleave", phishingDomain, exporting, element);
    // Don't persist if: phishing sites, exporting, the mouse is in the panel, or if event triggered by closing a help or instruction panel
    if (phishingDomain || exporting || element) {
        if (logging) console.log("popup phishing mouseleave resolve  mainpanelmouseleaveResolver", phishingDomain, resolvers);
        return done(e);
    }
    if (logging) console.log("popup mainpanel mouseleave update bg", document.activeElement.id, bg);
    // window.onblur fires before I even have a chance to see the window, much less focus it
    if (bg && bg.settings) {
        bg.superpw = $.superpw.value || "";
        bg.settings.domainname = $.domainname.value || ""; // Keep for compatibility with V3.0.12
        bg.domainname = $.domainname.value || "";
        bg.settings.sitename = $.sitename.value || "";
        bg.settings.username = $.username.value || "";
        if (bg.settings.sitename) {
            database.sites[normalize(bg.settings.sitename)] = clone(bg.settings);
            database.domains[normalize(bg.domainname)] = normalize(bg.settings.sitename);
        }
        let sitename = $.sitename.value;
        changePlaceholder();
        if (logging) console.log("popup sending siteData", bg.settings, database);
        try {
            await ask2generate(e); // So that the site password gets generated and any changes to settings get applied before the data is sent to bg.js  
            let response = await retrySendMessage({
                "cmd": "siteData",
                "sitename": sitename,
                "clearsuperpw": get("clearsuperpw").checked,
                "hidesitepw": get("hidesitepw").checked,
                "safeSuffixes": database.common.safeSuffixes || {},
                "superpwhash": database.common.superpwHash || "",
                "sameacct": sameacct,
                "bg": bg,
            });
            if (logging) console.log("popup siteData resolve  mainpanelmouseleaveResolver", response, resolvers);
            return done(e);
        } catch (error) {
            console.error("Error sending siteData message:", error);
        }
    } else {
        if (logging) console.log("popup no bg.settings mouseleave resolve", resolvers);
        return done(e);
    }
}
$.title.onclick = function (e) {
    window.open("https://sitepassword.info", "_blank", "noopener,noreferrer");
    return done(e);
}
// Domain Name
// There are no actions the user can take on the domain name field,
// but I need this handler for testing.
$.domainname.onblur = async function (e) {
    $.sitename.value = "";
    if (testMode) domainname = $.domainname.value;
    await getsettings(domainname);
    await fill();
    return done(e);
}
$.domainnamemenu.onmouseleave = function (e) {
    menuOff("domainname", e);
    return done(e);
}
$.domainname3bluedots.onmouseover = function (e) {
    let domainname = $.domainname.value;
    if (domainname) {
        $.domainnamemenuforget.style.opacity = "1";
    } else {
        $.domainnamemenuforget.style.opacity = "0.5";
    }
    menuOn("domainname", e);
    return done(e);
}
$.domainname3bluedots.onclick = $.domainname3bluedots.onmouseover;
$.domainname3bluedots.onmouseout = function (e) {
    const relatedTarget = e.relatedTarget || e.toElement;
    if (!relatedTarget || !$.domainnamemenu.contains(relatedTarget)) {
        menuOff("domainname", e);
    }
    return done(e);
};
$.domainnamemenuforget.onclick = function (e) {
    if (!$.domainname.value) return;
    msgon("forget");
    let toforget = normalize($.domainname.value);
    addForgetItem(toforget);
    return done(e);
}
$.domainnamemenuhelp.onclick = function (e) {
    helpItemOn("domainname");
    return done(e);
}
$.domainnamehelptextclose.onclick = function (e) {
    helpAllOff();
    return done(e);
}
$.domainnamehelptextmore.onclick = function (e) {
    helpAllOff();
    sectionClick("domainname");
    return done(e);
}
// Super Password
$.superpw.onkeyup = async function (e) {
    // Start the reminder clock ticking
    await chrome.storage.local.set({"reminder": Date.now()});
    bg.superpw = $.superpw.value || "";
    setMeter("superpw");
    setMeter("sitepw");
    await handlekeyup(e, "superpw");
    return done(e);
}
$.superpw.onblur = async function (e) {
    if (!$.superpw.value) return done(e);
    if (logging) console.log("popup superpw onblur");
    // See if this is a different super password
    let same = await sameSuperpw($.superpw.value);
    if (!same) {
        // Handle the case where the super password has changed
        msgon("superpwtypo");
        return done(e);
    }
    await handleblur(e, "superpw");
    return done(e);
}
$.superpw.onmouseleave = async function (e) {
    await $.superpw.onblur(e);
    return done(e);
};
$.superpwtypocancelbutton.onclick = function (e) {
    msgoff("superpwtypo");
    $.superpw.focus();
    return done(e);
}
$.superpwtypochangebutton.onclick = function (e) {
    msgoff("superpwtypo");
    
    return done(e);
}
// Change super password options
$.changesuperpwoptionkeepbutton.onclick = function (e) {
    $.changesuperpwoptions.classList.add("nodisplay");
    $.changesuperpwkeepnewinput.value = $.superpw.value;
    $.changesuperpwkeep.classList.remove("nodisplay");
    return done(e);
}
$.changesuperpwoptionlosebutton.onblur = async function (e) {
    $.changesuperpwoptions.classList.add("nodisplay");
    $.changesuperpwloseinput.value = $.superpw.value;
    $.changesuperpwlose.classList.remove("nodisplay");
    return done(e);
}
$.changesuperpwoptioncancelbutton.onclick = async function (e) {
    msgoff("changesuperpw");
    $.superpw.focus();
    return done(e);
}
// Change super password = keep all account passwords
$.changesuperpwkeepoldinput.onblur = async function(e) {
    let same = await sameSuperpw($.superpw.value);
    if (!same) {
        $.changesuperpwkeepoldtypo.classList.remove("nodisplay");
        return done(e);
    }
    return done(e);
}
$.changesuperpwkeepoldinput.onmouseleave = async function(e) {
    await $.changesuperpwkeepoldinput.onblur(e);
    return done(e);
}
$.changesuperpwkeepoldinput.onkeyup = async function(e) {
    $.changesuperpwkeepoldtypo.classList.add("nodisplay");
    return done(e);
}
$.changesuperpwkeepnewinput.onblur = async function (e) {
    $.changesuperpwkeepnewtypo.classList.remove("nodisplay"); // Show the typo warning 
    return done(e);
}
$.changesuperpwkeepnewinput.onmouseleave = async function(e) {
    await $.changesuperpwkeepnewinput.onblur(e);
    return done(e);
}
$.changesuperpwkeepnewinput.onkeyup = function (e) {
    $.changesuperpwkeepnewtypo.classList.add("nodisplay"); // Don't show the typo warning when typing a new value
    return done(e);
}
$.changesuperpwkeepbutton.onclick = async function (e) {
    msgoff("changesuperpw");
    if (await sameSuperpw($.changesuperpwkeepnewinput.value)) {
        $.changesuperpwkeepnewtypo.classList.remove("nodisplay");
        return done(e);
        return;
    }
    const eventForAsk = { currentTarget: e?.currentTarget };
    // Update all site passwords to be provided
    let oldSuperpw = $.changesuperpwkeepoldinput.value || "";
    let newSuperpw = $.changesuperpwkeepnewinput.value || "";
    if (!newSuperpw) {
        return done(e);
    }   
    $.superpw.value = newSuperpw;
    let db = clone(database);
    for (const [key, settings] of Object.entries(db.sites)) {
        domainname = settings.domainname;
        bg.settings = settings;
        bg.superpw = oldSuperpw; // Old superpw
        let oldpw = await generatePassword(bg);
        oldpw = stringXorArray(oldpw, bg.settings.xor);
        bg.superpw = newSuperpw; // New superpw
        let newpw = await generatePassword(bg);
        bg.settings.xor = xorStrings(oldpw, newpw);
        bg.settings.providesitepw = true;
        db.sites[key] = bg.settings;
    }
    database = db;
    await retrySendMessage({"cmd": "updatedb", "database": db, "superpw": newSuperpw});
    return done(e);
}
// Change super password - change all account passwords
$.changesuperpwloseinput.onkeyup = function (e) {
    $.changesuperpwlosechangebutton.disabled = false;
    return done(e);
}
$.changesuperpwloseinput.onblur = async function (e) {
    let isSame = await sameSuperpw($.changesuperpwloseinput.value);
    if (!isSame) $.changesuperpwlosetypo.classList.remove("nodisplay");
    return done(e);
}
$.changesuperpwloseinput.onmouseleave = async function (e) {
    await $.changesuperpwloseinput.onblur(e);
    return done(e);
}
$.changesuperpwloseinput.onkeyup = async function (e) {
    await $.changesuperpwloseinput.onblur(e);
    return done(e);
}
$.changesuperpwlosechangebutton.onclick = async function (e) {
    msgoff("changesuperpw");
    let newSuperpw = $.changesuperpwloseinput.value || "";
    const eventForAsk = { currentTarget: e?.currentTarget };
    if (!newSuperpw) {
        return done(e);
    }   
   let same = await sameSuperpw(newSuperpw);
    if (same) {
        $.changesuperpwlosetypo.classList.remove("nodisplay");
        return done(e);
    }
    $.superpw.value = newSuperpw;
    let db = clone(database);
    for (const [key, settings] of Object.entries(db.sites)) {
        domainname = settings.domainname;
        bg.settings = settings;
        bg.superpw = newSuperpw; // New superpw
        let newpw = await generatePassword(bg);
        bg.settings.xor = xorStrings(oldpw, newpw);
        bg.settings.providesitepw = true;
        db.sites[key] = bg.settings;
    }
    database = db;
    await retrySendMessage({"cmd": "updatedb", "database": db, "superpw": newSuperpw});
    return done(e);
}
$.changesuperpwlosecancelbutton.onclick = function (e) {
    msgoff("changesuperpw");
    return done(e);
}
$.superpwmenu.onmouseleave = function (e) {
    menuOff("superpw", e);
    return done(e);
}
$.superpw3bluedots.onmouseover = function (e) {
    if ($.superpw.value) {
        $.superpwmenushow.style.opacity = "1";
        $.superpwmenuhide.style.opacity = "1";
    } else {
        $.superpwmenushow.style.opacity = "0.5";
        $.superpwmenuhide.style.opacity = "0.5";
    }
    menuOn("superpw", e);      
    return done(e);
}
$.superpw3bluedots.onclick = $.superpw3bluedots.onmouseover;
$.superpw3bluedots.onmouseout = function (e) {
    const relatedTarget = e.relatedTarget || e.toElement;
    if (!relatedTarget || !$.superpwmenu.contains(relatedTarget)) {
        menuOff("superpw", e);
    }
    return done(e);
};
$.superpwmenuaccount.onclick = function (e) {
    // Trigger the super password change options
    msgon("changesuperpw");
    $.changesuperpwloseinput.value = $.superpw.value;
    if ($.superpw.value) $.changesuperpwlosechangebutton.disabled = false;
    return done(e);
}
$.superpwmenushow.onclick = function(e) {
    if (!$.superpw.value) return;
    $.superpw.type = "text";
    $.superpwmenuhide.classList.toggle("nodisplay");
    $.superpwmenushow.classList.toggle("nodisplay")    ;
    return done(e);
}
$.superpwmenuhide.onclick = function(e) {
    if (!$.superpw.value) return;
    $.superpw.type = "password";
    $.superpwmenuhide.classList.toggle("nodisplay");
    $.superpwmenushow.classList.toggle("nodisplay")    ;
    return done(e);
}
$.superpwmenuhelp.onclick = function (e) {
    helpItemOn("superpw");
    return done(e);
}
$.superpwhelptextclose.onclick = function (e) {
    helpAllOff();
    return done(e);
}
$.superpwhelptextmore.onclick = function (e) {
    helpAllOff();
    sectionClick("superpw");
    return done(e);
}
// Site Name
$.sitename.onfocus = function (e) {
    let set = new Set();
    let value = normalize($.sitename.value);
    Object.keys(database.sites).forEach((sitename) => {
        let site = database.sites[sitename].sitename;
        if (!value || normalize(site).startsWith(value)) set.add(site);
    })
    let list = sortList([... set]);
    if (logging) console.log("popup sitename onfocus", database.sites, list);
    setupdatalist(this, list);
    return done(e);
}
$.sitename.onkeyup = async function (e) {
    await handlekeyup(e, "sitename");
    clearDatalist("sitenames");
    $.sitename.onfocus(); // So it runs in the same turn
    return done(e);
}
$.sitename.onblur = async function (e) {
    let sitename = $.sitename.value;
    let d = await getPhishingDomain(sitename);
    if (!openPhishingWarning(d)) {
        msgoff("phishing");
        $.superpw.disabled = false;
        $.username.disabled = false;
        let isChanged = normalize(sitename) !== normalize(bg.settings.sitename);
        if (isChanged && $.providesitepw.checked) {
            msgon("changesitename");
            return done(e);
       } else {
            msgoff("changesitename");
        }
    }
    bg.settings.sitename = $.sitename.value;
    $.sitepw.value = await ask2generate(e);
    changePlaceholder();
    clearDatalist("sitenames");
    return done(e);
}
$.changesitenameokbutton.onclick = async function (e) {
    msgoff("changesitename");
    return done(e);
}
$.sitename3bluedots.onmouseover = function (e) {
    if ($.sitename.value) {
        $.sitenamemenuforget.style.opacity = "1";
        $.sitenamemenuaccount.style.opacity = "1";
    } else {
        $.sitenamemenuforget.style.opacity = "0.5";
        $.sitenamemenuaccount.style.opacity = "0.5";
    }
    menuOn("sitename", e);
    return done(e);
}
$.sitename3bluedots.onclick = $.sitename3bluedots.onmouseover;
$.sitename3bluedots.onmouseout = function (e) {
    const relatedTarget = e.relatedTarget || e.toElement;
    if (!relatedTarget || !$.sitenamemenu.contains(relatedTarget)) {
        menuOff("sitename", e);
    }
    return done(e);
};
$.sitenamemenu.onmouseleave = function (e) {
    menuOff("sitename", e);
    return done(e);
}
$.accountnicknameinput.onkeyup = function (e) {
    if ($.accountnicknameinput.value && $.accountnicknameinput.value !== $.sitename.value) {
        $.accountnicknamesavebutton.disabled = false;
    } else {
        $.accountnicknamesavebutton.disabled = true;
    }
    return done(e);
}
$.accountnicknamesavebutton.onclick = function (e) {
    if (!$.accountnicknameinput.value) return;
    $.sitename.value = $.accountnicknameinput.value;
    sameacct = true;
    $.sitename.onblur(e); // So it runs in the same turn
    msgoff("account");
    autoclose = true;
    return done(e);
}
$.accountnicknamecancelbutton.onclick = function (e) {
    msgoff("account");
    autoclose = false;
    return done(e);
}
$.accountnicknamenewbutton.onclick = function (e) {
    $.sitename.value = $.accountnicknameinput.value;
    $.sitename.onblur(e); // So it runs in the same turn
    msgoff("account");
    autoclose = true;
    sameacct = false;
    return done(e);
}
$.sitenamemenuforget.onclick = function (e) {
    if (!$.sitename.value) return;
    addForgetItem(normalize($.domainname.value));
    msgon("forget");
    let toforget = normalize($.sitename.value);
    for (let domain in database.domains) {
        let domainnameNorm = normalize(domain);
        if (database.domains[domainnameNorm] === toforget) {
            addForgetItem(domain);
        }
    }
    return done(e);
}
$.sitenamemenuaccount.onclick = function (e) {
    $.sitepwmenuaccount.onclick(); // So it runs in the same turn
    return done(e);
}
$.sitenamemenuhelp.onclick = function (e) {
    helpItemOn("sitename");
    return done(e);
}
$.sitenamehelptextclose.onclick = function (e) {
    helpAllOff();
    return done(e);
}
$.sitenamehelptextmore.onclick = function (e) {
    helpAllOff();
    sectionClick("sitename");
    return done(e);
}
// Site Username
$.username.onfocus = function (e) {
    let set = new Set();
    let value = normalize($.username.value);
    Object.keys(database.sites).forEach((sitename) => {
        let username = database.sites[normalize(sitename)].username;
        if (!value || normalize(username).startsWith(value)) set.add(username.trim());
    })
    let list = sortList([... set]);
    setupdatalist(this, list);
    return done(e);
}
$.username.onkeyup = async function (e) {
    await handlekeyup(e, "username");
    clearDatalist("usernames");
    $.username.onfocus();
    return done(e);
}
$.username.onblur = async function (e) {
    let username = $.username.value;
    let isChanged = (normalize(username)) !== normalize(bg.settings.username || "");
    if (isChanged && $.providesitepw.checked) {
        msgon("changeusername");
        return done(e);
    } else {
        msgoff("changeusername");
    }
    bg.settings.username = $.username.value;
    $.sitepw.value = await ask2generate(e);
    changePlaceholder();
    clearDatalist("usernames");
    return done(e);
}
$.changeusernameokbutton.onclick = async function (e) {
    msgoff("changeusername");
    bg.settings.username = $.username.value;
    return done(e);
}
$.usernamemenu.onmouseleave = function (e) {
    menuOff("changeusername", e);
    $.username.value = bg.settings.username || "";
    $.username.focus();
    return done(e);
}
$.username3bluedots.onmouseover = function (e) {
    let username = $.username.value;
    if (username) {
        $.usernamemenuforget.style.opacity = "1";
        $.usernamemenucopy.style.opacity = "1";
    } else {
        $.usernamemenuforget.style.opacity = "0.5";
        $.usernamemenucopy.style.opacity = "0.5";
    }
    menuOn("username", e);
    return done(e);
}
$.username3bluedots.onclick = $.username3bluedots.onmouseover;
$.username3bluedots.onmouseout = function (e) {
    const relatedTarget = e.relatedTarget || e.toElement;
    if (!relatedTarget || !$.usernamemenu.contains(relatedTarget)) {
        menuOff("username", e);
    }
    return done(e);
};
$.usernamemenuforget.onclick = function (e) {
    if (!$.username.value) return;
    addForgetItem(normalize($.domainname.value));
    msgon("forget");
    let toforget = normalize($.username.value);
    for (let domain in database.domains) {
        let sitename = database.domains[normalize(domain)];
        if (normalize(database.sites[normalize(sitename)].username) === toforget) {
            addForgetItem(domain);
        }
    }
    return done(e);
}
$.usernamemenucopy.onclick = async function(e) {
    let username = $.username.value;
    if (!username) return;
    $.clearclipboard.click();
    navigator.clipboard.writeText(username).then(() => {
        if (logging) console.log("popup wrote to clipboard", username);
        copied("username");
    }).catch((e) => {
        notcopied("username");
        if (logging) console.log("popup username clipboard write failed", e);
    });
    menuOff("username", e); 
    return done(e);
}
$.usernamemenuhelp.onclick = function (e) {
    helpItemOn("username");
    return done(e);
}
$.usernamehelptextclose.onclick = function (e) {
    helpAllOff();
    return done(e);
}
$.usernamehelptextmore.onclick = function (e) {
    helpAllOff();
    sectionClick("username");
    return done(e);
}
// Site Password
$.sitepw.onblur = async function (e) {
    menuOff("sitepw", e);
    if ($.sitepw.readOnly || !$.sitepw.value) {
        return done(e);
    }
    bg.settings.pwlength = $.sitepw.value.length;
    bg.settings.providesitepw = true;
    let provided = await ask2generate(e); // So bg.settings.xor gets set
    if (logging) console.log("popup sitepw onblur", bg.settings.pwlength, provided);
    return done(e);
}
$.sitepw.onkeyup = function (e) {
    setMeter("sitepw");
    return done(e);
}
$.sitepwmenu.onmouseleave = function (e) {
    menuOff("sitepw", e);
    return done(e);
}
$.sitepw3bluedots.onmouseover = function (e) {
    let sitepw = $.sitepw.value;
    if (sitepw && $.sitename.value) {
        $.sitepwmenucopy.style.opacity = "1";
        $.sitepwmenushow.style.opacity = "1";
        $.sitepwmenuhide.style.opacity = "1";
        $.sitepwmenuaccount.style.opacity = "1";
    } else {
        $.sitepwmenucopy.style.opacity = "0.5";
        $.sitepwmenushow.style.opacity = "0.5";
        $.sitepwmenuhide.style.opacity = "0.5";
        $.sitepwmenuaccount.style.opacity = "0.5";
    }
    menuOn("sitepw", e);
    return done(e);
}
$.sitepw3bluedots.onclick = $.sitepw3bluedots.onmouseover;
$.sitepw3bluedots.onmouseout = function (e) {
    const relatedTarget = e.relatedTarget || e.toElement;
    if (!relatedTarget || !$.sitepwmenu.contains(relatedTarget)) {
        menuOff("sitepw", e);
    }
    return done(e);
};
$.sitepwmenuaccount.onclick = function (e) {
    // Can only change a password if there is one
    if (!$.sitepw.value || !$.sitename.value) return done(e);
    let sitename = $.sitename.value;
    let sitenameCount = Object.values(database.domains).filter(domainSitename => normalize(domainSitename) === normalize(sitename)).length;
    // Can only change a password if the site is in the database
    if (sitenameCount === 0) return;
    let elements = document.getElementsByName("hassuffix");
    elements.forEach(element => {
        if (sitenameCount > 1) {
            $.accounttext1.innerText = $.domainname.value;
            element.classList.remove("nodisplay");
        } else {
            $.accounttext1.innerText = "";
            element.classList.add("nodisplay");
        }
    });
    if (logging) console.log(`The sitename "$.{sitename}" appears $.{sitenameCount} times in the database.`);
    msgon("account");
    $.accountnicknameinput.value = $.sitename.value;
    return done(e);
}
$.sitepwmenucopy.onclick = async function(e) {
    let sitepw = $.sitepw.value;
    if (!sitepw) return;
    navigator.clipboard.writeText(sitepw).then(async () => {
        if (logging) console.log("popup wrote to clipboard", sitepw);
        $.logopw.title = "A site password may be on the clipboard."
        $.logo.style.display = "none";
        $.logopw.style.display = "block";
        await chrome.action.setTitle({title: "A site password may be on the clipboard."});
        await chrome.action.setIcon({"path": "images/icon128pw.png"});
        await chrome.storage.local.set({"onClipboard": true})
        copied("sitepw");
    }).catch((e) => {
        notcopied("sitepw");
        if (logging) console.log("popup sitepw clipboard write failed", e);
    });
    menuOff("sitepw", e);
    return done(e);
}
$.sitepwmenuhelp.onclick = function (e) {
    helpItemOn("sitepw");
    return done(e);
}
$.sitepwhelptextclose.onclick = function (e) {
    helpAllOff();
    return done(e);
}
$.sitepwhelptextmore.onclick = function (e) {
    helpAllOff();
    sectionClick("sitepw");
    return done(e);
}
$.sitepwmenushow.onclick = function (e) {
    $.sitepw.type = "text";
    $.sitepwmenushow.classList.toggle("nodisplay");
    $.sitepwmenuhide.classList.toggle("nodisplay");
    return done(e);
}
$.sitepwmenuhide.onclick = function (e) {
    $.sitepw.type = "password";
    $.sitepwmenushow.classList.toggle("nodisplay");
    $.sitepwmenuhide.classList.toggle("nodisplay");
    return done(e);
}
$.settingsshow.onclick = async function(e) {
    await showsettings();
    return done(e);
}
$.clearclipboard.onclick = async function(e) {
    if (logging) console.log("popup clear clipboard");
    try {
        await navigator.clipboard.writeText("");
        $.logo.title = defaultTitle;
        $.logo.style.display = "block";
        $.logopw.style.display = "none";
        // Don't worry about waiting for these to complete
        await chrome.action.setTitle({title: defaultTitle});
        await chrome.storage.local.set({"onClipboard": false});
        await chrome.action.setIcon({"path": "../images/icon128.png"});
    } catch(e) {
        if (logging) console.log("popup clear clipboard failed", e);
    }
    return done(e);
}
document.oncopy = function (e) {
    if (e.target.id !== "sitepw") {
        $.clearclipboard.click();
    } else {
        $.sitepwmenucopy.click();
    }
    return done(e);
}
$.settingssave.onclick = function closesettings(e) {
    hidesettings(e);
    return done(e);
};
$.providesitepw.onclick = async function (e) {
    bg.settings.providesitepw = $.providesitepw.checked;
    if (!($.sitename.value && $.username.value)) return;
    if ($.providesitepw.checked) {
        $.defaultsettings.classList.add("fade-out");
        $.sitepw.readOnly = false;
        $.sitepw.value = "";
        $.sitepw.focus();
        $.sitepw.style.backgroundColor = "white";
        $.sitepwmenushow.classList.remove("menu-icon-blue");
        $.sitepwmenuhide.classList.remove("menu-icon-blue");
        $.sitepwmenucopy.classList.remove("menu-icon-blue");
        $.sitepwmenuhelp.classList.remove("menu-icon-blue");
        $.sitepw.placeholder = "Enter your site password";
        await Promise.resolve(); // To match the await of the other branch
    } else {
        bg.settings.xor = xorStrings($.sitepw.value, $.sitepw.value); // Reset to 0s
        $.sitepw.value = await ask2generate(e);
        $.defaultsettings.classList.remove("fade-out");
        $.sitepw.readOnly = true;
        $.sitepw.style.backgroundColor = "rgb(136, 204, 255, 20%)";
        $.sitepwmenushow.classList.add("menu-icon-blue");
        $.sitepwmenuhide.classList.add("menu-icon-blue");
        $.sitepwmenucopy.classList.add("menu-icon-blue");
        $.sitepwmenuhelp.classList.add("menu-icon-blue");
        $.sitepw.placeholder = "Your site password";
    }
    return done(e);
}
$.clearsuperpw.onclick = function (e) {
    database.clearsuperpw = $.clearsuperpw.checked;
    return done(e);
}
$.hidesitepw.onclick = function (e) {
    database.hidesitepw = $.hidesitepw.checked;
    hidesitepw();
    return done(e);
}
$.pwlength.onmouseout = async function (e) {
    await handleblur(e, "pwlength");
    return done(e);
}
$.pwlength.onblur = async function (e) {
    bg.settings.pwlength = Number($.pwlength.value);
    await handleblur(e, "pwlength");
    return done(e);
}
$.pwlength.onkeyup = async function(e) { 
    await handlekeyupnopw(e, "pwlength");
    return done(e);
}; 
$.startwithletter.onclick = async function (e) {
    await handleblur(e, "startwithletter");
    return done(e);
}
 $.allowlowercheckbox.onclick = async function (e) {
    restrictStartsWithLetter();
    $.minlower.disabled = false;
    await handleclick(e, "lower");
    return done(e);
}
 $.allowuppercheckbox.onclick = async function (e) {
    restrictStartsWithLetter();
    await handleclick(e, "upper");
    return done(e);
}
 $.allownumbercheckbox.onclick = async function (e) {
    await handleclick(e, "number");
    return done(e);
}
$.allowspecialcheckbox.onclick = async function (e) {
    await handleclick(e, "special");
    return done(e);
}
 $.minlower.onmouseout = async function (e) {
    await handleblur(e, "minlower");
    return done(e);
}
 $.minlower.onblur = async function (e) {
    await handleblur(e, "minlower");
    return done(e);
}
 $.minlower.onkeyup = async function(e) { 
    await handlekeyupnopw(e, "minlower");
    return done(e);
}
 $.minupper.onmouseout = async function (e) {
    await handleblur(e, "minupper");
    return done(e);
}
$.minupper.onblur = async function (e) {
    await handleblur(e, "minupper");
    return done(e);
}
 $.minupper.onkeyup = async function(e) { 
    await handlekeyupnopw(e, "minupper");
    return done(e);
};
 $.minnumber.onmouseout = async function (e) {
    await handleblur(e, "minnumber");
    return done(e);
}
 $.minnumber.onblur = async function (e) {
    await handleblur(e, "minnumber");
    return done(e);
}
 $.minnumber.onkeyup = async function(e) { 
    await handlekeyupnopw(e, "minnumber");
    return done(e);
} 
 $.minspecial.onmouseout = async function (e) {
    await handleblur(e, "minspecial");
    return done(e);
}
 $.minspecial.onblur = async function (e) {
    await handleblur(e, "minspecial");
    return done(e);
}
 $.minspecial.onkeyup = async function(e) { 
    await handlekeyupnopw(e, "minspecial");
    return done(e);
}
// In an older version I needed to limit the number of 
// specials because generate() computed a number between 
// 0 and 63 to index into the characters array.  That's 
// no longer the case, but I don't want to risk
// generating different passwords.
const alphanumerics = /[0-9A-Za-z]/g;
$.specials.onblur = async function(e) {
    $.specials.value = $.specials.value
        .replace(alphanumerics, '')  // eliminate alphanumerics and spaces
        .replace(/\s+/g, "") // eliminate spaces
        .replace(/[^ -~]/g, "") // eliminate non-printable characters
        .substring(0, 12);  // limit to 12 specials
    $.specials.value = [...new Set($.specials.value.split(""))].join(""); // eliminate duplicates
    if (!$.specials.value) {
        alert("You must enter at least one special character.");
        $.specials.value = database.common.defaultSettings.specials;
        return;
    }
    bg.settings.specials = $.specials.value;
    await handlekeyup(e, "specials");
    return done(e);
}
$.specials.onmouseleave = async function(e) {
    await $.specials.onblur(e); // So it runs in the same turn
    return done(e);
}
$.specials.onkeyup = async function(e) { 
    await handlekeyupnopw(e, "specials");
    return done(e);
} 
$.makedefaultbutton.onclick = async function (e) {
    let newDefaults = {
        sitename: "",
        username: "",
        providesitepw: false,
        xor: new Array(12).fill(0),
        domainname: "",
        pwdomainname: "",
        pwlength: Number($.pwlength.value),
        providesitepw: $.providesitepw.checked,
        startwithletter: $.startwithletter.checked,
        allowlower: $.allowlowercheckbox.checked,
        allowupper: $.allowuppercheckbox.checked,
        allownumber: $.allownumbercheckbox.checked,
        allowspecial: $.allowspecialcheckbox.checked,
        minlower: Number($.minlower.value),
        minupper: Number($.minupper.value),
        minnumber: Number($.minnumber.value),
        minspecial: Number($.minspecial.value),
        specials: $.specials.value,
    }
    try {
        await retrySendMessage({"cmd": "newDefaults", "newDefaults": newDefaults});
    } catch (error) {
        console.error("Error sending newDefaults message:", error);
    }
    if (logging) console.log("popup newDefaults sent", newDefaults);
    return done(e);
}
$.sitedatagetbutton.onclick = sitedataHTML;
$.exportbutton.onclick = exportPasswords;
$.maininfo.onclick = function (e) {
    if ($.instructionpanel.style.display == "none") {
        showInstructions();
        hidesettings();
        helpAllOff();
    } else {
        hideInstructions();
    }
    autoclose = false;
    return done(e);
}
// Phishing buttons
$.cancelwarning.onclick = async function (e) {
    msgoff("phishing");
    $.domainname.value = "";
    $.sitename.value = "";
    $.username.value = "";
    sameacct = false;
    await chrome.tabs.update(activetab.id, {url: "chrome://newtab"});
    return done(e);
}
$.sameacctbutton.onclick = async function (e) {
    $.superpw.disabled = false;
    $.username.disabled = false;
    $.sitename.disabled = false;
    msgoff("phishing");
    let domainname = $.domainname.value;
    let sitenameNorm = normalize($.sitename.value);
    if (testMode) {
        bg.settings.domainname = domainname; // Keep for compatibility with V3.0.12
        bg.domainname = domainname;
        database.sites[sitenameNorm].domainname = domainname;
    }
    let d = await getPhishingDomain(bg.settings.sitename);
    let suffix = commonSuffix(d, domainname);
    if (suffix && !database.common.safeSuffixes[suffix]) {
            database.common.safeSuffixes[suffix] = sitenameNorm;
    }
    bg.settings = clone(database.sites[sitenameNorm]);
    bg.settings.sitename = $.sitename.value;
    if (testMode) bg.domainname = $.domainname.value;
    database.domains[normalize($.domainname.value)] = normalize(bg.settings.sitename);
    $.username.value = bg.settings.username;
    $.sitepw.value = await ask2generate(e);
    autoclose = false;
    sameacct = true;
    return done(e);
}
$.nicknamebutton.onclick = function (e) {
    msgoff("phishing");
    $.superpw.disabled = false;
    $.sitename.disabled = false;
    $.username.disabled = false;
    clearDatalist("sitenames");
    sameacct = false;
    $.sitename.focus();
    autoclose = false;
    return done(e);
}
// Phishing methods when there is a safe suffix
$.suffixcancelbutton.onclick = function (e) {
    msgoff("suffix");
    $.superpw.disabled = false;
    $.sitename.disabled = false;
    $.username.disabled = false;
    $.sitename.focus();
    autoclose = false;
    return done(e);
}
$.suffixacceptbutton.onclick = async function (e) {
    msgoff("suffix");
    await $.sameacctbutton.onclick(e); // So it runs in the same turn
    return done(e);
}
// Forget buttons
$.forgetbutton.onclick = async function (e) {
    if (logging) console.log("popup forgetbutton");
    let list = [];
    let children = $.toforgetlist.children;
    for (let child of children) {
        list.push(child.innerText);
    }
    delete database.domains[normalize($.domainname.value)];
    delete database.sites[normalize($.sitename.value)];
    $.sitename.value = "";
    $.username.value = "";
    let superpw = bg.superpw;
    if (logging) console.log("popup forgetbuttononclick", isSuperPw(superpw));
    bg = clone(bgDefault);
    bg.superpw = superpw;
    if (logging) console.log("popup forgetbutton sending forget", list);
    try {
        let response = await retrySendMessage({"cmd": "forget", "toforget": list});
        if (logging) console.log("popup forget response", response);
        return done(e);
        $.forgetcancelbutton.onclick(); // So it runs in the same turn
    } catch (error) {
        console.error("Error sending forget message:", error);
    }
}
$.forgetcancelbutton.onclick = function (e) {
    // Can't just set list to [] because I need to remove the 
    // corresponding DOM elements
    while ( $.toforgetlist.firstChild ) {
        $.toforgetlist.removeChild($.toforgetlist.firstChild);
    }
    msgoff("forget");
    return done(e);
}
// Handle external links in the instructions and help
document.addEventListener('DOMContentLoaded', function (e) {
    let links = document.querySelectorAll('.external-link');
    links.forEach(function(link) {
        link.addEventListener('click', async function(e) {
            e.preventDefault();
            await chrome.tabs.create({url: this.href});
                    return done(e);
});
    });
    return done(e);
});
// Generic code for menus
function copied(which) {
    get(which + "copied").classList.remove("nodisplay");
    setTimeout(() => {
        get(which + "copied").classList.add("nodisplay");
    }, 900);
}
function notcopied(which) {
    get(which + "notcopied").classList.remove("nodisplay");
    setTimeout(() => {
        get(which + "notcopied").classList.add("nodisplay");
    }, 2000);
}
function menuOn(which, e) {
    allMenusOff();
    get(which + "3bluedots").style.display = "none";
    get(which + "menu").style.display = "flex";
}
function menuOff(which, e) {
    dotsAllOn();
    get(which + "menu").style.display = "none";
}
function allMenusOff() {
    $.domainnamemenu.style.display = "none";
    $.superpwmenu.style.display = "none";
    $.sitenamemenu.style.display = "none";
    $.usernamemenu.style.display = "none";
    $.sitepwmenu.style.display = "none";
}
function dotsAllOn() {
    $.domainname3bluedots.style.display = "block";
    $.superpw3bluedots.style.display = "block";
    $.sitename3bluedots.style.display = "block";
    $.username3bluedots.style.display = "block";
    $.sitepw3bluedots.style.display = "block";
}
function helpItemOn(which) {
    let element = get(which + "helptext");
    if (!element.style.display || element.style.display === "none") {
        helpAllOff();
        element.style.display = "block";
        element.style.display = "block";
        hideInstructions();
        hidesettings();
        autoclose = false;
    } else {
        helpAllOff();
    }
}
function helpItemOff(which) {
    $.helptext.style.display = "none";
    get(which).style.display = "none";
    autoclose = false;
}
function helpAllOff() {
    let helps = document.getElementsByName("help");
    for (let help of helps) {
        helpItemOff(help.id); 
    } 
}
function hidesitepw() {
    if (logging) console.log("popup checking hidesitepw", $.hidesitepw.checked, database.hidesitepw);
    if ($.hidesitepw.checked || (database && database.hidesitepw)) {
        $.sitepw.type = "password";
        $.sitepwmenushow.classList.remove("nodisplay");
        $.sitepwmenuhide.classList.add("nodisplay");
    } else {
        $.sitepw.type = "text";
        $.sitepwmenushow.classList.add("nodisplay");
        $.sitepwmenuhide.classList.remove("nodisplay");
    }
}
function showInstructions() {
    helpAllOff();
    autoclose = false;
    $.instructionpanel.style.display = "block";
    $.maininfo.title = "Close Instructions";
    $.instructionopen.classList.add("nodisplay");
    $.instructionclose.classList.remove("nodisplay");
    // I need to adjust the width of the main panel when the scrollbar appears.
}
function hideInstructions() {
    autoclose = true;
    closeAllInstructions();
    $.instructionpanel.style.display = "none";
    $.maininfo.title = "Open Instructions";
    $.instructionopen.classList.remove("nodisplay");
    $.instructionclose.classList.add("nodisplay");
    // I need to adjust the width of the main panel when the scrollbar disappears.
    $.main.style.padding = "6px " + scrollbarWidth() + "px 9px 12px";
}
// End of generic code for menus: other utility functions
async function getPhishingDomain(sitename) {
    let sitenamenorm = normalize(sitename);
    let domainnameNorm = normalize($.domainname.value);
    if (!domainnameNorm) return ""; // No domain name to check
    // Can't be phishing if the domain name is in the database with this sitename,
    if (!sitenamenorm || database.domains[domainnameNorm] === sitenamenorm) return "";
    let settings = database.sites[sitenamenorm];
    if (!settings) return ""; // No settings for this sitename
    // Return a list of all domain names in domains that have sitenamenorm as a value
    let matches = Object.keys(database.domains).filter((d) => {
        let dnorm = normalize(d);
        return database.domains[d] === sitenamenorm && dnorm !== domainnameNorm;
    });
    let phishing = matches.length > 0 ? matches.reduce((a, b) => a[0].length <= b[0].length ? a : b, matches[0]) : "";
    return phishing;
}
function openPhishingWarning(d) {
    if (!d) return false;
    if (isSharedCredentials(d, $.domainname.value)) {
        $.sameacctbutton.onclick(); // So it runs in the same turn
        return false;
    }
    let domainname = $.domainname.value;
    let suffix = commonSuffix(d, domainname);
    if (database.common.safeSuffixes[suffix]) {
        $.suffixtext0.innerText = $.sitename.value;
        $.suffixtext1.innerText = suffix;
        $.suffixtext2.innerText = domainname;
        msgon("suffix");
    } else {
        $.phishingtext0.innerText = $.sitename.value;
        $.phishingtext1.innerText = d;
        $.phishingtext2.innerText = domainname;
        msgon("phishing");
    }
    $.superpw.disabled = true;
    // $.sitename.disabled = true; // So you don't have to click the nickname button to change the sitename
    $.username.disabled = true;
    $.sitepw.value = "";
    hidesettings();
    return true;
}
function setupdatalist(element, list) {
    let datalist = get(element.id + "s");
    const newDatalist = datalist.cloneNode(false);
    list.forEach((data) => {
        let option = document.createElement("option");
        option.value = data;
        newDatalist.appendChild(option);
    });
    datalist.replaceChildren(...newDatalist.children);
    if (datalist.children.length > 0) {
        $.main.classList.remove("datalist-closed");
        $.main.classList.add("datalist-open");
    } else {
        $.main.classList.remove("datalist-open");
        $.main.classList.add("datalist-closed");
    }
}
function clearDatalist(listid) {
    let datalist = get(listid);
    if (datalist.hasChildNodes) {
        const newDatalist = datalist.cloneNode(false);
        datalist.replaceWith(newDatalist);
    }
    $.main.classList.remove("datalist-open");
    $.main.classList.add("datalist-closed");
}
function sortList(list) {
    return list.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}
// See if the entered super password is the same as last time
// Reset the database value for the super password hash if it has changed or is not set
async function sameSuperpw(superpwValue) {
    let oldSuperPwHash = database.common.superpwHash || "";
    let superpwHash = await computeSuperpwHash(superpwValue);
    if (!oldSuperPwHash) database.common.superpwHash = superpwHash;
    let same = superpwHash === database.common.superpwHash;
    return same;
}
async function computeSuperpwHash(superpwValue) {
    const oldsuperpw = bgDefault.superpw || "";
    bgDefault.superpw = superpwValue || "";
    let hash = await generatePassword(bgDefault);
    bgDefault.superpw = oldsuperpw;
    return hash;
}
// Thanks, Copilot
function scrollbarWidth() {
    // Create a div with a known width and height
    const div = document.createElement("div");
    div.style.width = "50px";
    div.style.height = "50px";
  
    // Set the overflow property to scroll
    div.style.overflow = "scroll";
  
    // Append the div to the document
    document.body.appendChild(div);
  
    // Calculate the width of the scrollbar
    const scrollbarWidth = div.offsetWidth - div.clientWidth;
  
    // Remove the div from the document
    document.body.removeChild(div);
  
    // Return the width of the scrollbar
    return scrollbarWidth;
}
function setMeter(which) {
    const meter = get(which + "-strength-meter");
    const input = get(which);
    const report = zxcvbn(input.value);
    let guesses = getGuesses(which);
    // 10^9 guesses per second, 3*10^7 seconds per year, average success in 1/2 the tries
    let years = guesses/(1e9*3e7*2);
    if (which === "superpw") years /= 16*1024; // So the superpw will have more entropy than the site password
    let score = getScore(years);
    let index = Math.floor(score/5);
    meter.value = (input.value && score) ? score : 1;
    meter.style.setProperty("--meter-value-color", strengthColor[index]);
    meter.title = strengthText[index] + guessLabel(years);
    input.style.color = strengthColor[index];
    function getScore(years) {
        let strong = Math.log10(1000);
        let good = Math.log10(1);
        let weak = Math.log10(1/12);
        let veryweak = Math.log10(1/365);
        let logYears = Math.log10(years);
        if (logYears > strong) {
            return 20;
        } else if (logYears > good) {
            return 15 + (logYears - good) * (20 - 15) / (strong - good);
        } else if (logYears > weak) {
            return 10 + (logYears - weak) * (15 - 10) / (good - weak);
        } else if (logYears > veryweak) {
            return 5 + (logYears - veryweak) * (10 - 5) / (weak - veryweak);
        } else {
            return 0;
        }
    }
    function getGuesses(which) {
        let alphabetSize = 0;
        if (which === "superpw") {
            let chars = $.superpw.value.split("");
            if (chars.some(char => config.lower.includes(char))) alphabetSize += 26;
            if (chars.some(char => config.upper.includes(char))) alphabetSize += 26;
            if (chars.some(char => config.digits.includes(char))) alphabetSize += 10;
            if (chars.some(char => "~!@#$.%^&*()_+-=[]\\{}|;':\",./<>? ".includes(char))) alphabetSize += 32;
        } else {
            if ($.allowlowercheckbox.checked) alphabetSize += 26;
            if ($.allowuppercheckbox.checked) alphabetSize += 26;
            if ($.allownumbercheckbox.checked) alphabetSize += 10;
            if ($.allowspecialcheckbox.checked) alphabetSize += $.specials.value.length;
        }
        let sequence = report.sequence;
        let guesses = 1;
        for (let i = 0; i < sequence.length; i++) {
            if (sequence[i].pattern === "bruteforce") {
                guesses *= alphabetSize**(sequence[i].token.length);
            } else {
                guesses *= sequence[i].guesses;
            }
        }
        if (which === "sitepw") {
            // Adjust site password for modulus bias
            let statisticalDistance = (256%alphabetSize)/256; // Upper bound on statistical distance
            guesses = Math.floor(guesses*(1 - statisticalDistance));
        }
        return guesses;
    }
    function guessLabel(years) {
        let labels = {
            "years": Math.floor(years),
            "months": Math.floor(years*12),
            "days": Math.floor(years*365),
            "hours": Math.floor(years*365*24),
            "minutes": Math.floor(years*365*24*60)
        }
        if (labels.years > 1000) return " (more than 1,000 years to guess)";
        if (labels.years > 1) return " (" + labels.years + " years to guess)";
        if (labels.years === 1) return " (1 year to guess)";
        if (labels.months > 1) return " (" + labels.months + " months to guess)";
        if (labels.months == 1) return " (" + labels.months + " month to guess)";
        if (labels.days > 1) return " (" + labels.days + " days to guess)";
        if (labels.days == 1) return " (" + labels.days + " day to guess)";
        if (labels.hours > 1) return " (" + labels.hours + " hours to guess)";
        if (labels.hours == 1) return " (" + labels.hours + " hour to guess)";
        if (labels.minutes > 1) return " (" + labels.minutes + " minutes to guess)";
        if (labels.minutes == 1) return " (" + labels.minutes + " minute to guess)";
        if (labels.minutes < 1) return " (less than a minute to guess)";
    }
}
// For those keyup events where I don't want to generate a password
// that might produce an error, but I do want to save the settings.
async function handlekeyupnopw(event, element) {
    bg.settings[element] = get(element).value;
}
async function handlekeyup(event, element) {
    await handleblur(event, element);
}
async function handleblur(event, element) {
    if (element === "superpw") {
        bg.superpw = get(element).value;
    } else if (element.startsWith("allow")) {
        if (!(bg.settings.allowupper || bg.settings.allowlower)) {
            bg.settings.startwithletter = false;
            $.startwithletter.checked = false;
        }
    } else if (element === "startwithletter") {
        bg.settings.startwithletter = $.startwithletter.checked;
    } else if (element === "providesitepw") {
        bg.settings.providesitepw = $.providesitepw.checked;
    } else {
        let value = get(element).value;
        value = isNaN(Number(value)) ? value : Number(value);
        bg.settings[element] = value;
    }
    if ($.superpw.value && $.sitename.value && $.username.value) {
        $.providesitepw.disabled = false;
    } else {
        $.providesitepw.disabled = true;
    }
    bg.settings.characters = characters(bg.settings, database);
    let pw = await ask2generate(event);
    $.sitepw.value = pw; // So it doesn't change while the user is typing
    setMeter("superpw");
    setMeter("sitepw");
    updateExportButton(); 
    let readyForClick = isReadyForClick($.superpw.value, $.sitename.value, $.username.value, pw);
    if (isUrlMatch(activetab.url)) {
        try {
            await chrome.tabs.sendMessage(activetab.id, { "cmd": "update", "u": $.username.value || "", "p": "", "readyForClick": readyForClick });
        } catch (error) {
            if (logging) console.error("popup handleblur error", error);
        }
    }
    if (logging) console.log(Date.now(), "popup handleblur timeout");
    await changePlaceholder();
}
async function handleclick(e, which) {
    let element = "allow" + which;
    bg.settings[element] = get(element + "checkbox").checked;
    pwoptions([which]);
    if (!(bg.settings.allowupper || bg.settings.allowlower)) {
        bg.settings.startwithletter = false;
        $.startwithletter.checked = false;
    }
    await handleblur(e, element);
}
async function changePlaceholder() {
    let readyForClick = isReadyForClick($.superpw.value, $.sitename.value, $.username.value);
    if (isUrlMatch(activetab.url)) {
        try {
            await chrome.tabs.sendMessage(activetab.id, { "cmd": "fillfields", "u": $.username.value || "", "p": "", "readyForClick": readyForClick });
        } catch (error) {
            if (logging) console.error("popup changePlaceholder error", error);
        }
    }
}
// A nice usability feature is to focus on the first field the user should fill in.
// Unfortunately, that lets the user fill in the form without the mouse ever entering 
// the popup.  Since I can't detect when the popup closes, those changes are lost. 
// I avoid ths problem by only calling this function when the mouse enters the popup.
function defaultfocus() {
    if ($.providesitepw.checked) $.sitepw.focus();
    if (!$.username.value && !$.username.disabled) $.username.focus();
    if (!$.sitename.value && !$.sitename.disabled) $.sitename.focus();
    if (!$.superpw.value && !$.superpw.disabled) $.superpw.focus();
}
async function ask2generate(event) {
    let sitepwWasActive = !!(event?.currentTarget === $.sitepw || event?.currentTarget === $.changesuperpwkeepnewinput);
    if (bg.settings.providesitepw && bg.settings.pwlength === 0) return "";
    if (!isConsistent(bg.settings)) {
        msgon("nopw");
        return Promise.resolve(""); // To match the await in the other branch
    } else {
        msgoff("nopw"); // I don't want to hide any other open messages
        if (sitepwWasActive) {
            bg.settings.pwlength = $.sitepw.value.length;
        }
        const computed = await generatePassword(bg);
        if (computed) {
            msgoff("nopw"); // I don't want to hide any other open messages
        } else {
            if ($.superpw.value) {
                msgon("nopw");
            }
        }
        if (bg.settings.providesitepw) {
            if ($.sitepw.value) {
                bg.settings.xor = xorStrings(computed, $.sitepw.value);
            } else {
                $.sitepw.value = stringXorArray(computed, bg.settings.xor);
            }
        }
        let provided = stringXorArray(computed, bg.settings.xor);
        if (logging) console.log("popup filling sitepw field", computed, provided, bg.settings.xor);
        hidesitepw();
        setMeter("sitepw");
        return provided;
    }
}
async function fill() {
    if (bg.settings.domainname) {
        if (!$.username.value) $.username.value = bg.settings.username;
        if (!$.sitename.value) $.sitename.value = bg.settings.sitename;
    } else {
        bg.settings.domainname = normalize($.domainname.value); // Keep for compatibility with V3.0.12
        bg.domainname = normalize($.domainname.value);
        bg.settings.sitename = normalize($.sitename.value);
        bg.settings.username = normalize($.username.value);
    }
    $.superpw.value = bg.superpw || "";
    $.sitename.value = bg.settings.sitename;
    $.username.value = bg.settings.username;
    $.providesitepw.checked = bg.settings.providesitepw;
    if ($.providesitepw.checked) {
        $.defaultsettings.classList.add("fade-out");
    } else {
        $.defaultsettings.classList.remove("fade-out");
    }
    if (logging) console.log("popup fill with", bg.domainname, isSuperPw(bg.superpw), bg.settings.sitename, bg.settings.username);
    if ($.superpw.value && $.sitename.value && $.username.value) {
        $.providesitepw.disabled = false;
        $.providesitepwlabel.style.opacity = 1.0;
    } else {
        $.providesitepw.disabled = true;
        $.providesitepwlabel.style.opacity = 0.5;
    }
    if ($.providesitepw.checked && $.superpw.value && $.sitename.value && $.username.value) {
        $.sitepw.readOnly = false;
        $.sitepw.placeholder = "Enter your account password";
        $.sitepw.style.backgroundColor = "white";
    } else {
        $.sitepw.readOnly = true;
        $.sitepw.placeholder = "Your account password";
        $.sitepw.style.backgroundColor = "rgb(136, 204, 255, 20%)";
    }
    $.clearsuperpw.checked = database.common.clearsuperpw;
    $.hidesitepw.checked =  database.common.hidesitepw;
    hidesitepw();
    $.pwlength.value = bg.settings.pwlength;
    $.startwithletter.checked = bg.settings.startwithletter;
    $.allowlowercheckbox.checked = bg.settings.allowlower;
    $.allowuppercheckbox.checked = bg.settings.allowupper;
    $.allownumbercheckbox.checked = bg.settings.allownumber;
    $.allowspecialcheckbox.checked = bg.settings.allowspecial;
    $.minlower.value = bg.settings.minlower;
    $.minupper.value = bg.settings.minupper;
    $.minnumber.value = bg.settings.minnumber;
    $.minspecial.value = bg.settings.minspecial;
    $.specials.value = bg.settings.specials;
    restrictStartsWithLetter();
    $.sitepw.value = await ask2generate();
}
function restrictStartsWithLetter() {
    if ($.providesitepw.checked) return;
    if (!($.allowlowercheckbox.checked || $.allowuppercheckbox.checked)) {
        $.startwithletter.disabled = true;
    } else {
        $.startwithletter.disabled = false;
    }
}
async function showsettings() {
    $.settingsshow.style.display = "none";
    $.settingssave.style.display = "inline";
    $.settingsmenu.style.display = "block";
    helpAllOff();
    hideInstructions();
    let height = $.settingsmenu.getBoundingClientRect().height;
    $.main.style.height = height + "px";
    $.superpw.value = bg.superpw || "";
    await fill();
    pwoptions(["lower", "upper", "number", "special"]);
}
function hidesettings() {
    $.settingsshow.style.display = "inline";
    $.settingssave.style.display = "none";
    $.settingsmenu.style.display = "none";
    let height = mainHeight();
    $.main.style.height = height + "px";
}
function pwoptions(options) {
    for (let x in options) {
        let which = options[x];
        let allow = get("allow" + which);
        let require = get("require" + which);
        get("allow" + which + "checkbox").checked = bg.settings["allow" + which];
        if (bg.settings["allow" + which]) {
            allow.style.display = "none";
            require.style.display = "inline";
        } else {
            allow.style.display = "inline";
            require.style.display = "none";
        }
    }
}
function updateExportButton() {
    if ($.superpw.value) {
        $.exportbutton.disabled = false;
        $.exportbutton.title = "Export your site passwords";
    } else {
        $.exportbutton.disabled = true;
        $.exportbutton.title = "Enter your super password to export your site passwords";
    }
}
async function exportPasswords() {
    if (!$.superpw.value) return;
    // I would normally set autoclose to false, but it gets turned 
    // back to true in message(), which is called from ask2generate().
    exporting = true;
    // I need the try block to put exporting back to false if there is an error
    try {
        let exportbutton = $.exportbutton;
        exportbutton.innerText = "Exporting...";
        let domainnames = database.domains;
        let sorted = Object.keys(domainnames).sort(function (x, y) {
            if (x.toLowerCase() < y.toLowerCase()) return -1;
            if (x.toLowerCase() == y.toLowerCase()) return 0;
            return 1;
        });
        let olddomainname = $.domainname.value;
        let oldsitename = $.sitename.value;
        let oldusername = $.username.value;
        let oldsettings = clone(bg.settings);
        let data = "Domain Name, Site Name, User Name, Site Password\n";
        for (let domainname of sorted) {
            let sitename = normalize(database.domains[domainname]);
            let settings = database.sites[sitename];
            let username = settings.username;
            bg.settings = settings;
            $.domainname.value = domainname;
            $.sitename.value = settings.sitename;
            $.username.value = settings.username;
            try {
                let sitepw = await ask2generate();
                data += '"' + domainname + '"' + "," + '"' + sitename + '"' + "," + '"' + username + '"' + "," + '"' + sitepw + '"' + "\n";
            } catch (e) {
                console.log("popup exportPasswords error", e);
            }
        }
        bg.settings = oldsettings;
        $.sitename.value = oldsitename;
        $.username.value = oldusername;
        $.domainname.value = olddomainname;
        let blob = new Blob([data], {type: "text/csv"});
        let url = URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.href = url;
        link.download = "SitePasswordExport.csv";
        document.body.appendChild(link);
        link.click();    
        document.body.removeChild(link);
        exporting = false;
        $.sitepw.value = await ask2generate(); // To get the right password to show up
    } catch (e) {
        alert("Export error: Close SitePassword and try again.");
        console.log("popup exportPasswords error", e);
        $.exportbutton.innerText = "Export passwords";
        exporting = false;
    }
}
async function sitedataHTML() {
    let domainnames = database.domains
    let sorted = Object.keys(domainnames).sort(function (x, y) {
        if (x.toLowerCase() < y.toLowerCase()) return -1;
        if (x.toLowerCase() == y.toLowerCase()) return 0;
        return 1;
    });
    let workingdoc = document.implementation.createHTMLDocument("SitePassword Data");
    let doc = sitedataHTMLDoc(workingdoc, sorted);
    let html = new XMLSerializer().serializeToString(doc);
    let blob = new Blob([html], {type: "text/html"});
    let url = URL.createObjectURL(blob);
    let data = get("data");
    data.href = url;
    try {
        data.click();
    } catch (e) {
        console.log("popup sitedataHTML error", e);
        alert("SitePassword data could not be exported.");
    }
    autoclose = false;
    return;
}
function sitedataHTMLDoc(doc, sorted) {
    let header = doc.getElementsByTagName("head")[0];
    let scriptContent = `
        function sortTable(which, ascending = true) {
            let table = document.getElementsByTagName("table")[0];
            console.log("sortTable", table, which, ascending);
            const dirModifier = ascending ? 1 : -1;
            const tBody = table.tBodies[0];
            const rows = Array.from(tBody.querySelectorAll("tr"));
            let headerRow = rows.shift(); // Skip the header row

            // Sort each row
            const sortedRows = rows.sort(function (a, b) {
                const aColText = a.querySelector(\`td:nth-child(\$.{which + 1})\`).innerText.trim().toLowerCase();
                const bColText = b.querySelector(\`td:nth-child(\$.{which + 1})\`).innerText.trim().toLowerCase();
                console.log("sortTable", aColText, bColText);
                return aColText > bColText ? (1 * dirModifier) : (-1 * dirModifier);
            });

            // Remove all existing TRs from the table
            while (tBody.firstChild) {
                tBody.removeChild(tBody.firstChild);
            }

            // Re-add the newly sorted rows
            tBody.append(headerRow);
            sortedRows.forEach((row, index) => {
                if (index % 2 === 0) {
                    row.style.backgroundColor = "rgb(136, 204, 255, 30%)";
                } else {
                    row.style.backgroundColor = "";
                }
                tBody.appendChild(row);
            });

        }
        function sortBySite() { 
            console.log("sortBySite");
            let sortBySite = document.getElementById("sortButtonSite");
            sortBySite.style.display = "none";
            let sortByDomain = document.getElementById("sortButtonDomain");
            sortByDomain.style.display = "block";
            sortTable(1);
        }
        function sortByDomain() { 
            let sortBySite = document.getElementById("sortButtonDomain");
            sortBySite.style.display = "none";
            let sortByDomain = document.getElementById("sortButtonSite");
            sortByDomain.style.display = "block";
            window.location.reload();
        }
    `;
    let script = doc.createElement("script");
    script.type = "text/javascript";
    script.src = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(scriptContent);
    header.appendChild(script);
    let style = addElement(header, "style");
    style.innerText = "th {text-align: left;}";
    style.classList
    let body = doc.getElementsByTagName("body")[0];
    let sortButtonSite = addElement(body, "button");
    sortButtonSite.id = "sortButtonSite";
    sortButtonSite.innerText = "Sort by site name";
    sortButtonSite.setAttribute("onclick", "sortBySite()");
    sortButtonSite.style.display = "block";
    let sortButtonDomain = addElement(body, "button");
    sortButtonDomain.id = "sortButtonDomain";
    sortButtonDomain.innerText = "Sort by domain name";
    sortButtonDomain.setAttribute("onclick", "sortByDomain()");
    sortButtonDomain.style.display = "none";
    let table = addElement(body, "table");
    tableCaption(table);
    let headings = ["Domain Name", "Site Name", "User Name", "Password Length", "Start with Letter",
        "Allow Lower", "Min Lower", "Allow Upper", "Min Upper", "Allow Numbers", "Min Numbers",
        "Allow Specials", "Min Specials", "Specials", "Code for User Provided Passwords"];
    tableHeader(table, headings);
    for (let i = 0; i < sorted.length; i++) {
        let tr = addElement(table, "tr");
        if (i % 2 === 0) tr.style.backgroundColor = "rgb(136, 204, 255, 30%)";
        addRow(tr, sorted[i]);
    }
    return doc.documentElement;
    // Helper functions
    function addElement(parent, type) {
        let e = doc.createElement(type);
        parent.appendChild(e);
        return e;
    }
    function tableCaption(table) {
        let caption = addElement(table, "caption");
        caption.innerText = "You can use these settings at ";
        let a = addElement(caption, "a");
        a.href = "https://sitepassword.info";
        a.rel = "noopener noreferrer";
        a.innerText = "https://sitepassword.info."; 
        let p = addElement(caption, "p");
        p.innerText = "Click on the domain name to open sitepassword.info or right click on the domain name and copy the link address to paste into the bookmark field."; 
    }
    function tableHeader(table, headings) {
        let tr = addElement(table, "tr");
        for (let i = 0; i < headings.length; i++) {
            let th = addElement(tr, "th");
            th.innerText = headings[i];
        }
    }
    function addColumnEntries(tr, settings) {
        for (let i = 0; i < settings.length; i++) {
            let td = addElement(tr, "td");
            let pre = addElement(td, "pre");
            pre.innerText = settings[i];    
        }
    }
    function addRow(tr, domainname) {
        let sitenameNorm = normalize(database.domains[normalize(domainname)]);
        let s = database.sites[sitenameNorm];
        s.domainname = domainname; // So it matches the domain name in the bookmark you clicked
        let bkmk = JSON.stringify(s);
        let td = addElement(tr, "td");
        let a = addElement(td, "a");
        a.title = "Right click to copy bookmark";
        a.href = webpage + "?bkmk=ssp://" + bkmk;
        a.innerText = domainname;
        let entries = [s.sitename, s.username, s.pwlength, s.startwithletter, 
            s.allowlower, s.minlower, s.allowupper, s.minupper, s.allownumber, s.minnumber,
            s.allowspecial, s.minspecial, s.specials, s.xor || ""];
        addColumnEntries(tr, entries);
    }
}
function addForgetItem(domainname) {
    let $ist = $.toforgetlist;
    let inlist = Array.from($ist.children).some(child => child.innerText === domainname);
    if (inlist) return;
    let item = document.createElement("li");
    item.innerText = domainname;
    $ist.appendChild(item);
    let array = Array.from($ist.children);
    array.sort((a, b) => a.innerText.localeCompare(b.innerText));
    while ($ist.firstChild) $ist.removeChild($ist.firstChild);
    array.forEach(item => $ist.appendChild(item));
}
function clone(object) {
    return JSON.parse(JSON.stringify(object))
}
function isSupportedProtocol(v) {
    if (!v) return false;
    let protocol = v.split("://")[0];
    if (protocol === "http" || protocol === "https") return true;
    return false;
 }
// Messages in priority order high to low
let warnings = [
    { name: "forget", ison: false, transient: false },
    { name: "phishing", ison: false, transient: false },
    { name: "changesuperpw", ison: false, transient: false },
    { name: "changesitename", ison: false, transient: false },
    { name: "superpwtypo", ison: false, transient: false },
    { name: "changeusername", ison: false, transient: false },
    { name: "suffix", ison: false, transient: false },
    { name: "account", ison: false, transient: false },
    { name: "nopw", ison: false, transient: false },
    { name: "http", ison: false, transient: false },
    { name: "zero", ison: false, transient: false },
    { name: "multiple", ison: false, transient: false }
];
function msgon(msgname) {
    warning(msgname, true);
    autoclose = false;
}
function msgoff(msgname) {
    warning(msgname, false);
    autoclose = true;
}
// Show only the highest priority message that is on
function warning(msgname, turnon) {
    let ison = false;
    for (let i = 0; i < warnings.length; i++) {
        let msg = warnings[i];
        if (msg.name == msgname) msg.ison = turnon;
        get(msg.name).style.display = msg.ison ? "block" : "none";
        if (ison) get(msg.name).style.display = "none";
        ison = ison || msg.ison;
    }
    if (ison) {
        $.warnings.style.display = "block";
    } else {
        $.warnings.style.display = "none";
    }
    let height = mainHeight();
    $.main.style.height = height + "px";
    $.instructionpanel.style.height = height + "px";
    if (height <= 575) $.main.style.padding = "6px " + scrollbarWidth() + "px 9px 12px";
    warningMsg = ison;
    autoclose = !ison;
}
function mainHeight() {
    let padding = $.main.style.padding.split(" ");
    let topMargin = parseInt(padding[0]);
    let bottomMargin = parseInt(padding[2]);
    let bottom = $.bottom.getBoundingClientRect().bottom + bottomMargin;
    let top = $.top.getBoundingClientRect().top - topMargin;
    let height = Math.min(bottom - top, 575);
    return height;
}
// Handle the case where the user clicks on the link in the instructions or help
function sectionrefSetup() {
    let sectionrefs = document.getElementsByName("sectionref");
    for (let section of sectionrefs) {
        section.onclick = function (e) {
            e.stopPropagation();
            sectionClick(this.id.slice(0, -3));
            return done(e);
        }
    }
}
// Handle all sections of the instructions
function instructionSetup() {
    let instructions = document.getElementsByName("instructions");
    if (logging) console.log("popup instructions", instructions);
    for (let instruction of instructions) {
        let section = instruction.id.replace("info", "");
        instruction.onclick = function (e) {
            sectionClick(section);
            return done(e);
        }
    }
}
function sectionClick(which) {
    if (logging) console.log("popup sectionClick", which);
    const element = get(which + "div");
    if (element.style.display === "none") {
        closeAllInstructions();
        showInstructions();
        element.style.display = "block";
        get("open" + which).style.display = "none";
        get("close" + which).style.display = "block";
        get(which + "info").scrollIntoView();
    } else {
        element.style.display = "none";
        get("open" + which).style.display = "block";
        get("close" + which).style.display = "none";
    }
}
function closeInstructionSection(which) {
    const element = get(which + "div");
    element.style.display = "none";
    get("open" + which).style.display = "block";
    get("close" + which).style.display = "none";
}
function closeAllInstructions() {
    let instructions = document.getElementsByName("instructions");
    for (let instruction of instructions) {
        let section = instruction.id.replace("info", "");
        closeInstructionSection(section);
    }
}
// Tests generate events that wait for a promise.  Each event handler 
// needs to resolve the promise before returning, but that's inconvenient
// when there are multiple returns in a handler.  This function takes
// care of that
function done(e) {
    if (recordEvents && e) {
        const nowMs = Date.now();
        const hms = new Date(nowMs).toLocaleTimeString("en-US", { hour12: false });
        console.log(hms, e);
    };
    if (e?.resolver) e.resolver();
}
// Sometimes messages fail because the receiving side isn't quite ready.
// That's most often the service worker as it's starting up.
/**
 * Retry sending a message.
 * @param {object} message - The message to send.
 * @param {number} retries - The number of retry attempts.
 * @param {number} delay - The delay between retries in milliseconds.
 * @returns {Promise} - A promise that resolves when the message is successfully sent or rejects after all retries fail.
 **/
function retrySendMessage(message, retries = 5, delay = 100) {
    messageQueue = messageQueue.then(() => retrySendMessageRest(message, retries, delay));
    return messageQueue;
}
async function retrySendMessageRest(message, retries = 5, delay = 100) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await chrome.runtime.sendMessage(message);
            return response; // Message sent successfully
        } catch (error) {
            console.log(`popup attempt $.{attempt} failed:`, error);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
            } else {
                if (!error.includes("Could not establish connection")) {
                    throw new Error(`Failed to send message $.{message} after $.{retries} attempts`);
                } else {
                    console.log("popup retrySendMessage error", message, error);
                }
            }
        }
    }
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