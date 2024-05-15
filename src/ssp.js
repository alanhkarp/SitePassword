'use strict';
import { bgDefault, config, isSafari, webpage } from "./bg.js";
import { runTests, resolvers } from "./test.js";
import { characters, generatePassword, isSuperPw, normalize, stringXorArray, xorStrings } from "./generate.js";

// testMode must start as false.  Its value will come in a message from bg.js.
let testMode = false;
const debugMode = false;
const logging = false;
if (logging) console.log("Version 3.0");
let activetab;
let domainname;
let mainPanelTimer;
let autoclose = true;
let exporting = false;
const strengthText = ["Too Weak", "Very weak", "Weak", "Good", "Strong"];
const strengthColor = ["#bbb", "#f06", "#f90", "#093", "#036"]; // 0,3,6,9,C,F
const defaultTitle = "SitePassword";

let phishing = false;
let warningMsg = false;
let bg = bgDefault;

// I can't get the debugger statement to work unless I wait at least 1 second on Chrome
let timeout = testMode ? 1000 : 0;     
setTimeout(() => {
    if (debugMode) debugger;
}, timeout);
// I need all the metadata stored in database for both the phishing check
// and for downloading the site data.
let database = {};
if (logging) console.log("popup starting");
// window.onunload appears to only work for background pages, which
// no longer work.  Fortunately, using the password requires a click
// outside the popup window.  I can't use window.onblur because the 
// popup window closes before the message it sends gets delivered.

