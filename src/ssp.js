'use strict';
import { bgBaseDefault, config, databaseDefault, isSafari, isUrlMatch, webpage } from "./bg.js";
import { runTests, resolvers } from "./test.js";
import { characters, generatePassword, isSuperPw, normalize, stringXorArray, xorStrings } from "./generate.js";
import { publicSuffixSet } from "./public_suffix_list.js";
import { isSharedCredentials } from "./sharedCredentials.js";  
// #region
    const $root = get("root");
    const $mainpanel = get("mainpanel");
    const $title = get("title");
    const $domainname = get("domainname");
    const $domainnamemenu = get("domainnamemenu");
    const $domainname3bluedots = get("domainname3bluedots");
    const $domainnamemenuforget = get("domainnamemenuforget");
    const $domainnamemenuhelp = get("domainnamemenuhelp");
    const $domainnamehelptextclose = get("domainnamehelptextclose");
    const $domainnamehelptextmore = get("domainnamehelptextmore");
    const $superpw = get("superpw");
    const $superpwmenu = get("superpwmenu");
    const $superpw3bluedots = get("superpw3bluedots");
    const $superpwmenushow = get("superpwmenushow");
    const $superpwmenuhide = get("superpwmenuhide");
    const $superpwmenuhelp = get("superpwmenuhelp");
    const $superpwhelptextclose = get("superpwhelptextclose");
    const $superpwhelptextmore = get("superpwhelptextmore");
    const $sitename = get("sitename");
    const $sitename3bluedots = get("sitename3bluedots");
    const $sitenamemenu = get("sitenamemenu");
    const $sitepwmenuaccount = get("sitepwmenuaccount");
    const $account = get("account");
    const $accounttext1 = get("accounttext1");
    const $accountnicknamecancelbutton = get("accountnicknamecancelbutton");
    const $accountnicknameinput = get("accountnicknameinput");
    const $accountnicknamesavebutton = get("accountnicknamesavebutton");
    const $accountnicknamenewbutton = get("accountnicknamenewbutton");
    const $sitenamemenuaccount = get("sitenamemenuaccount");
    const $sitenamemenuforget = get("sitenamemenuforget");
    const $sitenamemenuhelp = get("sitenamemenuhelp");
    const $sitenamehelptextclose = get("sitenamehelptextclose");
    const $sitenamehelptextmore = get("sitenamehelptextmore");
    const $username = get("username");
    const $username3bluedots = get("username3bluedots");
    const $usernamemenu = get("usernamemenu");
    const $usernamemenuforget = get("usernamemenuforget");
    const $usernamemenucopy = get("usernamemenucopy");
    const $usernamemenuhelp = get("usernamemenuhelp");
    const $usernamehelptextclose = get("usernamehelptextclose");
    const $usernamehelptextmore = get("usernamehelptextmore");
    const $sitepw = get("sitepw");
    const $sitepwmenu = get("sitepwmenu");
    const $sitepw3bluedots = get("sitepw3bluedots")
    const $sitepwmenucopy = get("sitepwmenucopy");
    const $sitepwmenushow = get("sitepwmenushow");
    const $sitepwmenuhide = get("sitepwmenuhide");
    const $sitepwmenuhelp = get("sitepwmenuhelp");
    const $sitepwhelptextclose = get("sitepwhelptextclose");
    const $sitepwhelptextmore = get("sitepwhelptextmore");
    const $settings = get("settings");
    const $settingsshow = get("settingsshow");
    const $logo = get("logo");
    const $logopw = get("logopw");
    const $clearclipboard = get("clearclipboard");
    const $settingssave = get("settingssave");
    const $providesitepw = get("providesitepw");
    const $providesitepwlabel = get("providesitepwlabel");
    const $clearsuperpw = get("clearsuperpw");
    const $hidesitepw = get("hidesitepw");
    const $pwlength = get("pwlength");
    const $startwithletter = get("startwithletter");
    const $allowlowercheckbox = get("allowlowercheckbox");
    const $allowuppercheckbox = get("allowuppercheckbox");
    const $allownumbercheckbox = get("allownumbercheckbox");
    const $allowspecialcheckbox = get("allowspecialcheckbox");
    const $minlower = get("minlower");
    const $minupper = get("minupper");
    const $minnumber = get("minnumber");
    const $minspecial = get("minspecial");
    const $specials = get("specials");
    const $makedefaultbutton = get("makedefaultbutton");
    const $sitedatagetbutton = get("sitedatagetbutton");
    const $exportbutton = get("exportbutton");
    const $maininfo = get("maininfo");
    const $cancelwarning = get("cancelwarning");
    const $sameacctbutton = get("sameacctbutton");
    const $nicknamebutton = get("nicknamebutton");
    const $forgetbutton = get("forgetbutton");
    const $forgetcancelbutton = get("forgetcancelbutton");
    const $toforgetlist = get("toforgetlist");
    const $helptext = get("helptext");
    const $instructionpanel = get("instructionpanel");
    const $instructionopen = get("instructionopen");
    const $instructionclose = get("instructionclose");
    const $main = get("main");
    const $bottom = get("bottom");
    const $top = get("top");
    const $warnings = get("warnings");
    const $phishingtext0 = get("phishingtext0");
    const $phishingtext1 = get("phishingtext1");
    const $phishingtext2 = get("phishingtext2");
    const $suffixtext0 = get("suffixtext0");
    const $suffixtext1 = get("suffixtext1");
    const $suffixtext2 = get("suffixtext2");
    const $suffixacceptbutton = get("suffixacceptbutton");
    const $suffixcancelbutton = get("suffixcancelbutton");
// #endregion
// testMode must start as false.  Its value will come in a message from bg.js.
let testMode = false;
const debugMode = false;

let logging = false;
if (logging) console.log("Version 3.0");
let autoclose = true;
let exporting = false;
let sameacct = true;
let showWarning = true;
let activetab;
let domainname;
let mainPanelTimer;
const strengthText = ["Too Weak", "Very weak", "Weak", "Good", "Strong"];
const strengthColor = ["#bbb", "#f06", "#f90", "#093", "#036"]; // 0,3,6,9,C,F
const defaultTitle = "SitePassword";