window.onload = async function () {
    if (logging) console.log("popup check clipboard");
    let v = await chrome.storage.local.get("onClipboard");
    if (v.onClipboard) {
        if (logging) console.log("popup clipboard used");
        get("logopw").title = "A site password may be on the clipboard."
        get("logo").style.display = "none";
        get("logopw").style.display = "block";
        // Don't worry about waiting for these to complete
        await chrome.action.setTitle({title: "A site password may be on the clipboard."});
        await chrome.action.setIcon({"path": "images/icon128pw.png"});
    } else {
        if (logging) console.log("popup clipboard not used");
        get("logo").title = defaultTitle;
        get("logo").style.display = "block";
        get("logopw").style.display = "none";
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
    let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activetab = tabs[0];
    if (logging) console.log("popup tab", activetab);
    let protocol = activetab.url.split(":")[0];
    if ( protocol === "file") {
        domainname = activetab.url.split("///")[1];
    } else if (protocol === "mailto") {
        domainname = activetab.url.split(":")[1];
    } else {
        domainname = activetab.url.split("/")[2]
    }
    get("domainname").value = domainname;
    // Ignore the page domain name when testing
    get("sitepw").value = "";
    if (logging) console.log("popup got tab", domainname, activetab);
    if (logging) console.log("popup getting metadata");
    instructionSetup();
    sectionrefSetup();
    await getsettings(domainname);
}
async function init() {
    get("superpw").value = bg.superpw || "";
    get("sitename").value = bg.settings.sitename || "";
    get("username").value = bg.settings.username || "";
    await fill();
    let protocol = activetab.url.split(":")[0];
    if (logging) console.log("popup testing for http", protocol);
    message("http", protocol !== "https");
    if (get("superpw").value) {
        setMeter("superpw");
        setMeter("sitepw");
    }
    get("main").style.padding = "6px " + scrollbarWidth() + "px 9px 12px";
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
        get("main").classList.remove("datalist-closed");
        get("main").classList.add("datalist-open");
    } else {
        get("main").classList.remove("datalist-open");
        get("main").classList.add("datalist-closed");
    }
}
function clearDatalist(listid) {
    let datalist = get(listid);
    if (datalist.hasChildNodes) {
        const newDatalist = datalist.cloneNode(false);
        datalist.replaceWith(newDatalist);
    }
    get("main").classList.remove("datalist-open");
    get("main").classList.add("datalist-closed");
}
export async function getsettings(testdomainname) {
    if (testMode) domainname = testdomainname;
    if (logging) console.log("popup getsettings", domainname);
    await wakeup("getsettings");
    let response =  await chrome.runtime.sendMessage({
            "cmd": "getMetadata",
            "domainname": domainname,
            "activetab": activetab
        });
    if (chrome.runtime.lastError) console.log("popup getsettings lastError", chrome.runtime.lastError);
    if (logging) console.log("popup getsettings response", response);
    if (response && response.duplicate) {
        let msg = "You have two bookmarks with the title '" + response.duplicate + "'.  Please delete one and try again.";
        alert(msg);
        return;
    }
    bg = response.bg;
    database = response.database;
    hidesitepw();
    if (!bg.settings.sitename) {
        bg.settings.sitename = "";
    }
    get("superpw").value = response.superpw || "";
    init();
    if (logging) console.log("popup got metadata", bg, database);
    message("multiple", bg.pwcount > 1);
    message("zero", bg.pwcount == 0);
    if (!testMode && response.test) { // Only run tests once
        testMode = true;
        runTests();
    }
}
//}
// This function sends a message to the service worker when the mouse leaves the 
// outermost div on the window.  When the user clicks outside the popup, the window
// loses focus and closes.  Any messages in flight will be lost.  That means there
// is a race between message delivery and the next user click.  Fortunately, messages
// are delivered in just a couple of ms, so there's no problem.  Just be aware that
// this race is the source of any problems related to loss of the message sent here.
get("root").onmouseleave = function (event) {
    // If I close the window immediately, then messages in flight get lost
    if (autoclose && !exporting && !document.elementFromPoint(event.pageX, event.pageY)) {
        if (!debugMode) get("root").style.opacity = 0.1;
        mainPanelTimer = setTimeout(() => {
            if (!debugMode) window.close();
        }, 750);
    }
}
get("mainpanel").onmouseleave = async function () {
    if (logging) console.log("popup mainpanel mousleave", bg);
    if (warningMsg) {   
        autoclose = false;
    } 
    // Don't persist phishing sites if user mouses out of popup. Can't use
    // isphising() because the new bookmark hasn't been created yet when the 
    // user clicks the same account button.
    get("superpw").focus(); // Force phishing test in case focus is on sitename
    if (logging) console.log("popup phishing mouseleave phishing", phishing);
    if (phishing || exporting) {
        if (logging) console.log("popup phishing mouseleave resolve mouseleaveResolver", phishing, resolvers);
        if (resolvers.mouseleaveResolver) resolvers.mouseleaveResolver("mouseleavePromise");
        return;
    }
    // window.onblur fires before I even have a chance to see the window, much less focus it
    if (bg && bg.settings) {
        bg.superpw = get("superpw").value || "";
        bg.settings.domainname = get("domainname").value || "";
        bg.settings.sitename = get("sitename").value || "";
        bg.settings.username = get("username").value || "";
        if (bg.settings.sitename) {
            database.sites[normalize(bg.settings.sitename)] = clone(bg.settings);
            database.domains[bg.settings.domainname] = normalize(bg.settings.sitename);
        }
        let sitename = get("sitename").value;
        changePlaceholder();
        if (logging) console.log("popup sending siteData", bg.settings, database);
        await wakeup("mouseleave");
        let response = await chrome.runtime.sendMessage({
                "cmd": "siteData",
                "sitename": sitename,
                "clearsuperpw": get("clearsuperpw").checked,
                "hidesitepw": get("hidesitepw").checked,
                "bg": bg,
            });
        if (chrome.runtime.lastError) console.log("popup mouseleave lastError", chrome.runtime.lastError);
        if (logging) console.log("popup siteData resolve mouseleaveResolver", response, resolvers);
        if (resolvers.mouseleaveResolver) resolvers.mouseleaveResolver("mouseleavePromise");
    } else {
        if (logging) console.log("popup no bg.settings mouseleave resolve", resolvers);
        if (resolvers.mouseleaveResolver) resolvers.mouseleaveResolver("mouseleavePromise");
    }
}
get("root").onmouseenter = function (e) {
    get("root").style.opacity = 1; 
    clearTimeout(mainPanelTimer);
}
get("title").onclick = function () {
    window.open("https://sitepassword.info");
}
// Domain Name
// There are no actions the user can take on the domain name field,
// but I need this handler for testing.
get("domainname").onblur = async function (e) {
    get("sitename").value = "";
    if (testMode) domainname = get("domainname").value;
    await getsettings(domainname);
    await fill();
    if (resolvers.domainnameblurResolver) resolvers.domainnameblurResolver("domainnameblurPromise");
}
get("domainnamemenu").onmouseleave = function (e) {
    menuOff("domainname", e);
}
get("domainname3bluedots").onmouseover = function (e) {
    let domainname = get("domainname").value;
    if (domainname && database.domains[domainname]) {
        get("domainnamemenuforget").style.opacity = "1";
    } else {
        get("domainnamemenuforget").style.opacity = "0.5";
    }
    menuOn("domainname", e);
}
get("domainname3bluedots").onclick = get("domainname3bluedots").onmouseover;
get("domainnamemenuforget").onclick = function (e) {
    msgon("forget");
    let toforget = normalize(get("domainname").value);
    addForgetItem(toforget);
}
get("domainnamemenuhelp").onclick = function (e) {
    helpItemOn("domainname");
}
get("domainnamehelptextclose").onclick = function (e) {
    helpAllOff();
}
get("domainnamehelptextmore").onclick = function (e) {
    helpAllOff();
    sectionClick("domainname");
}
// Super Password
const $superpw = get("superpw");
get("superpw").onkeyup = async function (e) {
    // Start the reminder clock ticking
    await chrome.storage.local.set({"reminder": Date.now()});
    bg.superpw = $superpw.value || "";
    await ask2generate()
    setMeter("superpw");
    setMeter("sitepw");
    await handlekeyup("superpw", "superpw");
    if (resolvers.superpwkeyupResolver) resolvers.superpwkeyupResolver("superpwkeyupPromise");
}
get("superpw").onblur = async function (e) {
    if (logging) console.log("popup superpw onmouseout");
    await handleblur("superpw", "superpw");
    await changePlaceholder();
    if (resolvers.superpwblurResolve) resolvers.superpwblurResolver("superpwblurPromise");
}
get("superpwmenu").onmouseleave = function (e) {
    menuOff("superpw", e);
}
get("superpw3bluedots").onmouseover = function (e) {
    if (get("superpw").value) {
        get("superpwmenushow").style.opacity = "1";
        get("superpwmenuhide").style.opacity = "1";
    } else {
        get("superpwmenushow").style.opacity = "0.5";
        get("superpwmenuhide").style.opacity = "0.5";
    }
    menuOn("superpw", e);      
}
get("superpw3bluedots").onclick = get("superpw3bluedots").onmouseover;
get("superpwmenushow").onclick = function(e) {
    if (!get("superpw").value) return;
    get("superpw").type = "text";
    get("superpwmenuhide").classList.toggle("nodisplay");
    get("superpwmenushow").classList.toggle("nodisplay")    ;
}
get("superpwmenuhide").onclick = function(e) {
    if (!get("superpw").value) return;
    get("superpw").type = "password";
    get("superpwmenuhide").classList.toggle("nodisplay");
    get("superpwmenushow").classList.toggle("nodisplay")    ;
}
get("superpwmenuhelp").onclick = function (e) {
    helpItemOn("superpw");
}
get("superpwhelptextclose").onclick = function (e) {
    helpAllOff();
}
get("superpwhelptextmore").onclick = function (e) {
    helpAllOff;
    sectionClick("superpw");
}
// Site Name
let focused = true; // Needed so I can blur and refocus to get the datalist updated
get("sitename").onfocus = function (e) {
    let set = new Set();
    let value = normalize(get("sitename").value);
    Object.keys(database.sites).forEach((sitename) => {
        let site = database.sites[normalize(sitename)].sitename;
        if (!value || normalize(site).startsWith(value)) set.add(site);
    })
    let list = [... set].sort();
    setupdatalist(this, list);
    if (!get("sitename").value && focused) {
        get("sitename").blur();
        focused = false;
        get("sitename").focus();
    } else {
        focused = true;
    }
}
get("sitename").onkeyup = async function () {
    await handlekeyup("sitename", "sitename");
    clearDatalist("sitenames");
    get("sitename").onfocus();
    if (resolvers.sitenamekeyupResolver) resolvers.sitenamekeyupResolver("sitenamekeyupPromise");
}
get("sitename").onblur = async function (e) {
    await Promise.resolve(); // Because some branches have await and others don't
    let d = isphishing(bg.settings.sitename)
    if (d) {
        get("phishingtext0").innerText = get("sitename").value;
        get("phishingtext1").innerText = d;
        get("phishingtext2").innerText = get("domainname").value;
        phishing = true;
        msgon("phishing");
        hidesettings();
        get("superpw").disabled = true;
        get("username").disabled = true;
        get("sitepw").value = "";
    } else {
        phishing = false;
        msgoff("phishing");
        get("superpw").disabled = false;
        get("username").disabled = false
        await handleblur("sitename", "sitename");
        changePlaceholder();
    }
    clearDatalist("sitenames");
    if (resolvers.sitenameblurResolver) resolvers.sitenameblurResolver("sitenameblurPromise");
}
get("sitename3bluedots").onmouseover = function (e) {
    let sitename = get("sitename").value;
    if (sitename) {
        get("sitenamemenuforget").style.opacity = "1";
    } else {
        get("sitenamemenuforget").style.opacity = "0.5";
    }
    menuOn("sitename", e);
}
get("sitename3bluedots").onclick = get("sitename3bluedots").onmouseover;
get("sitenamemenu").onmouseleave = function (e) {
    menuOff("sitename", e);
}
get("sitenamemenuforget").onclick = function (e) {
    msgon("forget");
    let toforget = normalize(get("sitename").value);
    for (let domain in database.domains) {
        if (normalize(database.domains[domain]) === toforget) {
            addForgetItem(domain);
        }
    }
}
get("sitenamemenuhelp").onclick = function (e) {
    helpItemOn("sitename");
}
get("sitenamehelptextclose").onclick = function (e) {
    helpAllOff();
}
get("sitenamehelptextmore").onclick = function (e) {
    helpAllOff();
    sectionClick("sitename");
}
// Site Username
focused = true; // Needed so I can blur and refocus to get the datalist updated
get("username").onfocus = function (e) {
    let set = new Set();
    let value = normalize(get("username").value);
    Object.keys(database.sites).forEach((sitename) => {
        let username = database.sites[normalize(sitename)].username;
        if (!value || normalize(username).startsWith(value)) set.add(username);
    })
    let list = [... set].sort();
    setupdatalist(this, list);
    if (!get("username").value && focused) {
        get("username").blur();
        focused = false;
        get("username").focus();
    } else {    
        focused = true;
    }
}
get("username").onkeyup = async function () {
    await handlekeyup("username", "username");
    clearDatalist("usernames");
    get("username").onfocus();
    if (resolvers.usernamekeyupResolver) resolvers.usernamekeyupResolver("usernamekeyupPromise");
}
get("username").onblur = async function (e) {
    handleblur("username", "username");
    clearDatalist("usernames");
    await changePlaceholder();
}
get("usernamemenu").onmouseleave = function (e) {
    menuOff("username", e);
}
get("username3bluedots").onmouseover = function (e) {
    let username = get("username").value;
    if (username) {
        get("usernamemenuforget").style.opacity = "1";
        get("usernamemenucopy").style.opacity = "1";
    } else {
        get("usernamemenuforget").style.opacity = "0.5";
        get("usernamemenucopy").style.opacity = "0.5";
    }
    menuOn("username", e);
}
get("username3bluedots").onclick = get("username3bluedots").onmouseover;
get("usernamemenuforget").onclick = function (e) {
    msgon("forget");
    let toforget = normalize(get("username").value);
    for (let domain in database.domains) {
        let sitename = normalize(database.domains[domain]);
        if (normalize(database.sites[sitename].username) === toforget) {
            addForgetItem(domain);
        }
    }
}
get("usernamemenucopy").onclick = async function(e) {
    let username = get("username").value;
    if (!username) return;
    navigator.clipboard.writeText(username).then(() => {
        if (logging) console.log("popup wrote to clipboard", username);
        copied("username");
        get("clearclipboard").click();
    }).catch((e) => {
        if (logging) console.log("popup username clipboard write failed", e);
    });
    menuOff("username", e);
}
get("usernamemenuhelp").onclick = function (e) {
    helpItemOn("username");
}
get("usernamehelptextclose").onclick = function (e) {
    helpAllOff();
}
get("usernamehelptextmore").onclick = function (e) {
    helpAllOff();
    sectionClick("username");
}
// Site Password
get("sitepw").onblur = async function (e) {
    menuOff("sitepw", e);
    if (get("sitepw").readOnly || !get("sitepw").value) return;
    let provided = get("sitepw").value;
    let computed = await ask2generate(bg)
    bg.settings.xor = xorStrings(provided, computed);
    if (resolvers.sitepwblurResolver) resolvers.sitepwblurResolver("sitepwblurPromise"); 
}
get("sitepw").onkeyup = function () {
    get("sitepw").onblur();
}
get("sitepwmenu").onmouseleave = function (e) {
    menuOff("sitepw", e);
}
get("sitepw3bluedots").onmouseover = function (e) {
    let sitepw = get("sitepw").value;
    if (sitepw) {
        get("sitepwmenucopy").style.opacity = "1";
        get("sitepwmenushow").style.opacity = "1";
        get("sitepwmenuhide").style.opacity = "1";
    } else {
        get("sitepwmenucopy").style.opacity = "0.5";
        get("sitepwmenushow").style.opacity = "0.5";
        get("sitepwmenuhide").style.opacity = "0.5";
    }
    menuOn("sitepw", e);
}
get("sitepw3bluedots").onclick = get("sitepw3bluedots").onmouseover;
get("sitepwmenucopy").onclick = async function(e) {
    let sitepw = get("sitepw").value;
    if (!sitepw) return;
    try {
        await navigator.clipboard.writeText(sitepw);
        if (logging) console.log("popup wrote to clipboard", sitepw);
        get("logopw").title = "A site password may be on the clipboard."
        get("logo").style.display = "none";
        get("logopw").style.display = "block";
        await chrome.action.setTitle({title: "A site password may be on the clipboard."});
        await chrome.action.setIcon({"path": "images/icon128pw.png"});
        await chrome.storage.local.set({"onClipboard": true})
        copied("sitepw");
    } catch(e) {
        if (logging) console.log("popup sitepw clipboard write failed", e);
    }
    menuOff("sitepw", e);
}
get("sitepwmenuhelp").onclick = function (e) {
    helpItemOn("sitepw");
}
get("sitepwhelptextclose").onclick = function (e) {
    helpAllOff();
}
get("sitepwhelptextmore").onclick = function (e) {
    helpAllOff();
    sectionClick("sitepw");
}
get("sitepwmenushow").onclick = function () {
    get("sitepw").type = "text";
    get("sitepwmenushow").classList.toggle("nodisplay");
    get("sitepwmenuhide").classList.toggle("nodisplay");
}
get("sitepwmenuhide").onclick = function () {
    get("sitepw").type = "password";
    get("sitepwmenushow").classList.toggle("nodisplay");
    get("sitepwmenuhide").classList.toggle("nodisplay");
}
get("settingsshow").onclick = showsettings;
get("clearclipboard").onclick = async function() {
    if (logging) console.log("popup clear clipboard");
    try {
        await navigator.clipboard.writeText("");
        get("logo").title = defaultTitle;
        get("logo").style.display = "block";
        get("logopw").style.display = "none";
        // Don't worry about waiting for these to complete
        await chrome.action.setTitle({title: defaultTitle});
        await chrome.storage.local.set({"onClipboard": false});
        await chrome.action.setIcon({"path": "../images/icon128.png"});
    } catch(e) {
        if (logging) console.log("popup clear clipboard failed", e);
    }
}
document.oncopy = get("clearclipboard").onclick;
get("settingssave").onclick = hidesettings;
get("providesitepw").onclick = async function () {
    await Promise.resolve(); // Because some branches have await and others don't
    if (!(get("sitename").value && get("username").value)) return;
    bg.settings.providesitepw = get("providesitepw").checked;
    if (get("providesitepw").checked) {
        get("sitepw").readOnly = false;
        get("sitepw").value = "";
        get("sitepw").focus();
        get("sitepw").style.backgroundColor = "white";
        get("sitepwmenushow").classList.remove("menu-icon-blue");
        get("sitepwmenuhide").classList.remove("menu-icon-blue");
        get("sitepwmenucopy").classList.remove("menu-icon-blue");
        get("sitepwmenuhelp").classList.remove("menu-icon-blue");
        get("sitepw").placeholder = "Enter your site password";
    } else {
        get("sitepw").readOnly = true;
        get("sitepw").style.backgroundColor = "rgb(136, 204, 255, 20%)";
        get("sitepwmenushow").classList.add("menu-icon-blue");
        get("sitepwmenuhide").classList.add("menu-icon-blue");
        get("sitepwmenucopy").classList.add("menu-icon-blue");
        get("sitepwmenuhelp").classList.add("menu-icon-blue");
        get("sitepw").placeholder = "Your site password";
        await ask2generate();
        defaultfocus();
    }
    if (resolvers.providesitepwResolver) resolvers.providesitepwResolver("providesitepwPromise");
}
get("clearsuperpw").onclick = function () {
    database.clearsuperpw = get("clearsuperpw").checked;
    if (resolvers.clearsuperpwResolver) resolvers.clearsuperpwResolver("clearsuperpwPromise");
}
get("hidesitepw").onclick = function () {
    database.hidesitepw = get("hidesitepw").checked;
    hidesitepw();
    if (resolvers.hidesitepwResolver) resolvers.hidesitepwResolver("hidesitepwPromise");
}
get("pwlength").onmouseout = async function () {
    await handleblur("pwlength", "pwlength");
    if (resolvers.pwlengthblurResolver) resolvers.pwlengthblurPromise("pwlengthblurPromise");
}
get("pwlength").onblur = async function () {
    await handleblur("pwlength", "pwlength");
    if (resolvers.pwlengthblurResolver) resolvers.pwlengthblurResolver("pwlengthblurPromise");
}
get("startwithletter").onclick = function () {
    bg.settings.startwithletter = get("startwithletter").checked;
    ask2generate();
}
get("allowlowercheckbox").onclick = function () {
    handleclick("lower");
}
get("allowuppercheckbox").onclick = function () {
    handleclick("upper");
}
get("allownumbercheckbox").onclick = function () {
    handleclick("number");
}
get("allowspecialcheckbox").onclick = async function () {
    await handleclick("special");
    if (resolvers.allowspecialclickResolver) resolvers.allowspecialclickResolver("allowspecialclickPromise");
}
get("minlower").onmouseout = function () {
    handleblur("minlower", "minlower");
}
get("minlower").onblur = function () {
    handleblur("minlower", "minlower");
}
get("minupper").onmouseout = function () {
    handleblur("minupper", "minupper");
}
get("minupper").onblur = function () {
    handleblur("minupper", "minupper");
}
get("minnumber").onmouseout = function () {
    handleblur("minnumber", "minnumber");
}
get("minnumber").onblur = function () {
    handleblur("minnumber", "minnumber");
}
get("minspecial").onmouseout = function () {
    handleblur("minspecial", "minspecial");
}
get("minspecial").onblur = function () {
    handleblur("minspecial", "minspecial");
}
// I need to limit the number of specials because generate() 
// computes a number between 0 and 63 to index into the
// characters array.  There are 10 integers and 26 upper
// case letters.  If there are too many special characters,
// then the first lower case letter is past index 63.
const alphanumerics = /[0-9A-Za-z]/g;
get("specials").onblur = async function() {
    if (!get("specials").value) {
        alert("You must enter at least one special character.");
        get("specials").value = bg.settings.specials;
        return;
    }
    let specials = get("specials");
    specials.value = specials.value
        .replace(alphanumerics, '')  // eliminate alphanumerics
        .substring(0, 12);  // limit to 12 specials
    bg.settings.specials = specials.value;
    await handlekeyup("specials");
    if (resolvers.specialsblurResolver) resolvers.specialsblurResolver("specialsblurPromise");
}
get("makedefaultbutton").onclick = async function () {
    let newDefaults = {
        sitename: "",
        username: "",
        providesitepw: false,
        xor: new Array(12).fill(0),
        domainname: "",
        pwdomainname: "",
        pwlength: get("pwlength").value,
        providesitepw: get("providesitepw").checked,
        startwithletter: get("startwithletter").checked,
        allowlower: get("allowlowercheckbox").checked,
        allowupper: get("allowuppercheckbox").checked,
        allownumber: get("allownumbercheckbox").checked,
        allowspecial: get("allowspecialcheckbox").checked,
        minlower: get("minlower").value,
        minupper: get("minupper").value,
        minnumber: get("minnumber").value,
        minspecial: get("minspecial").value,
        specials: get("specials").value,
    }
    await wakeup("defaultbutton");
    await chrome.runtime.sendMessage({"cmd": "newDefaults", "newDefaults": newDefaults});
    if (chrome.runtime.lastError) console.log("popup makedefaultbutton lastError", chrome.runtime.lastError);
    if (logging) console.log("popup newDefaults sent", newDefaults);
    if (resolvers.makedefaultResolver) resolvers.makedefaultResolver("makedefaultbuttonPromise");
}
get("sitedatagetbutton").onclick = sitedataHTML;
get("exportbutton").onclick = exportPasswords;
get("maininfo").onclick = function () {
    if (get("instructionpanel").style.display == "none") {
        showInstructions();
        hidesettings();
        helpAllOff();
    } else {
        hideInstructions();
    }
    autoclose = false;
}
get("cancelwarning").onclick = async function () {
    phishing = true;
    msgoff("phishing");
    get("domainname").value = "";
    get("sitename").value = "";
    get("username").value = "";
    if (!testMode) {
        await chrome.tabs.update(activetab.id, { url: "chrome://newtab" });
        window.close();
    }
    if (resolvers.cancelwarningResolver) resolvers.cancelwarningResolver("cancelwarningPromise");
}
get("warningbutton").onclick = async function () {
    phishing = false;
    get("superpw").disabled = false;
    get("username").disabled = false;
    get("sitename").disabled = false;
    msgoff("phishing");
    var sitename = getlowertrim("sitename");
    bg.settings = clone(database.sites[sitename]);
    bg.settings.sitename = get("sitename").value;
    if (testMode) bg.settings.domainname = get("domainname").value;
    database.domains[get("domainname").value] = bg.settings.sitename;
    get("username").value = bg.settings.username;
    await ask2generate();
    autoclose = false;
    if (resolvers.warningbuttonResolver) resolvers.warningbuttonResolver("warningbuttonPromise");
}
get("nicknamebutton").onclick = function () {
    setfocus(get("sitename"));
    msgoff("phishing");
    autoclose = false;
}
get("forgetbutton").onclick = async function () {
    if (logging) console.log("popup forgetbutton");
    let list = [];
    let children = get("toforgetlist").children;
    for (let child of children) {
        list.push(child.innerText);
    }
    get("sitename").value = "";
    get("username").value = "";
    bg = bgDefault;
    if (logging) console.log("popup forgetbutton sending forget", list);
    await wakeup("foregetbutton");
    let response = await chrome.runtime.sendMessage({"cmd": "forget", "toforget": list});
    if (chrome.runtime.lastError) console.log("popup forget lastError", chrome.runtime.lastError);
    if (logging) console.log("popup forget response", response);
    if (resolvers.forgetclickResolver) resolvers.forgetclickResolver("forgetClickPromise");
    get("cancelbutton").click();
}
get("cancelbutton").onclick = function () {
    while ( get("toforgetlist").firstChild ) {
        get("toforgetlist").removeChild(get("toforgetlist").firstChild);
    }
    msgoff("forget");
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
});// Generic code for menus
function copied(which) {
    get(which + "copied").classList.remove("nodisplay");
    setTimeout(() => {
        get(which + "copied").classList.add("nodisplay");
    }, 900);
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
    get("domainnamemenu").style.display = "none";
    get("superpwmenu").style.display = "none";
    get("sitenamemenu").style.display = "none";
    get("usernamemenu").style.display = "none";
    get("sitepwmenu").style.display = "none";
}
function dotsAllOn() {
    get("domainname3bluedots").style.display = "block";
    get("superpw3bluedots").style.display = "block";
    get("sitename3bluedots").style.display = "block";
    get("username3bluedots").style.display = "block";
    get("sitepw3bluedots").style.display = "block";
}
function helpItemOn(which) {
    let $element = get(which + "helptext");
    if (!$element.style.display || $element.style.display === "none") {
        helpAllOff();
        get("helptext").style.display = "block";
        $element.style.display = "block";
        hideInstructions();
        hidesettings();
        autoclose = false;
    } else {
        helpAllOff();
    }
}
function helpItemOff(which) {
    get("helptext").style.display = "none";
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
    if (logging) console.log("popup checking hidesitepw", get("hidesitepw").checked, database.hidesitepw);
    if (get("hidesitepw").checked || (database && database.hidesitepw)) {
        get("sitepw").type = "password";
    } else {
        get("sitepw").type = "text";
    }
}
function showInstructions() {
    helpAllOff();
    autoclose = false;
    get("instructionpanel").style.display = "block";
    get("maininfo").title = "Close Instructions";
    get("instructionopen").classList.add("nodisplay");
    get("instructionclose").classList.remove("nodisplay");
    // I need to adjust the width of the main panel when the scrollbar appears.
}
function hideInstructions() {
    autoclose = true;
    closeAllInstructions();
    get("instructionpanel").style.display = "none";
    get("maininfo").title = "Open Instructions";
    get("instructionopen").classList.remove("nodisplay");
    get("instructionclose").classList.add("nodisplay");
    // I need to adjust the width of the main panel when the scrollbar disappears.
    get("main").style.padding = "6px " + scrollbarWidth() + "px 9px 12px";
}
// End of generic code for menus
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
    $meter.value = score;
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
            if (get("allowlowercheckbox").checked) alphabetSize += 26;
            if (get("allowuppercheckbox").checked) alphabetSize += 26;
            if (get("allownumbercheckbox").checked) alphabetSize += 10;
            if (get("allowspecialcheckbox").checked) alphabetSize += get("specials").value.length;
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

async function handlekeyup(element, field) {
    await handleblur(element, field);
}
async function handleblur(element, field) {
    if (element === "superpw") {
        bg.superpw = get(element).value;
    } else {
        bg.settings[field] = get(element).value;
    }
    if (get("superpw").value && get("sitename").value && get("username").value) {
        get("providesitepw").disabled = false;
    } else {
        get("providesitepw").disabled = true;
    }
    bg.settings.characters = characters(bg.settings, database);
    let pw = await ask2generate()
    setMeter("superpw");
    setMeter("sitepw");
    updateExportButton(); 
    let u = get("username").value || "";
    let readyForClick = false;
    if (get("superpw").value && u) readyForClick = true;
    await chrome.tabs.sendMessage(activetab.id, { "cmd": "update", "u": u, "p": pw, "readyForClick": readyForClick });
    if (chrome.runtime.lastError) console.log("popup handleblur lastError", chrome.runtime.lastError);
}
async function handleclick(which) {
    bg.settings["allow" + which] = get("allow" + which + "checkbox").checked;
    pwoptions([which]);
    if (!(bg.settings.allowupper || bg.settings.allowlower)) {
        bg.settings.startwithletter = false;
        get("startwithletter").checked = false;
    }
    bg.settings.characters = characters(bg.settings, database)
    await ask2generate();
}
async function changePlaceholder() {
    let u = get("username").value || "";
    let readyForClick = false;
    if (get("superpw").value && u) readyForClick = true;
    await wakeup("changePlaceholder");
    await chrome.tabs.sendMessage(activetab.id, { "cmd": "fillfields", "u": u, "p": "", "readyForClick": readyForClick });
    if (chrome.runtime.lastError) console.log("popup changePlaceholder lastError", chrome.runtime.lastError);
}
function setfocus(element) {
    element.focus();
}
function defaultfocus() {
    if (!get("username").value) setfocus(get("username"));
    if (!get("sitename").value) setfocus(get("sitename"));
    if (!get("superpw").value) setfocus(get("superpw"));
}
async function ask2generate() {
    Promise.resolve(); // Because some branches have await and others don't
    if (!(bg.settings || bg.settings.allowlower || bg.settings.allownumber)) {
        msgon("nopw");
        computed = "";
    } else {
        message("nopw", false); // I don't want to hide any other open messages
        const computed = await generatePassword(bg);
        if (computed) {
            message("nopw", false); // I don't want to hide any other open messages
        } else {
            if (get("superpw").value) {
                msgon("nopw");
            }
        }
        let provided = stringXorArray(computed, bg.settings.xor);
        if (logging) console.log("popup filling sitepw field", computed, provided, bg.settings.xor);
        if (document.activeElement !== get("sitepw")) get("sitepw").value = provided;
        hidesitepw();
        setMeter("sitepw");
        return computed;
    }
}
async function fill() {
    if (bg.settings[domainname]) {
        if (!get("username").value) get("username").value = bg.settings.username;
        if (!get("sitename").value) get("sitename").value = bg.settings.sitename;
    } else {
        bg.settings.domainname = getlowertrim("domainname");
        bg.settings.sitename = getlowertrim("sitename");
        bg.settings.username = getlowertrim("username");
    }
    get("superpw").value = bg.superpw || "";
    get("providesitepw").checked = bg.settings.providesitepw;
    if (logging) console.log("popup fill with", bg.settings.domainname, isSuperPw(bg.superpw), bg.settings.sitename, bg.settings.username);
    if (get("superpw").value && get("sitename").value && get("username").value) {
        get("providesitepw").disabled = false;
        get("providesitepwlabel").style.opacity = 1.0;
    } else {
        get("providesitepw").disabled = true;
        get("providesitepwlabel").style.opacity = 0.5;
    }
    if (get("providesitepw").checked && get("superpw").value && get("sitename").value && get("username").value) {
        get("sitepw").readOnly = false;
        get("sitepw").placeholder = "Enter your super password";
        get("sitepw").style.backgroundColor = "white";
        get("superpw").focus();
    } else {
        get("sitepw").readOnly = true;
        get("sitepw").placeholder = "Your site password";
        get("sitepw").style.backgroundColor = "rgb(136, 204, 255, 20%)";
        defaultfocus();
    }
    get("clearsuperpw").checked = database.clearsuperpw;
    get("hidesitepw").checked =  database.hidesitepw;
    hidesitepw();
    get("pwlength").value = bg.settings.pwlength;
    get("startwithletter").checked = bg.settings.startwithletter;
    get("allowlowercheckbox").checked = bg.settings.allowlower;
    get("allowuppercheckbox").checked = bg.settings.allowupper;
    get("allownumbercheckbox").checked = bg.settings.allownumber;
    get("allowspecialcheckbox").checked = bg.settings.allowspecial;
    get("minnumber").value = bg.settings.minnumber;
    get("minlower").value = bg.settings.minlower;
    get("minupper").value = bg.settings.minupper;
    get("minspecial").value = bg.settings.minspecial;
    get("specials").value = bg.settings.specials;
    await ask2generate();
}
async function showsettings() {
    get("settingsshow").style.display = "none";
    get("settingssave").style.display = "inline";
    get("settings").style.display = "block";
    helpAllOff();
    hideInstructions();
    let height = get("settings").getBoundingClientRect().height;
    get("main").style.height = height + "px";
    get("superpw").value = bg.superpw || "";
    await fill();
    pwoptions(["lower", "upper", "number", "special"]);
    if (resolvers.settingsshowResolver) resolvers.settingsshowResolver("settingsshowPromise");
}
function hidesettings() {
    get("settingsshow").style.display = "inline";
    get("settingssave").style.display = "none";
    get("settings").style.display = "none";
    let height = mainHeight();
    get("main").style.height = height + "px";
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
    if (get("superpw").value) {
        get("exportbutton").disabled = false;
        get("exportbutton").title = "Export site data";
    } else {
        get("exportbutton").disabled = true;
        get("exportbutton").title = "Enter your super password to export site data";
    }
}
async function exportPasswords() {
    if (!get("superpw").value) return;
    // I would normally set autoclose to false, but it gets turned 
    // back to true in message(), which is called from ask2generate().
    exporting = true;
    // I need the try block to put exporting back to false if there is an error
    try {
        let exportbutton = get("exportbutton");
        exportbutton.innerText = "Exporting...";
        let domainnames = database.domains;
        let sorted = Object.keys(domainnames).sort(function (x, y) {
            if (x.toLowerCase() < y.toLowerCase()) return -1;
            if (x.toLowerCase() == y.toLowerCase()) return 0;
            return 1;
        });
        let olddomainname = get("domainname").value;
        let oldsitename = get("sitename").value;
        let oldusername = get("username").value;
        let oldsettings = clone(bg.settings);
        let data = "Domain Name, Site Name, User Name, Site Password\n";
        for (let domainname of sorted) {
            let sitename = database.domains[domainname];
            let settings = database.sites[sitename];
            let username = settings.username;
            bg.settings = settings;
            get("domainname").value = domainname;
            get("sitename").value = sitename;
            get("username").value = username;
            try {
                let sitepw = await ask2generate();
                data += '"' + domainname + '"' + "," + '"' + sitename + '"' + "," + '"' + username + '"' + "," + '"' + sitepw + '"' + "\n";
            } catch (e) {
                console.log("popup exportPasswords error", e);
            }
        }
        bg.settings = oldsettings;
        get("sitename").value = oldsitename;
        get("username").value = oldusername;
        get("domainname").value = olddomainname;
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
        exportbutton.innerText = "Export passwords";
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
    const $data = get("data");
    $data.href = url;
    $data.click();
    return;
}
function sitedataHTMLDoc(doc, sorted) {
    let header = doc.getElementsByTagName("head")[0];
    let title = doc.createElement("title");
    title.innerText = "SitePassword Data";
    header.appendChild(title);
    let style = doc.createElement("style");
    header.appendChild(style);
    style.innerText = "th {text-align: left;}";
    let body = doc.getElementsByTagName("body")[0];
    let table = addElement(body, "table");
    tableCaption(table);
    let headings = ["Domain Name", "Site Name", "User Name", "Password Length", "Start with Letter",
        "Allow Lower", "Min Lower", "Allow Upper", "Min Upper", "Allow Numbers", "Min Numbers",
        "Allow Specials", "Min Specials", "Specials", "Code for User Provided Passwords"];
    tableHeader(table, headings);
    for (let i = 0; i < sorted.length; i++) {
        let tr = addElement(table, "tr");
        if (i % 2) tr.style.backgroundColor = "rgb(136, 204, 255, 30%)";
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
        let s = database.sites[sitename];
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
function isphishing(sitename) {
    if (!sitename) return "";
    let domainname = get("domainname").value; // Needed for tests
    var domains = Object.keys(database.domains);
    var phishing = "";
    domains.forEach(function (d) {
        if ((database.domains[d] == normalize(sitename)) &&
            (d != domainname)) {
            let settings = database.sites[normalize(sitename)];
            if (settings.pwdomainname && settings.domainname !== settings.pwdomainname) {
                phishing = settings.pwdomainname;
            } else {
                phishing = d;
            }
        }
    });
    return phishing;
}
function addForgetItem(domainname) {
    let $list = get("toforgetlist");
    let $item = document.createElement("li");
    $item.innerText = domainname;
    $list.appendChild($item);
}
function get(element) {
    return document.getElementById(element);
}
function getlowertrim(element) {
    return (document.getElementById(element).value || "").toLowerCase().trim();
}
function clone(object) {
    return JSON.parse(JSON.stringify(object))
}
// Messages in priority order high to low
var messages = [
    { name: "forget", ison: false, transient: false },
    { name: "phishing", ison: false, transient: false },
    { name: "nopw", ison: false, transient: false },
    { name: "http", ison: false, transient: false },
    { name: "zero", ison: false, transient: false },
    { name: "multiple", ison: false, transient: false }
];
function msgon(msgname) {
    message(msgname, true);
    autoclose = false;
}
function msgoff(msgname) {
    message(msgname, false);
    autoclose = true;
}
// Show only the highest priority message that is on
function message(msgname, turnon) {
    var ison = false;
    for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        if (msg.name == msgname) msg.ison = turnon;
        get(msg.name).style.display = msg.ison ? "block" : "none";
        if (ison) get(msg.name).style.display = "none";
        ison = ison || msg.ison;
    }
    if (ison) {
        get("warnings").style.display = "block";
    } else {
        get("warnings").style.display = "none";
    }
    let height = mainHeight();
    get("main").style.height = height + "px";
    get("instructionpanel").style.height = height + "px";
    if (height <= 575) get("main").style.padding = "6px " + scrollbarWidth() + "px 9px 12px";
    warningMsg = ison;
    autoclose = !ison;
}
function mainHeight() {
    let $bottom = get("bottom");
    let padding = get("main").style.padding.split(" ");
    let topMargin = parseInt(padding[0]);
    let bottomMargin = parseInt(padding[2]);
    let bottom = $bottom.getBoundingClientRect().bottom + bottomMargin;
    let top = get("top").getBoundingClientRect().top - topMargin;
    let height = Math.min(bottom - top, 575);
    return height;
}
function cleartransientmsgs() {
    for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        if (msg.transient) msgoff(msg.name);
    }
}
function clearallmessages() {
    for (var i = 0; i < messages.length; i++) {
        msgoff(messages[i].name);
    }
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
            get("sharedinfo").style.display = "none";
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
}
// Make sure the service worker is running
// Multiple events can be lost if they are triggered fast enough,
// so each one needs to send its own wakeup message.
// Copied to findpw.js because I can't import it there
async function wakeup(caller) {
    if (logging) console.log("popup sending wakeup", caller, get("domainname").value);
    await new Promise((resolve) => {
        chrome.runtime.sendMessage({ "cmd": "wakeup" }, async (response) => {
            if (chrome.runtime.lastError) console.log("popup wakeup lastError", caller, chrome.runtime.lastError);
            if (logging) console.log("popup wakeup response", caller, get("domainname").value, response);
            if (!response) await wakeup(caller);
            resolve("wakeup");
        });
    });
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