let saveSettings = true;
let warningMsg = false;
const bgDefault = clone(bgBaseDefault);
let bg = clone(bgDefault);
// Some actions prevent the settings being saved when mousing out of the main panel.
// However, some tests want to save the settings.  This function sets certain values
// to what they have when the popup is opened.
export function restoreForTesting() {
    autoclose = true;
    exporting = false;
    saveSettings = true;
    warningMsg = false;
    warnings.forEach(msg => msg.ison = false);
}
// I can't get the debugger statement to work unless I wait at least 1 second on Chrome
let timeout = debugMode ? 1000 : 0;     
setTimeout(() => {
    if (debugMode) debugger;
}, timeout);
// I need all the metadata stored in database for both the phishing check
// and for downloading the site data.
let database = clone(databaseDefault);
if (logging) console.log("popup starting", database);
// window.onunload appears to only work for background pages, which
// no longer work.  Fortunately, using the password requires a click
// outside the popup window.  I can't use window.onblur because the 
// popup window closes before the message it sends gets delivered.
window.onload = async function () {
    let tabs;
    try {
        tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch (error) {
        console.error("Error querying active tab window onload:", error);
        return;
    }
    activetab = tabs[0];
    if (logging) console.log("popup check clipboard");
    let v = await chrome.storage.local.get("onClipboard");
    if (v.onClipboard) {
        if (logging) console.log("popup clipboard used");
        $logopw.title = "A site password may be on the clipboard."
        $logo.style.display = "none";
        $logopw.style.display = "block";
        // Don't worry about waiting for these to complete
        await chrome.action.setTitle({title: "A site password may be on the clipboard."});
        await chrome.action.setIcon({"path": "images/icon128pw.png"});
    } else {
        if (logging) console.log("popup clipboard not used");
        $logo.title = defaultTitle;
        $logo.style.display = "block";
        $logopw.style.display = "none";
        // Don't worry about waiting for these to complete
        await chrome.action.setTitle({title: defaultTitle});
        await chrome.action.setIcon({"path": "../images/icon128.png"});
        // Hide some instructions if the browser doesn't support the bookmarks API
    }
    let tohide = document.getElementsByName("hideifnobookmarks");
    for (let element of tohide) {
        if (!chrome.bookmarks) element.classList.add("nodisplay");
    }
    if (logging) console.log("popup getting active tab");
    // Get pwcount from content script because service worker might have forgotten it
    if (logging) console.log("popup", activetab.url, isUrlMatch(activetab.url));
    if (chrome.runtime?.id && isUrlMatch(activetab.url)) {
        if (logging) console.log("popup sending count message to content script");
        let pwcount = 0;
        try {
            let result = await chrome.tabs.sendMessage(activetab.id, {"cmd": "count"});
            if (logging) console.log("popup get count", result);
            pwcount = result.pwcount;
        } catch (error) {
            pwcount = 1; // Assume failure means there is no content script so don't show warning
            if (logging) console.error("Error sending count message:", error);
        }
        warning("multiple", pwcount > 1);
        warning("zero", pwcount === 0);
        changePlaceholder();
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
    $domainname.value = domainname;
    // Ignore the page domain name when testing
    $sitepw.value = "";
    if (logging) console.log("popup got tab", domainname, activetab);
    if (logging) console.log("popup getting metadata");
    instructionSetup();
    sectionrefSetup();
    await getsettings();
}
async function init() {
    $superpw.value = bg.superpw || "";
    $sitename.value = bg.settings.sitename || "";
    $username.value = bg.settings.username || "";
    await fill();
    let protocol = activetab.url.split(":")[0];
    if (logging) console.log("popup testing for http", protocol);
    warning("http", protocol !== "https");
    if ($superpw.value) {
        setMeter("superpw");
        setMeter("sitepw");
    }
    $main.style.padding = "6px " + scrollbarWidth() + "px 9px 12px";
    defaultfocus();
    updateExportButton();
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
        $main.classList.remove("datalist-closed");
        $main.classList.add("datalist-open");
    } else {
        $main.classList.remove("datalist-open");
        $main.classList.add("datalist-closed");
    }
}
function clearDatalist(listid) {
    let datalist = get(listid);
    if (datalist.hasChildNodes) {
        const newDatalist = datalist.cloneNode(false);
        datalist.replaceWith(newDatalist);
    }
    $main.classList.remove("datalist-open");
    $main.classList.add("datalist-closed");
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
        response.duplicate; // Force an error if response is null
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
            alertString += "An easier way to see what's in the other duplicate bookmarks is to dbl-click on them.  "
            alertString += "They will open sitepassword.info with the settings for that bookmark.";
        }
        return;
    }
    if (response.multiple) {
        alertString += "You have multiple bookmark folders with the title '" + response.multiple + "'.  Please delete one and try again.\n\n";
        alertString += "You can look at which bookmarks are in the folders to decide which one you want to keep.";
        return;
    }
    bg = response.bg;
    database = response.database;
    hidesitepw();
    if (!bg.settings.sitename) {
        bg.settings.sitename = "";
    }
    $superpw.value = response.superpw || "";
    bg.superpw = response.superpw || "";
    await init();
    if (logging) console.log("popup got metadata", bg, database);
    if (!testMode && response.test) { // Only run tests once
        testMode = true;
        runTests();
    } else if (!testMode && !isSupportedProtocol(activetab.url)) {
        window.close();
        alert("SitePassword only supports HTTP and HTTPS pages.  Use sitepassword.info for other protocols.");
        return;
    }
}
//}
// This function sends a message to the service worker when the mouse leaves the 
// outermost div on the window.  When the user clicks outside the popup, the window
// loses focus and closes.  Any messages in flight will be lost.  That means there
// is a race between message delivery and the next user click.  Fortunately, messages
// are delivered in just a couple of ms, so there's no problem.  Just be aware that
// this race is the source of any problems related to loss of the message sent here.
$root.onmouseleave = function (event) {
    // If I close the window immediately, then messages in flight get lost
    if (autoclose && !exporting && !document.elementFromPoint(event.pageX, event.pageY)) {
        if (!debugMode) $root.style.opacity = 0.1;
        mainPanelTimer = setTimeout(() => {
            if (!debugMode) window.close();
        }, 750);
    }
}
$root.onmouseenter = function (e) {
    $root.style.opacity = 1; 
    clearTimeout(mainPanelTimer);
}
$mainpanel.onmouseleave = async function (event) {
    if (logging) console.log("popup mainpanel mouseleave", event);
    if (warningMsg) {   
        autoclose = false;
    } 
    let phishingDomain = await getPhishingDomain($sitename.value);
    if (logging) console.log("popup mainpanel mouseleave", phishingDomain);
    if (phishingDomain && saveSettings) openPhishingWarning(phishingDomain);
    let element = event ? (event.pageX ? document.elementFromPoint(event.pageX || 0, event.pageY || 0) : null) : null;
    if (logging) console.log("popup onmouseleave", phishingDomain, exporting, element);
    // Don't persist if: phishing sites, exporting, the mouse is in the panel, or if event triggered by closing a help or instruction panel
    if (phishingDomain || exporting || element || !saveSettings) {
        if (logging) console.log("popup phishing mouseleave resolve mouseleaveResolver", phishingDomain, resolvers);
        saveSettings = true;
        if (resolvers.mouseleaveResolver) resolvers.mouseleaveResolver("mouseleavePromise");
        return;
    }
    if (logging) console.log("popup mainpanel mouseleave update bg", document.activeElement.id, bg);
    // window.onblur fires before I even have a chance to see the window, much less focus it
    if (bg && bg.settings) {
        bg.superpw = $superpw.value || "";
        bg.domainname = $domainname.value || "";
        bg.settings.domainname = $domainname.value || "";
        bg.settings.sitename = $sitename.value || "";
        bg.settings.username = $username.value || "";
        if (bg.settings.sitename) {
            database.sites[normalize(bg.settings.sitename)] = clone(bg.settings);
            database.domains[bg.domainname] = bg.settings.sitename;
        }
        let sitename = $sitename.value;
        changePlaceholder();
        if (logging) console.log("popup sending siteData", bg.settings, database);
        try {
            let response = await retrySendMessage({
                "cmd": "siteData",
                "sitename": sitename,
                "clearsuperpw": get("clearsuperpw").checked,
                "hidesitepw": get("hidesitepw").checked,
                "safeSuffixes": database.common.safeSuffixes || {},
                "sameacct": sameacct,
                "bg": bg,
            });
            if (logging) console.log("popup siteData resolve mouseleaveResolver", response, resolvers);
            if (resolvers.mouseleaveResolver) resolvers.mouseleaveResolver("mouseleavePromise");
        } catch (error) {
            console.error("Error sending siteData message:", error);
        }
    } else {
        if (logging) console.log("popup no bg.settings mouseleave resolve", resolvers);
        if (resolvers.mouseleaveResolver) resolvers.mouseleaveResolver("mouseleavePromise");
    }
}
$title.onclick = function () {
    window.open("https://sitepassword.info", "_blank", "noopener,noreferrer");
}
// Domain Name
// There are no actions the user can take on the domain name field,
// but I need this handler for testing.
$domainname.onblur = async function (e) {
    $sitename.value = "";
    if (testMode) domainname = $domainname.value;
    await getsettings(domainname);
    await fill();
    if (resolvers.domainnameblurResolver) resolvers.domainnameblurResolver("domainnameblurPromise");
}
$domainnamemenu.onmouseleave = function (e) {
    menuOff("domainname", e);
}
$domainname3bluedots.onmouseover = function (e) {
    let domainname = $domainname.value;
    if (domainname) {
        $domainnamemenuforget.style.opacity = "1";
    } else {
        $domainnamemenuforget.style.opacity = "0.5";
    }
    menuOn("domainname", e);
}
$domainname3bluedots.onclick = $domainname3bluedots.onmouseover;
$domainname3bluedots.onmouseout = function (e) {
    const relatedTarget = e.relatedTarget || e.toElement;
    if (!relatedTarget || !$domainnamemenu.contains(relatedTarget)) {
        menuOff("domainname", e);
    }
};
$domainnamemenuforget.onclick = function (e) {
    if (!$domainname.value) return;
    msgon("forget");
    let toforget = normalize($domainname.value);
    addForgetItem(toforget);
}
$domainnamemenuhelp.onclick = function (e) {
    helpItemOn("domainname");
}
$domainnamehelptextclose.onclick = function (e) {
    helpAllOff();
}
$domainnamehelptextmore.onclick = function (e) {
    helpAllOff();
    sectionClick("domainname");
}
// Super Password
$superpw.onkeyup = async function (e) {
    // Start the reminder clock ticking
    await chrome.storage.local.set({"reminder": Date.now()});
    bg.superpw = $superpw.value || "";
    await ask2generate()
    setMeter("superpw");
    setMeter("sitepw");
    await handlekeyup(e, "superpw");
    if (resolvers.superpwkeyupResolver) resolvers.superpwkeyupResolver("superpwkeyupPromise");
}
$superpw.onblur = async function (e) {
    if (logging) console.log("popup superpw onmouseout");
    await handleblur(e, "superpw");
    await changePlaceholder();
    if (resolvers.superpwblurResolve) resolvers.superpwblurResolver("superpwblurPromise");
}
$superpwmenu.onmouseleave = function (e) {
    menuOff("superpw", e);
}
$superpw3bluedots.onmouseover = function (e) {
    if ($superpw.value) {
        $superpwmenushow.style.opacity = "1";
        $superpwmenuhide.style.opacity = "1";
    } else {
        $superpwmenushow.style.opacity = "0.5";
        $superpwmenuhide.style.opacity = "0.5";
    }
    menuOn("superpw", e);      
}
$superpw3bluedots.onclick = $superpw3bluedots.onmouseover;
$superpw3bluedots.onmouseout = function (e) {
    const relatedTarget = e.relatedTarget || e.toElement;
    if (!relatedTarget || !$superpwmenu.contains(relatedTarget)) {
        menuOff("superpw", e);
    }
};
$superpwmenushow.onclick = function(e) {
    if (!$superpw.value) return;
    $superpw.type = "text";
    $superpwmenuhide.classList.toggle("nodisplay");
    $superpwmenushow.classList.toggle("nodisplay")    ;
}
$superpwmenuhide.onclick = function(e) {
    if (!$superpw.value) return;
    $superpw.type = "password";
    $superpwmenuhide.classList.toggle("nodisplay");
    $superpwmenushow.classList.toggle("nodisplay")    ;
}
$superpwmenuhelp.onclick = function (e) {
    helpItemOn("superpw");
}
$superpwhelptextclose.onclick = function (e) {
    helpAllOff();
}
$superpwhelptextmore.onclick = function (e) {
    helpAllOff;
    sectionClick("superpw");
}
// Site Name
$sitename.onfocus = function (e) {
    let set = new Set();
    let value = normalize($sitename.value);
    Object.keys(database.sites).forEach((sitename) => {
        let site = database.sites[normalize(sitename)].sitename;
        if (!value || normalize(site).startsWith(value)) set.add(site);
    })
    let list = sortList([... set]);
    if (logging) console.log("popup sitename onfocus", database.sites, list);
    setupdatalist(this, list);
}
$sitename.onkeyup = async function (e) {
    showWarning = false;
    await handlekeyup(e, "sitename");
    clearDatalist("sitenames");
    $sitename.onfocus(); // So it runs in the same turn
    if (resolvers.sitenamekeyupResolver) resolvers.sitenamekeyupResolver("sitenamekeyupPromise");
}
$sitename.onblur = async function (e) {
    showWarning = true;
    let sitename = $sitename.value;
    let d = await getPhishingDomain(sitename);
    if (!openPhishingWarning(d)) {
        msgoff("phishing");
        $superpw.disabled = false;
        $username.disabled = false;
        let isChanged = sitename !== bg.settings.sitename;
        await handleblur(e, "sitename");
        await changePlaceholder();
        if (isChanged) {
            bg.settings = clone(database.sites[normalize(sitename)] || bg.settings || bgDefault.settings);
            $sitename.value = bg.settings.sitename || sitename;
            $username.value = bg.settings.username || $username.value;
            await ask2generate();
        }
    }
    clearDatalist("sitenames");
    if (resolvers.sitenameblurResolver) resolvers.sitenameblurResolver("sitenameblurPromise");
}
$sitename3bluedots.onmouseover = function (e) {
    if ($sitename.value) {
        $sitenamemenuforget.style.opacity = "1";
        $sitenamemenuaccount.style.opacity = "1";
    } else {
        $sitenamemenuforget.style.opacity = "0.5";
        $sitenamemenuaccount.style.opacity = "0.5";
    }
    menuOn("sitename", e);
}
$sitename3bluedots.onclick = $sitename3bluedots.onmouseover;
$sitename3bluedots.onmouseout = function (e) {
    const relatedTarget = e.relatedTarget || e.toElement;
    if (!relatedTarget || !$sitenamemenu.contains(relatedTarget)) {
        menuOff("sitename", e);
    }
};
$sitenamemenu.onmouseleave = function (e) {
    menuOff("sitename", e);
}
$accountnicknameinput.onkeyup = function (e) {
    if ($accountnicknameinput.value && $accountnicknameinput.value !== $sitename.value) {
        $accountnicknamesavebutton.disabled = false;
    } else {
        $accountnicknamesavebutton.disabled = true;
    }
}
$accountnicknamesavebutton.onclick = function (e) {
    if (!$accountnicknameinput.value) return;
    $sitename.value = $accountnicknameinput.value;
    sameacct = true;
    $sitename.onblur(); // So it runs in the same turn
    msgoff("account");
    autoclose = true;
}
$accountnicknamecancelbutton.onclick = function (e) {
    msgoff("account");
    autoclose = false;
}
$accountnicknamenewbutton.onclick = function (e) {
    $sitename.value = $accountnicknameinput.value;
    $sitename.onblur(); // So it runs in the same turn
    msgoff("account");
    autoclose = true;
    sameacct = false;
}
$sitenamemenuforget.onclick = function (e) {
    if (!$sitename.value) return;
    addForgetItem(normalize($domainname.value));
    msgon("forget");
    let toforget = normalize($sitename.value);
    for (let domain in database.domains) {
        if (normalize(database.domains[domain]) === toforget) {
            addForgetItem(domain);
        }
    }
}
$sitenamemenuaccount.onclick = function (e) {
    $sitepwmenuaccount.onclick(); // So it runs in the same turn
}
$sitenamemenuhelp.onclick = function (e) {
    helpItemOn("sitename");
}
$sitenamehelptextclose.onclick = function (e) {
    helpAllOff();
}
$sitenamehelptextmore.onclick = function (e) {
    helpAllOff();
    sectionClick("sitename");
}
// Site Username
$username.onfocus = function (e) {
    let set = new Set();
    let value = normalize($username.value);
    Object.keys(database.sites).forEach((sitename) => {
        let username = database.sites[normalize(sitename)].username;
        if (!value || normalize(username).startsWith(value)) set.add(username.trim());
    })
    let list = sortList([... set]);
    setupdatalist(this, list);
}
$username.onkeyup = async function (e) {
    await handlekeyup(e, "username");
    clearDatalist("usernames");
    $username.onfocus();
    if (resolvers.usernamekeyupResolver) resolvers.usernamekeyupResolver("usernamekeyupPromise");
}
$username.onblur = async function (e) {
    handleblur(e, "username");
    clearDatalist("usernames");
    await changePlaceholder();
}
$usernamemenu.onmouseleave = function (e) {
    menuOff("username", e);
}
$username3bluedots.onmouseover = function (e) {
    let username = $username.value;
    if (username) {
        $usernamemenuforget.style.opacity = "1";
        $usernamemenucopy.style.opacity = "1";
    } else {
        $usernamemenuforget.style.opacity = "0.5";
        $usernamemenucopy.style.opacity = "0.5";
    }
    menuOn("username", e);
}
$username3bluedots.onclick = $username3bluedots.onmouseover;
$username3bluedots.onmouseout = function (e) {
    const relatedTarget = e.relatedTarget || e.toElement;
    if (!relatedTarget || !$usernamemenu.contains(relatedTarget)) {
        menuOff("username", e);
    }
};
$usernamemenuforget.onclick = function (e) {
    if (!$username.value) return;
    addForgetItem(normalize($domainname.value));
    msgon("forget");
    let toforget = normalize($username.value);
    for (let domain in database.domains) {
        let sitename = normalize(database.domains[domain]);
        if (normalize(database.sites[sitename].username) === toforget) {
            addForgetItem(domain);
        }
    }
}
$usernamemenucopy.onclick = async function(e) {
    let username = $username.value;
    if (!username) return;
    $clearclipboard.click();
    navigator.clipboard.writeText(username).then(() => {
        if (logging) console.log("popup wrote to clipboard", username);
        copied("username");
    }).catch((e) => {
        notcopied("username");
        if (logging) console.log("popup username clipboard write failed", e);
    });
    menuOff("username", e); 
}
$usernamemenuhelp.onclick = function (e) {
    helpItemOn("username");
}
$usernamehelptextclose.onclick = function (e) {
    helpAllOff();
}
$usernamehelptextmore.onclick = function (e) {
    helpAllOff();
    sectionClick("username");
}
// Site Password
$sitepw.onblur = async function (e) {
    menuOff("sitepw", e);
    if ($sitepw.readOnly || !$sitepw.value) return;
    let provided = $sitepw.value;
    if (provided.length > bg.settings.pwlength) bg.settings.pwlength = provided.length;
    let computed = await ask2generate(bg)
    bg.settings.xor = xorStrings(provided, computed);
    if (logging) console.log("popup sitepw onblur", bg.settings.pwlength);
    saveSettings = true;
    $mainpanel.onmouseleave(e);
    if (resolvers.sitepwblurResolver) resolvers.sitepwblurResolver("sitepwblurPromise"); 
}
$sitepw.onkeyup = function (e) {
    $sitepw.onblur(e);
}
$sitepwmenu.onmouseleave = function (e) {
    menuOff("sitepw", e);
}
$sitepw3bluedots.onmouseover = function (e) {
    let sitepw = $sitepw.value;
    if (sitepw && $sitename.value) {
        $sitepwmenucopy.style.opacity = "1";
        $sitepwmenushow.style.opacity = "1";
        $sitepwmenuhide.style.opacity = "1";
        $sitepwmenuaccount.style.opacity = "1";
    } else {
        $sitepwmenucopy.style.opacity = "0.5";
        $sitepwmenushow.style.opacity = "0.5";
        $sitepwmenuhide.style.opacity = "0.5";
        $sitepwmenuaccount.style.opacity = "0.5";
    }
    menuOn("sitepw", e);
}
$sitepw3bluedots.onclick = $sitepw3bluedots.onmouseover;
$sitepw3bluedots.onmouseout = function (e) {
    const relatedTarget = e.relatedTarget || e.toElement;
    if (!relatedTarget || !$sitepwmenu.contains(relatedTarget)) {
        menuOff("sitepw", e);
    }
};
$sitepwmenuaccount.onclick = function (e) {
    // Can only change a password if there is one
    if (!$sitepw.value || !$sitename.value) return;
    let sitename = $sitename.value;
    let sitenameCount = Object.values(database.domains).filter(domainSitename => normalize(domainSitename) === normalize(sitename)).length;
    // Can only change a password if the site is in the database
    if (sitenameCount === 0) return;
    let elements = document.getElementsByName("hassuffix");
    elements.forEach(element => {
        if (sitenameCount > 1) {
            $accounttext1.innerText = $domainname.value;
            element.classList.remove("nodisplay");
        } else {
            $accounttext1.innerText = "";
            element.classList.add("nodisplay");
        }
    });
    if (logging) console.log(`The sitename "${sitename}" appears ${sitenameCount} times in the database.`);
    msgon("account");
    $accountnicknameinput.value = $sitename.value;
}
$sitepwmenucopy.onclick = async function(e) {
    let sitepw = $sitepw.value;
    if (!sitepw) return;
    navigator.clipboard.writeText(sitepw).then(async () => {
        if (logging) console.log("popup wrote to clipboard", sitepw);
        $logopw.title = "A site password may be on the clipboard."
        $logo.style.display = "none";
        $logopw.style.display = "block";
        await chrome.action.setTitle({title: "A site password may be on the clipboard."});
        await chrome.action.setIcon({"path": "images/icon128pw.png"});
        await chrome.storage.local.set({"onClipboard": true})
        copied("sitepw");
    }).catch((e) => {
        notcopied("sitepw");
        if (logging) console.log("popup sitepw clipboard write failed", e);
    });
    menuOff("sitepw", e);
}
$sitepwmenuhelp.onclick = function (e) {
    helpItemOn("sitepw");
}
$sitepwhelptextclose.onclick = function (e) {
    helpAllOff();
}
$sitepwhelptextmore.onclick = function (e) {
    helpAllOff();
    sectionClick("sitepw");
}
$sitepwmenushow.onclick = function () {
    $sitepw.type = "text";
    $sitepwmenushow.classList.toggle("nodisplay");
    $sitepwmenuhide.classList.toggle("nodisplay");
}
$sitepwmenuhide.onclick = function () {
    $sitepw.type = "password";
    $sitepwmenushow.classList.toggle("nodisplay");
    $sitepwmenuhide.classList.toggle("nodisplay");
}
$settingsshow.onclick = showsettings;
$clearclipboard.onclick = async function() {
    if (logging) console.log("popup clear clipboard");
    try {
        await navigator.clipboard.writeText("");
        $logo.title = defaultTitle;
        $logo.style.display = "block";
        $logopw.style.display = "none";
        // Don't worry about waiting for these to complete
        await chrome.action.setTitle({title: defaultTitle});
        await chrome.storage.local.set({"onClipboard": false});
        await chrome.action.setIcon({"path": "../images/icon128.png"});
    } catch(e) {
        if (logging) console.log("popup clear clipboard failed", e);
    }
}
document.oncopy = function (e) {
    if (e.target.id !== "sitepw") {
        $clearclipboard.onclick;
    } else {
        $sitepwmenucopy.click();
    }
}
$settingssave.onclick = hidesettings;
$providesitepw.onclick = async function (e) {
    if (!($sitename.value && $username.value)) return;
    if ($providesitepw.checked) {
        $sitepw.readOnly = false;
        $sitepw.value = "";
        $sitepw.focus();
        $sitepw.style.backgroundColor = "white";
        $sitepwmenushow.classList.remove("menu-icon-blue");
        $sitepwmenuhide.classList.remove("menu-icon-blue");
        $sitepwmenucopy.classList.remove("menu-icon-blue");
        $sitepwmenuhelp.classList.remove("menu-icon-blue");
        $sitepw.placeholder = "Enter your site password";
        await Promise.resolve(); // To match the await of the other branch
    } else {
        $sitepw.readOnly = true;
        $sitepw.style.backgroundColor = "rgb(136, 204, 255, 20%)";
        $sitepwmenushow.classList.add("menu-icon-blue");
        $sitepwmenuhide.classList.add("menu-icon-blue");
        $sitepwmenucopy.classList.add("menu-icon-blue");
        $sitepwmenuhelp.classList.add("menu-icon-blue");
        $sitepw.placeholder = "Your site password";
        bg.settings.pwlength = database.common.defaultSettings.pwlength;
        $pwlength.value = bg.settings.pwlength;
    }
    await handleblur(e, "providesitepw");
    if (resolvers.providesitepwResolver) resolvers.providesitepwResolver("providesitepwPromise");
}
$clearsuperpw.onclick = function () {
    database.clearsuperpw = $clearsuperpw.checked;
    if (resolvers.clearsuperpwResolver) resolvers.clearsuperpwResolver("clearsuperpwPromise");
}
$hidesitepw.onclick = function () {
    database.hidesitepw = $hidesitepw.checked;
    hidesitepw();
    if (resolvers.hidesitepwResolver) resolvers.hidesitepwResolver("hidesitepwPromise");
}
$pwlength.onmouseout = async function (e) {
    await handleblur(e, "pwlength");
    if (resolvers.pwlengthblurResolver) resolvers.pwlengthblurPromise("pwlengthblurPromise");
}
$pwlength.onblur = async function (e) {
    await handleblur(e, "pwlength");
    if (resolvers.pwlengthblurResolver) resolvers.pwlengthblurResolver("pwlengthblurPromise");
}
$pwlength.onkeyup = async function(e) { 
    handlekeyupnopw(e, "pwlength");
}; 
$startwithletter.onclick = function (e) {
    handleblur(e, "startwithletter");
}
$allowlowercheckbox.onclick = function (e) {
    restrictStartsWithLetter();
    $minlower.disabled = false;
    handleclick(e, "lower");
}
$allowuppercheckbox.onclick = function (e) {
    restrictStartsWithLetter();
    handleclick(e, "upper");
}
$allownumbercheckbox.onclick = function (e) {
    handleclick(e, "number");
}
$allowspecialcheckbox.onclick = async function (e) {
    await handleclick(e, "special");
    if (resolvers.allowspecialclickResolver) resolvers.allowspecialclickResolver("allowspecialclickPromise");
}
$minlower.onmouseout = function (e) {
    handleblur(e, "minlower");
}
$minlower.onblur = function (e) {
    handleblur(e, "minlower");
}
$minlower.onkeyup = async function(e) { 
    handlekeyupnopw(e, "minlower");
}
$minupper.onmouseout = function (e) {
    handleblur(e, "minupper");
}
$minupper.onblur = function (e) {
    handleblur(e, "minupper");
}
$minupper.onkeyup = async function(e) { 
    bg.settings.minupper = $minupper.value;
    $mainpanel.onmouseleave(e); // Force save while typing
}; 
$minnumber.onmouseout = function (e) {
    handleblur(e, "minnumber");
}
$minnumber.onblur = function (e) {
    handleblur(e, "minnumber");
}
$minnumber.onkeyup = async function(e) { 
    handlekeyupnopw(e, "minnumber");
} 
$minspecial.onmouseout = function (e) {
    handleblur(e, "minspecial");
}
$minspecial.onblur = function (e) {
    handleblur(e, "minspecial");
}
$minspecial.onkeyup = async function(e) { 
    handlekeyupnopw(e, "minspecial");
}
// In an older version I needed to limit the number of 
// specials because generate() computed a number between 
// 0 and 63 to index into the characters array.  That's 
// no longer the case, but I don't want to risk
// generating different passwords.
const alphanumerics = /[0-9A-Za-z]/g;
$specials.onblur = async function(e) {
    $specials.value = $specials.value
        .replace(alphanumerics, '')  // eliminate alphanumerics and spaces
        .replace(/\s+/g, "") // eliminate spaces
        .replace(/[^ -~]/g, "") // eliminate non-printable characters
        .substring(0, 12);  // limit to 12 specials
    $specials.value = [...new Set($specials.value.split(""))].join(""); // eliminate duplicates
    if (!$specials.value) {
        alert("You must enter at least one special character.");
        $specials.value = database.common.defaultSettings.specials;
        return;
    }
    bg.settings.specials = $specials.value;
    await handlekeyup(e, "specials");
    if (resolvers.specialsblurResolver) resolvers.specialsblurResolver("specialsblurPromise");
}
$specials.onmouseleave = async function(e) {
    await $specials.onblur(e); // So it runs in the same turn
}
$specials.onkeyup = async function(e) { 
    handlekeyupnopw(e, "specials");
} 
$makedefaultbutton.onclick = async function () {
    let newDefaults = {
        sitename: "",
        username: "",
        providesitepw: false,
        xor: new Array(12).fill(0),
        domainname: "",
        pwdomainname: "",
        pwlength: $pwlength.value,
        providesitepw: $providesitepw.checked,
        startwithletter: $startwithletter.checked,
        allowlower: $allowlowercheckbox.checked,
        allowupper: $allowuppercheckbox.checked,
        allownumber: $allownumbercheckbox.checked,
        allowspecial: $allowspecialcheckbox.checked,
        minlower: $minlower.value,
        minupper: $minupper.value,
        minnumber: $minnumber.value,
        minspecial: $minspecial.value,
        specials: $specials.value,
    }
    try {
        await retrySendMessage({"cmd": "newDefaults", "newDefaults": newDefaults});
    } catch (error) {
        console.error("Error sending newDefaults message:", error);
    }
    if (logging) console.log("popup newDefaults sent", newDefaults);
    if (resolvers.makedefaultResolver) resolvers.makedefaultResolver("makedefaultbuttonPromise");
}
$sitedatagetbutton.onclick = sitedataHTML;
$exportbutton.onclick = exportPasswords;
$maininfo.onclick = function () {
    if ($instructionpanel.style.display == "none") {
        showInstructions();
        hidesettings();
        helpAllOff();
    } else {
        hideInstructions();
    }
    autoclose = false;
}
// Phishing buttons
$cancelwarning.onclick = async function (e) {
    msgoff("phishing");
    $domainnamemenuforget.onclick(); // So it runs in the same turn
    $forgetbutton.onclick(e); // So it runs in the same turn
    $domainname.value = "";
    $sitename.value = "";
    $username.value = "";
    sameacct = false;
    if (resolvers.cancelwarningResolver) resolvers.cancelwarningResolver("cancelwarningPromise");
}
$sameacctbutton.onclick = async function (e) {
    $superpw.disabled = false;
    $username.disabled = false;
    $sitename.disabled = false;
    msgoff("phishing");
    let domainname = $domainname.value;
    let sitename = normalize($sitename.value);
    if (testMode) {
        bg.settings.domainname = domainname;
        database.sites[sitename].domainname = domainname;
    }
    let d = await getPhishingDomain(bg.settings.sitename);
    let suffix = commonSuffix(d, bg.domainname);
    if (suffix && !database.common.safeSuffixes[suffix]) {
            database.common.safeSuffixes[suffix] = sitename;
    }
    bg.settings = clone(database.sites[sitename]);
    bg.settings.sitename = $sitename.value;
    if (testMode) bg.settings.domainname = $domainname.value;
    database.domains[$domainname.value] = bg.settings.sitename;
    $username.value = bg.settings.username;
    await ask2generate();
    autoclose = false;
    saveSettings = true;
    sameacct = true;
    $mainpanel.onmouseleave(e); // So it runs in the same turn
    if (resolvers.sameacctbuttonResolver) resolvers.sameacctbuttonResolver("sameacctbuttonPromise");
}
$nicknamebutton.onclick = function (e) {
    $superpw.disabled = false;
    $sitename.disabled = false;
    $username.disabled = false;
    $sitename.focus();
    clearDatalist("sitenames");
    msgoff("phishing");
    saveSettings = false;
    autoclose = false;
    sameacct = false;
}
// Phishing methods when there is a safe suffix
$suffixcancelbutton.onclick = function (e) {
    msgoff("suffix");
    $superpw.disabled = false;
    $sitename.disabled = false;
    $username.disabled = false;
    $sitename.focus();
    saveSettings = false;
    autoclose = false;
}
$suffixacceptbutton.onclick = async function (e) {
    msgoff("suffix");
    await $sameacctbutton.onclick(e); // So it runs in the same turn
    if (resolvers.suffixacceptbuttonResolver) resolvers.suffixacceptbuttonResolver("suffixacceptbuttonPromise");
}
// Forget buttons
$forgetbutton.onclick = async function (e) {
    if (logging) console.log("popup forgetbutton");
    let list = [];
    let children = $toforgetlist.children;
    for (let child of children) {
        list.push(child.innerText);
    }
    delete database.domains[get("domainname").value];
    delete database.sites[normalize($sitename.value)];
    $sitename.value = "";
    $username.value = "";
    let superpw = bg.superpw;
    if (logging) console.log("popup forgetbuttononclick", isSuperPw(superpw));
    bg = clone(bgDefault);
    bg.superpw = superpw;
    if (logging) console.log("popup forgetbutton sending forget", list);
    try {
        let response = await retrySendMessage({"cmd": "forget", "toforget": list});
        if (logging) console.log("popup forget response", response);
        if (resolvers.forgetclickResolver) resolvers.forgetclickResolver("forgetClickPromise");
        $forgetcancelbutton.click();
    } catch (error) {
        console.error("Error sending forget message:", error);
    }
}
$forgetcancelbutton.onclick = function () {
    // Can't just set list to [] because I need to remove the 
    // corresponding DOM elements
    while ( $toforgetlist.firstChild ) {
        $toforgetlist.removeChild($toforgetlist.firstChild);
    }
    msgoff("forget");
    defaultfocus();
    autoclose = false;
    saveSettings = false;
}
// Handle external links in the instructions and help
document.addEventListener('DOMContentLoaded', function () {
    var links = document.querySelectorAll('.external-link');
    links.forEach(function(link) {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            chrome.tabs.create({url: this.href});
        });
    });
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
    $domainnamemenu.style.display = "none";
    $superpwmenu.style.display = "none";
    $sitenamemenu.style.display = "none";
    $usernamemenu.style.display = "none";
    $sitepwmenu.style.display = "none";
}
function dotsAllOn() {
    $domainname3bluedots.style.display = "block";
    $superpw3bluedots.style.display = "block";
    $sitename3bluedots.style.display = "block";
    $username3bluedots.style.display = "block";
    $sitepw3bluedots.style.display = "block";
}
function helpItemOn(which) {
    let $element = get(which + "helptext");
    if (!$element.style.display || $element.style.display === "none") {
        helpAllOff();
        $helptext.style.display = "block";
        $element.style.display = "block";
        hideInstructions();
        hidesettings();
        autoclose = false;
    } else {
        helpAllOff();
    }
}
function helpItemOff(which) {
    $helptext.style.display = "none";
    get(which).style.display = "none";
    autoclose = false;
    saveSettings = false;
}
function helpAllOff() {
    let helps = document.getElementsByName("help");
    for (let help of helps) {
        helpItemOff(help.id); 
    } 
}
function hidesitepw() {
    if (logging) console.log("popup checking hidesitepw", $hidesitepw.checked, database.hidesitepw);
    if ($hidesitepw.checked || (database && database.hidesitepw)) {
        $sitepw.type = "password";
        $sitepwmenushow.classList.remove("nodisplay");
        $sitepwmenuhide.classList.add("nodisplay");
    } else {
        $sitepw.type = "text";
        $sitepwmenushow.classList.add("nodisplay");
        $sitepwmenuhide.classList.remove("nodisplay");
    }
}
function showInstructions() {
    helpAllOff();
    autoclose = false;
    $instructionpanel.style.display = "block";
    $maininfo.title = "Close Instructions";
    $instructionopen.classList.add("nodisplay");
    $instructionclose.classList.remove("nodisplay");
    // I need to adjust the width of the main panel when the scrollbar appears.
}
function hideInstructions() {
    autoclose = true;
    closeAllInstructions();
    $instructionpanel.style.display = "none";
    $maininfo.title = "Open Instructions";
    $instructionopen.classList.remove("nodisplay");
    $instructionclose.classList.add("nodisplay");
    // I need to adjust the width of the main panel when the scrollbar disappears.
    $main.style.padding = "6px " + scrollbarWidth() + "px 9px 12px";
}
// End of generic code for menus: other utility functions
async function getPhishingDomain(sitename) {
    let sitenamenorm = normalize(sitename);
    let domainname = $domainname.value;
    if (!domainname) return ""; // No domain name to check
    // Can't be phishing if the domain name is in the database with tshis sitename,
    if (!sitenamenorm || normalize(database.domains[domainname]) === sitenamenorm) return "";
    let settings = database.sites[sitenamenorm];
    if (!settings) return ""; // No settings for this sitename
    let domains = Object.keys(database.domains);
    let phishing = "";
    domains.forEach(function (d) {
        if (normalize(database.domains[d]) === sitenamenorm) {
            if (d !== domainname) {
                if (settings.pwdomainname && settings.domainname !== settings.pwdomainname) {
                    if (!phishing || settings.pwdomainname.length < phishing.length) phishing = settings.pwdomainname;
                } else {
                    if (!phishing || d.length < phishing.length) phishing = d;
                }
            }
        }
    });
    return phishing;
}
function openPhishingWarning(d) {
    if (!d) return false;
    if (isSharedCredentials(d, $domainname.value)) {
        $sameacctbutton.onclick(); // So it runs in the same turn
        return false;
    }
    if (!showWarning) return false;
    let domainname = $domainname.value;
    let suffix = commonSuffix(d, domainname);
    if (database.common.safeSuffixes[suffix]) {
        $suffixtext0.innerText = $sitename.value;
        $suffixtext1.innerText = suffix;
        $suffixtext2.innerText = domainname;
        msgon("suffix");
    } else {
        $phishingtext0.innerText = $sitename.value;
        $phishingtext1.innerText = d;
        $phishingtext2.innerText = domainname;
        msgon("phishing");
    }
    $superpw.disabled = true;
    $sitename.disabled = true;
    $username.disabled = true;
    $sitepw.value = "";
    hidesettings();
    return true;
}
// Thanks, Copilot
export function commonSuffix(domain1, domain2) {
    const parts1 = domain1.split('.').reverse();
    const parts2 = domain2.split('.').reverse();
    const length = Math.min(parts1.length, parts2.length);
    let suffix = [];
    for (let i = 0; i < length; i++) {
        if (parts1[i] === parts2[i]) {
            suffix.push(parts1[i]);
        } else {
            break;
        }
    }
    let common = suffix.reverse().join('.');
    if (publicSuffixSet.has(common)) return "";
    return common;
}
function sortList(list) {
    return list.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
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
    const $meter = get(which + "-strength-meter");
    const $input = get(which);
    const report = zxcvbn($input.value);
    let guesses = getGuesses(which);
    // 10^9 guesses per second, 3*10^7 seconds per year, average success in 1/2 the tries
    let years = guesses/(1e9*3e7*2);
    if (which === "superpw") years /= 16*1024; // So the superpw will have more entropy than the site password
    let score = getScore(years);
    let index = Math.floor(score/5);
    $meter.value = ($input.value && score) ? score : 1;
    $meter.style.setProperty("--meter-value-color", strengthColor[index]);
    $meter.title = strengthText[index] + guessLabel(years);
    $input.style.color = strengthColor[index];
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
            let chars = $superpw.value.split("");
            if (chars.some(char => config.lower.includes(char))) alphabetSize += 26;
            if (chars.some(char => config.upper.includes(char))) alphabetSize += 26;
            if (chars.some(char => config.digits.includes(char))) alphabetSize += 10;
            if (chars.some(char => "~!@#$%^&*()_+-=[]\\{}|;':\",./<>? ".includes(char))) alphabetSize += 32;
        } else {
            if ($allowlowercheckbox.checked) alphabetSize += 26;
            if ($allowuppercheckbox.checked) alphabetSize += 26;
            if ($allownumbercheckbox.checked) alphabetSize += 10;
            if ($allowspecialcheckbox.checked) alphabetSize += $specials.value.length;
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
    $mainpanel.onmouseleave(event); // Force save while typing
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
            $startwithletter.checked = false;
        }
    } else if (element === "startwithletter") {
        bg.settings.startwithletter = $startwithletter.checked;
    } else if (element === "providesitepw") {
        bg.settings.providesitepw = $providesitepw.checked;
    } else {
        bg.settings[element] = get(element).value;
    }
    if ($superpw.value && $sitename.value && $username.value) {
        $providesitepw.disabled = false;
    } else {
        $providesitepw.disabled = true;
    }
    bg.settings.characters = characters(bg.settings, database);
    let pw = await ask2generate()
    setMeter("superpw");
    setMeter("sitepw");
    updateExportButton(); 
    let u = $username.value || "";
    let readyForClick = !!(pw && $superpw.value && u);
    if (isUrlMatch(activetab.url)) {
        try {
            await chrome.tabs.sendMessage(activetab.id, { "cmd": "update", "u": u, "p": "", "readyForClick": readyForClick });
        } catch (error) {
            if (logging) console.error("popup handleblur error", error);
        }
    }
    if (logging) console.log(Date.now(), "popup handleblur timeout");
    await changePlaceholder();
    await $mainpanel.onmouseleave(event); 
}
async function handleclick(e, which) {
    let element = "allow" + which;
    bg.settings[element] = get(element + "checkbox").checked;
    pwoptions([which]);
    if (!(bg.settings.allowupper || bg.settings.allowlower)) {
        bg.settings.startwithletter = false;
        $startwithletter.checked = false;
    }
    handleblur(e, element);
}
async function changePlaceholder() {
    let p = $superpw.value || "";
    let n = $sitename.value || "";
    let u = $username.value || "";
    let readyForClick = false;
    if (get("superpw").value && u) readyForClick = true;
    if (isUrlMatch(activetab.url)) {
        try {
            await chrome.tabs.sendMessage(activetab.id, { "cmd": "fillfields", "u": u, "p": "", "readyForClick": readyForClick });
        } catch (error) {
            if (logging) console.error("popup changePlaceholder error", error);
        }
    }
}
function defaultfocus() {
    if (!$username.value) $username.focus();
    if (!$sitename.value) $sitename.focus();
    if (!$superpw.value) $superpw.focus();
}
async function ask2generate() {
    if (!(bg.settings || bg.settings.allowlower || bg.settings.allownumber)) {
        msgon("nopw");
        computed = "";
        Promise.resolve(); // To match the await in the other branch
    } else {
        msgoff("nopw"); // I don't want to hide any other open messages
        const computed = await generatePassword(bg);
        if (computed) {
            msgoff("nopw"); // I don't want to hide any other open messages
        } else {
            if ($superpw.value) {
                msgon("nopw");
            }
        }
        let provided = stringXorArray(computed, bg.settings.xor);
        if (logging) console.log("popup filling sitepw field", computed, provided, bg.settings.xor);
        if (document.activeElement !== $sitepw) $sitepw.value = provided;
        hidesitepw();
        setMeter("sitepw");
        return computed;
    }
}
async function fill() {
    if (bg.settings[domainname]) {
        if (!$username.value) $username.value = bg.settings.username;
        if (!$sitename.value) $sitename.value = bg.settings.sitename;
    } else {
        bg.settings.domainname = normalize($domainname.value);
        bg.settings.sitename = normalize($sitename.value);
        bg.settings.username = normalize($username.value);
    }
    $superpw.value = bg.superpw || "";
    $providesitepw.checked = bg.settings.providesitepw;
    if (logging) console.log("popup fill with", bg.domainname, isSuperPw(bg.superpw), bg.settings.sitename, bg.settings.username);
    if ($superpw.value && $sitename.value && $username.value) {
        $providesitepw.disabled = false;
        $providesitepwlabel.style.opacity = 1.0;
    } else {
        $providesitepw.disabled = true;
        $providesitepwlabel.style.opacity = 0.5;
    }
    if ($providesitepw.checked && $superpw.value && $sitename.value && $username.value) {
        $sitepw.readOnly = false;
        $sitepw.placeholder = "Enter your account password";
        $sitepw.style.backgroundColor = "white";
        $superpw.focus();
    } else {
        $sitepw.readOnly = true;
        $sitepw.placeholder = "Your account password";
        $sitepw.style.backgroundColor = "rgb(136, 204, 255, 20%)";
        defaultfocus();
    }
    $clearsuperpw.checked = database.common.clearsuperpw;
    $hidesitepw.checked =  database.common.hidesitepw;
    hidesitepw();
    $pwlength.value = bg.settings.pwlength;
    $startwithletter.checked = bg.settings.startwithletter;
    $allowlowercheckbox.checked = bg.settings.allowlower;
    $allowuppercheckbox.checked = bg.settings.allowupper;
    $allownumbercheckbox.checked = bg.settings.allownumber;
    $allowspecialcheckbox.checked = bg.settings.allowspecial;
    $minnumber.value = bg.settings.minnumber;
    $minlower.value = bg.settings.minlower;
    $minupper.value = bg.settings.minupper;
    $minspecial.value = bg.settings.minspecial;
    $specials.value = bg.settings.specials;
    restrictStartsWithLetter();
    await ask2generate();
}
function restrictStartsWithLetter() {
    if (!($allowlowercheckbox.checked || $allowuppercheckbox.checked)) {
        $startwithletter.disabled = true;
    } else {
        $startwithletter.disabled = false;
    }
}
async function showsettings() {
    $settingsshow.style.display = "none";
    $settingssave.style.display = "inline";
    $settings.style.display = "block";
    helpAllOff();
    hideInstructions();
    let height = $settings.getBoundingClientRect().height;
    $main.style.height = height + "px";
    $superpw.value = bg.superpw || "";
    await fill();
    pwoptions(["lower", "upper", "number", "special"]);
    if (resolvers.settingsshowResolver) resolvers.settingsshowResolver("settingsshowPromise");
}
function hidesettings() {
    $settingsshow.style.display = "inline";
    $settingssave.style.display = "none";
    $settings.style.display = "none";
    let height = mainHeight();
    $main.style.height = height + "px";
    saveSettings = false;
}
function pwoptions(options) {
    for (var x in options) {
        var which = options[x];
        var allow = get("allow" + which);
        var require = get("require" + which);
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
    if ($superpw.value) {
        $exportbutton.disabled = false;
        $exportbutton.title = "Export your site passwords";
    } else {
        $exportbutton.disabled = true;
        $exportbutton.title = "Enter your super password to export your site passwords";
    }
}
async function exportPasswords() {
    if (!$superpw.value) return;
    // I would normally set autoclose to false, but it gets turned 
    // back to true in message(), which is called from ask2generate().
    exporting = true;
    // I need the try block to put exporting back to false if there is an error
    try {
        let exportbutton = $exportbutton;
        exportbutton.innerText = "Exporting...";
        let domainnames = database.domains;
        let sorted = Object.keys(domainnames).sort(function (x, y) {
            if (x.toLowerCase() < y.toLowerCase()) return -1;
            if (x.toLowerCase() == y.toLowerCase()) return 0;
            return 1;
        });
        let olddomainname = $domainname.value;
        let oldsitename = $sitename.value;
        let oldusername = $username.value;
        let oldsettings = clone(bg.settings);
        let data = "Domain Name, Site Name, User Name, Site Password\n";
        for (let domainname of sorted) {
            let sitename = database.domains[domainname];
            let settings = database.sites[sitename];
            let username = settings.username;
            bg.settings = settings;
            $domainname.value = domainname;
            $sitename.value = sitename;
            $username.value = username;
            try {
                let sitepw = await ask2generate();
                data += '"' + domainname + '"' + "," + '"' + sitename + '"' + "," + '"' + username + '"' + "," + '"' + sitepw + '"' + "\n";
            } catch (e) {
                console.log("popup exportPasswords error", e);
            }
        }
        bg.settings = oldsettings;
        $sitename.value = oldsitename;
        $username.value = oldusername;
        $domainname.value = olddomainname;
        let blob = new Blob([data], {type: "text/csv"});
        let url = URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.href = url;
        link.download = "SitePasswordExport.csv";
        document.body.appendChild(link);
        link.click();    
        document.body.removeChild(link);
        exporting = false;
        await ask2generate(); // To get the right password to show up
    } catch (e) {
        alert("Export error: Close SitePassword and try again.");
        console.log("popup exportPasswords error", e);
        $exportbutton.innerText = "Export passwords";
        exporting = false;
    }
}
async function sitedataHTML() {
    var domainnames = database.domains
    var sorted = Object.keys(domainnames).sort(function (x, y) {
        if (x.toLowerCase() < y.toLowerCase()) return -1;
        if (x.toLowerCase() == y.toLowerCase()) return 0;
        return 1;
    });
    let workingdoc = document.implementation.createHTMLDocument("SitePassword Data");
    let doc = sitedataHTMLDoc(workingdoc, sorted);
    let html = new XMLSerializer().serializeToString(doc);
    let blob = new Blob([html], {type: "text/html"});
    let url = URL.createObjectURL(blob);
    let $data = get("data");
    $data.href = url;
    try {
        $data.click();
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
                const aColText = a.querySelector(\`td:nth-child(\${which + 1})\`).innerText.trim().toLowerCase();
                const bColText = b.querySelector(\`td:nth-child(\${which + 1})\`).innerText.trim().toLowerCase();
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
        let sitename = database.domains[domainname];
        let s = database.sites[normalize(sitename)];
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
    let $list = $toforgetlist;
    let inlist = Array.from($list.children).some(child => child.innerText === domainname);
    if (inlist) return;
    let $item = document.createElement("li");
    $item.innerText = domainname;
    $list.appendChild($item);
    let array = Array.from($list.children);
    array.sort((a, b) => a.innerText.localeCompare(b.innerText));
    while ($list.firstChild) $list.removeChild($list.firstChild);
    array.forEach(item => $list.appendChild(item));
}
function get(element) {
    return document.getElementById(element);
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
var warnings = [
    { name: "forget", ison: false, transient: false },
    { name: "phishing", ison: false, transient: false },
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
    if (turnon && !showWarning) return;
    var ison = false;
    for (var i = 0; i < warnings.length; i++) {
        var msg = warnings[i];
        if (msg.name == msgname) msg.ison = turnon;
        get(msg.name).style.display = msg.ison ? "block" : "none";
        if (ison) get(msg.name).style.display = "none";
        ison = ison || msg.ison;
    }
    if (ison) {
        $warnings.style.display = "block";
    } else {
        $warnings.style.display = "none";
    }
    let height = mainHeight();
    $main.style.height = height + "px";
    $instructionpanel.style.height = height + "px";
    if (height <= 575) $main.style.padding = "6px " + scrollbarWidth() + "px 9px 12px";
    warningMsg = ison;
    autoclose = !ison;
}
function mainHeight() {
    let padding = $main.style.padding.split(" ");
    let topMargin = parseInt(padding[0]);
    let bottomMargin = parseInt(padding[2]);
    let bottom = $bottom.getBoundingClientRect().bottom + bottomMargin;
    let top = $top.getBoundingClientRect().top - topMargin;
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
        }
    }
}
// Handle all sections of the instructions
function instructionSetup() {
    let instructions = document.getElementsByName("instructions");
    if (logging) console.log("popup instructions", instructions);
    for (let instruction of instructions) {
        let section = instruction.id.replace("info", "");
        if (section === "shared" && isSafari) {
            $sharedinfo.style.display = "none";
        } else if (section === "sync") {
            if (!isSafari) {
                instruction.onclick = function () { sectionClick("sync"); }
            } else {
                instruction.onclick = function () { sectionClick("syncSafari"); }
            }
        } else if (section === "extension") {
            if (!isSafari) {
                instruction.onclick = function () { sectionClick("extension"); }
            } else {
                instruction.onclick = function () { sectionClick("extensionSafari"); }
            }
        } else {
            instruction.onclick = function () { sectionClick(section); }
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
    saveSettings = false;
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
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await chrome.runtime.sendMessage(message);
            return response; // Message sent successfully
        } catch (error) {
            console.log(`popup attempt ${attempt} failed:`, error);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
            } else {
                if (!error.includes("Could not establish connection")) {
                    throw new Error(`Failed to send message ${message} after ${retries} attempts`);
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