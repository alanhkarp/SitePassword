'use strict';
import { webpage } from "./bg.js";
import { characters, generate, isSuperPw, normalize, stringXorArray, xorStrings } from "./generate.js";
const testMode = true;
let logging = testMode;
if (logging) console.log("Version 1.0");
var activetab;
var domainname;
var mainPanelTimer;
var autoclose = true;
const strengthColor = ["#bbb", "#f06", "#f90", "#093", "#036"]; // 0,3,6,9,C,F
var defaultTitle = "SitePassword";

var phishing = false;
var bg = { "settings": {} };

chrome.storage.local.get("onClipboard", (v) => {
    if (v.onClipboard) {
        chrome.action.setTitle({title: "A site password may be on the clipboard."});
        get("logopw").title = "A site password may be on the clipboard."
        get("logo").style.display = "none";
        get("logopw").style.display = "block";
        chrome.action.setIcon({"path": "icon128pw.png"});
    } else {
        chrome.action.setTitle({title: defaultTitle});
        get("logo").title = defaultTitle;
        get("logo").style.display = "block";
        get("logopw").style.display = "none";
        chrome.action.setIcon({"path": "icon128.png"});
    }
});
// I need all the metadata stored in database for both the phishing check
// and for downloading the site data.
var database = {};
if (logging) console.log("popup starting");
// window.onunload appears to only work for background pages, which
// no longer work.  Fortunately, using the password requires a click
// outside the popup window.  I can't use window.onblur because the 
// popup window closes before the message it sends gets delivered.

window.onload = function () {
    if (logging) console.log("popup getting active tab");
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
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
        get("sitepw").value = "";
        if (logging) console.log("popup got tab", domainname, activetab);
        if (logging) console.log(Date.now(), "popup getting metadata");
        instructionSetup();
        getsettings();
        eventSetup();
    });
}
function init() {
    get("superpw").value = bg.superpw || "";
    get("sitename").value = bg.settings.sitename || "";
    get("siteun").value = bg.settings.username || "";
    fill();
    let protocol = activetab.url.split(":")[0];
    if (logging) console.log("popup testing for http", protocol);
    message("http", protocol !== "https");
    if (get("superpw").value) {
        setSuperpwMeter(get("superpw").value);
    }
    defaultfocus();
    ask2generate();
}
function setupdatalist(element, list) {
    let datalist = get(element.id + "s");
    list.forEach((data) => {
        let option = document.createElement("option");
        option.value = data;
        option.innerText = data;
        datalist.appendChild(option);
    });
}
function getsettings() {
    if (logging) console.log("popup getsettings", domainname);
    chrome.runtime.sendMessage({
        "cmd": "getMetadata",
        "domainname": domainname,
        "activetab": activetab
    }, (response) => {
        bg = response.bg;
        database = response.database;
        hidesitepw();
        if (!bg.settings.sitename) {
            bg.settings.sitename = "";
            showsettings();
    }
        get("superpw").value = response.superpw || "";
        init();
        if (logging) console.log("popup got metadata", bg, database);
        if (chrome.runtime.lastError) console.log("popup lastError", chrome.runtime.lastError);
        message("multiple", bg.pwcount > 1);
        message("zero", bg.pwcount == 0);
    });
}
function eventSetup() {
    // This function sends a message to the service worker when the mouse leaves the 
    // outermost div on the window.  When the user clicks outside the popup, the window
    // loses focus and closes.  Any messages in flight will be lost.  That means there
    // is a race between message delivery and the next user click.  Fortunately, messages
    // are delivered in just a couple of ms, so there's no problem.  Just be aware that
    // this race is the source of any problems related to loss of the message sent here.
    get("root").onmouseleave = function (event) {
        // If I close the window immediately, then messages in flight get lost
        if (autoclose && !document.elementFromPoint(event.pageX, event.pageY)) {
            if (!testMode) get("root").style.opacity = 0.1;
            mainPanelTimer = setTimeout(() => {
                if (!testMode) window.close();
            }, 750);
        }
    }
    get("mainpanel").onmouseleave = function () {
        if (logging) console.log(Date.now(), "popup window.mouseleave", phishing, bg);
        // Don't persist phishing sites if user mouses out of popup. Can't use
        // isphising() because the new bookmark hasn't been created yet when the 
        // user clicks the same account button.
        get("superpw").focus();
        if (get("phishing").style.display === "block") { 
            autoclose = false;
            return;
        } 
        // window.onblur fires before I even have a chance to see the window, much less focus it
        if (bg.settings) {
            bg.superpw = get("superpw").value || "";
            bg.settings.sitename = get("sitename").value;
            bg.settings.username = get("siteun").value;
            if (bg.settings.sitename) {
                database.sites[bg.settings.sitename] = clone(bg.settings);
                database.domains[bg.settings.domainname] = bg.settings.sitename;
            }
            let sitename = get("sitename").value;
            changePlaceholder();
            bg.settings.domainname = domainname;
            if (logging) console.log("popup sending site data", domainname, bg);
           chrome.runtime.sendMessage({
                "cmd": "siteData",
                "sitename": sitename,
                "clearsuperpw": get("clearsuperpw").checked,
                "hidesitepw": get("hidesitepw").checked,
                "bg": bg,
            });
        }
    }
    get("root").onmouseenter = function () {
        get("root").style.opacity = 1;                
        clearTimeout(mainPanelTimer);
    }
    get("title").onclick = function () {
        window.open("https://sitepassword.info");
    }
    // UI Event handlers
    get("domainname").onkeyup = function () {
        get("sitename").value = "";
    }
    get("domainname").onblur = function () {
        get("sitename").value = "";
        getsettings(() => {
            fill();
            ask2generate();
        });
    }
    get("domainname").onfocus = function () {
        dotsOn("domainname");
    }
    get("domainname3dots").onmouseover = function (e) {
        let domainname = get("domainname").value;
        if (domainname && database.domains[domainname]) {
            get("domainnamemenuforget").style.color = "black";
        } else {
            get("domainnamemenuforget").style.color = "gray";
        }
        menuOn("domainname", e);
    }
    get("domainname3dots").onmouseleave = function (e) {
        menuOff("domainname", e);
    }
    get("domainnamemenuforget").onclick = function (e) {
        // TODO
    }
    get("domainnamemenuhelp").onclick = function (e) {
        helpItemOn("domainname");
    }
    get("domainnamehelptextclose").onclick = function (e) {
        helpItemOff("domainname");
    }
    get("domainname").onblur = function () {
        helpItemOff("domainname");
    }
    const $superpw = get("superpw");
    get("superpw").onkeyup = function () {
        bg.superpw = get("superpw").value || "";
        ask2generate();
        setSuperpwMeter($superpw.value);
    }
    get("superpw").onblur = function () {
        if (logging) console.log("popup superpw onblur");
        handleblur("superpw", "superpw");
        changePlaceholder();
    }
    get("superpw").onfocus = function () {
        dotsOn("superpw");
    }
    get("superpw3dots").onmouseover = function (e) {
        if (get("superpw").value) {
            get("superpwmenushow").style.color = "black";
            get("superpwmenuhide").style.color = "black";
        } else {
            get("superpwmenushow").style.color = "gray";
            get("superpwmenuhide").style.color = "gray";
        }
        menuOn("superpw", e);
    }
    get("superpwmenushow").onclick = function() {
        if (!get("superpw").value) return;
        get("superpw").type = "text";
        get("superpwmenuhide").style.display = "block";
        get("superpwmenushow").style.display = "none";
    }
    get("superpwmenuhide").onclick = function() {
        if (!get("superpw").value) return;
        get("superpw").type = "password";
        get("superpwmenuhide").style.display = "none";
        get("superpwmenushow").style.display = "block";
    }
    get("superpw3dots").onmouseleave = function (e) {
        menuOff("superpw", e);
    }
    get("superpwmenuhelp").onclick = function (e) {
        helpItemOn("superpw");
    }
    get("superpwhelptextclose").onclick = function (e) {
        helpItemOff("superpw");
    }
    get("superpw").onblur = function (e) {
        helpItemOff("superpw");
    }
    get("sitename").onfocus = function () {
        let set = new Set();
        Object.keys(database.sites).forEach((sitename) => {
            set.add(database.sites[normalize(sitename)].sitename);
        })
        let list = [... set].sort();
        setupdatalist(this, list);
    }
    get("sitename").onkeyup = function () {
        handlekeyup("sitename", "sitename");
    }
    get("sitename").onblur = function () {
        let d = isphishing(bg.settings.sitename)
        if (d) {
            let warnElement1 = get("phishingtext1");
            warnElement1.innerText  = "Warning: You may be at a fake site that is trying to steal your password. ";
            warnElement1.innerText += "You previously used this nickname for";
            get("phishingtext2").innerText = d;
            get("phishingtext3").innerText = "The domain name asking for your password is";
            get("phishingtext4").innerText = get("domainname").value;
            let warnElement5 = get("phishingtext5");
            warnElement5.innerText  = "It is common to see different domain names for the same account login. ";
            warnElement5.innerText += "Click the top (green) button if that's not the case or the middle (red) button if it is. ";
            warnElement5.innerText += "You can also pick a new nickname if this page is for a different account.";
            phishing = true;
            msgon("phishing");
            hidesettings();
            get("superpw").disabled = true;
            get("siteun").disabled = true;
            get("sitepw").value = "";
        } else {
            phishing = false;
            msgoff("phishing");
            get("superpw").disabled = false;
            get("siteun").disabled = false
            handleblur("sitename", "sitename");
            changePlaceholder();
        }
        clearDatalist("sitenames");
    }
    get("sitename").onfocus = function () {
        dotsOn("sitename");
    }
    get("sitename3dots").onmouseover = function (e) {
        let sitename = get("sitename").value;
        if (sitename) {
            get("sitenamemenuforget").style.color = "black";
        } else {
            get("sitenamemenuforget").style.color = "gray";
        }
        menuOn("sitename", e);
    }
    get("sitename3dots").onmouseleave = function (e) {
        menuOff("sitename", e);
    }
    get("sitenamemenuhelp").onclick = function (e) {
        helpItemOn("sitename");
    }
    get("sitenamehelptextclose").onclick = function (e) {
        helpItemOff("sitename");
    }
    get("sitename").onblur = function (e) {
        helpItemOff("sitename");
    }
    get("siteun").onfocus = function () {
        let set = new Set();
        Object.keys(database.sites).forEach((sitename) => {
            set.add(database.sites[normalize(sitename)].username);
        })
        let list = [... set].sort();
        setupdatalist(this, list);
    }
    get("siteun").onkeyup = function () {
        handlekeyup("siteun", "username");
    }
    get("siteun").onblur = function () {
        handleblur("siteun", "username");
        clearDatalist("siteuns");
        changePlaceholder();
    }
    get("siteun").onfocus = function () {
        dotsOn("siteun");
    }
    get("siteun3dots").onmouseover = function (e) {
        let username = get("siteun").value;
        if (username) {
            get("siteunmenuforget").style.color = "black";
            get("siteunmenucopy").style.color = "black";
        } else {
            get("siteunmenuforget").style.color = "gray";
            get("siteunmenucopy").style.color = "gray";
        }
        menuOn("siteun", e);
    }
    get("siteunmenucopy").onclick = function(e) {
        let sitepw = get("siteun").value;
        navigator.clipboard.writeText(sitepw).then(() => {
            if (logging) console.log("findpw wrote to clipboard", sitepw);
        }).catch((e) => {
            if (logging) console.log("findpw clipboard write failed", e);
        });
        menuOff("siteun", e);
    }
    get("siteun3dots").onmouseleave = function (e) {
        menuOff("siteun", e);
    }
    get("siteunmenuhelp").onclick = function (e) {
        get("siteunmenu").style.display = "none";
        get("siteunhelptext").style.display = "block";
    }
    get("siteunhelptextclose").onclick = function (e) {
        get("siteunhelptext").style.display = "none";
    }
   get("sitepw").onblur = function () {
        if (get("sitepw").readOnly || !get("sitepw").value) return;
        let provided = get("sitepw").value;
        let computed = ask2generate(bg);
        bg.settings.xor = xorStrings(provided, computed);
        get("sitepw").value = provided;
    }
    get("sitepw").onkeyup = function () {
        get("sitepw").onblur();
    }
    get("sitepw").onfocus = function () {
        dotsOn("sitepw");
    }
    get("sitepw3dots").onmouseover = function (e) {
        let sitepw = get("sitepw").value;
        if (sitepw) {
            get("sitepwmenucopy").style.color = "black";
            get("sitepwmenushow").style.color = "black";
            get("sitepwmenuhide").style.color = "black";
        } else {
            get("sitepwmenucopy").style.color = "gray";
            get("sitepwmenushow").style.color = "gray";
            get("sitepwmenuhide").style.color = "gray";
        }
        menuOn("sitepw", e);
    }
    get("sitepw3dots").onmouseleave = function (e) {
        menuOff("sitepw", e);
    }
    get("sitepwmenushow").onclick = function() {
        if (!get("sitepw").value) return;
        get("sitepw").type = "text";
        get("sitepwmenuhide").style.display = "block";
        get("sitepwmenushow").style.display = "none";
    }
    get("sitepwmenuhide").onclick = function() {
        if (!get("sitepw").value) return;
        get("sitepw").type = "password";
        get("sitepwmenuhide").style.display = "none";
        get("sitepwmenushow").style.display = "block";
    }
    get("sitepwmenucopy").onclick = function(e) {
        let sitepw = get("sitepw").value;
        navigator.clipboard.writeText(sitepw).then(() => {
            if (logging) console.log("findpw wrote to clipboard", sitepw);
            chrome.action.setTitle({title: "A site password may be on the clipboard."});
            get("logopw").title = "A site password may be on the clipboard."
            get("logo").style.display = "none";
            get("logopw").style.display = "block";
            chrome.action.setIcon({"path": "icon128pw.png"});
            chrome.storage.local.set({"onClipboard": true})
        }).catch((e) => {
            if (logging) console.log("findpw clipboard write failed", e);
        });
        menuOff("sitepw", e);
    }
    get("sitepwmenuhelp").onclick = function (e) {
        get("sitepwmenu").style.display = "none";
        get("sitepwmhelptext").style.display = "block";
    }
    get("sitepwmhelptextclose").onclick = function (e) {
        get("sitepwmhelptext").style.display = "none";
    }
   // Generic code for menus
    let menuTimer;
    function menuOn(which, e) {
        if ( e.type === "mouseleave") return;
        clearTimeout(menuTimer);
        get("domainname").style.backgroundColor = "lightgray";
        get("superpw").style.backgroundColor = "lightgray";
        get("sitename").style.backgroundColor = "lightgray";
        get("siteun").style.backgroundColor = "lightgray";
        get("sitepw").style.backgroundColor = "lightgray";
        get(which).style.backgroundColor = "white";
        get(which + "menu").style.opacity = 1.0;
        get(which + "menu").style.display = "block";
    }
    function menuOff(which, e) {
        if ( e.type === "mouseenter") return;
        get(which + "menu").style.opacity = 0.1;
        menuTimer = setTimeout(() => {
            get(which + "menu").style.display = "none";
            get("domainname").style.backgroundColor = "#eeeeee";
            get("superpw").style.backgroundColor = "white";
            get("sitename").style.backgroundColor = "white";
            get("siteun").style.backgroundColor = "white";
            get("sitepw").style.backgroundColor = "white";
            }, 250);
    }
    function dotsOn(which) {
        get("domainname3dots").style.display = "none";
        get("superpw3dots").style.display = "none";
        get("sitename3dots").style.display = "none";
        get("siteun3dots").style.display = "none";
        get("sitepw3dots").style.display = "none";
        get(which + "3dots").style.display = "block";
    }
    function helpItemOn(which) {
        get(which + "menu").style.display = "none";
        get(which + "helptext").style.display = "block";
        get(which).focus();
        autoclose = false;
    }
    function helpItemOff(which) {
        get("settings").style.display = "none";
        get(which + "helptext").style.display = "none";
        autoclose = true;
    }
    get("settingsshow").onclick = showsettings;
    get("clearclipboard").onclick = function() {
        if (logging) console.log("popup clear clipboard");
        navigator.clipboard.writeText("");
        chrome.action.setTitle({title: defaultTitle});
        get("logo").title = defaultTitle;
        chrome.storage.local.set({"onClipboard": false});
        get("logo").style.display = "block";
        get("logopw").style.display = "none";
        chrome.action.setIcon({"path": "icon128.png"});
    }
    document.oncopy = get("clearclipboard").onclick;
    get("settingssave").onclick = hidesettings;
    get("providesitepw").onclick = function () {
        if (!(get("sitename").value && get("siteun").value)) return;
        bg.settings.providesitepw = get("providesitepw").checked;
        if (get("providesitepw").checked) {
            get("sitepw").readOnly = false;
            get("sitepw").value = "";
            get("sitepw").focus();
            get("sitepw").placeholder = "Enter your site password";
        } else {
            get("sitepw").readOnly = true;
            get("sitepw").placeholder = "Generated site password";
            ask2generate();
            defaultfocus();
        }
    }
    get("clearsuperpw").onclick = function () {
        database.clearsuperpw = get("clearsuperpw").checked;
    }
    get("hidesitepw").onclick = function () {
        database.hidesitepw = get("hidesitepw").checked;
        hidesitepw();
    }
    get("pwlength").onmouseleave = function () {
        handleblur("pwlength", "pwlength");
    }
    get("pwlength").onblur = function () {
        handleblur("pwlength", "pwlength");
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
    get("allowspecialcheckbox").onclick = function () {
        handleclick("special");
    }
    get("minlower").onmouseleave = function () {
        handleblur("minlower", "minlower");
    }
    get("minlower").onblur = function () {
        handleblur("minlower", "minlower");
    }
    get("minupper").onmouseleave = function () {
        handleblur("minupper", "minupper");
    }
    get("minupper").onblur = function () {
        handleblur("minupper", "minupper");
    }
    get("minnumber").onmouseleave = function () {
        handleblur("minnumber", "minnumber");
    }
    get("minnumber").onblur = function () {
        handleblur("minnumber", "minnumber");
    }
    get("minspecial").onmouseleave = function () {
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
    get("specials").onkeyup = function() {
        let specials = get("specials");
        specials.value = specials.value
            .replace(alphanumerics, '')  // eliminate alphanumerics
            .substring(0, 12);  // limit to 12 specials
        bg.settings.specials = specials.value;
        handlekeyup("specials");
    }    

    get("makedefault").onclick = function () {
        let newDefaults = {
            sitename: "",
            username: "",
            providesitepw: false,
            xor: new Array(12).fill(0),
            domainname: "",
            pwdomainname: "",
            pwlength: get("pwlength").value,
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
        chrome.runtime.sendMessage({"cmd": "newDefaults", "newDefaults": newDefaults})
    }
    get("sitedatagetbutton").onclick = sitedataHTML;
    get("maininfo").onclick = function () {
        let $instructions = get("instructionpanel");
        if ($instructions.style.display == "none") {
            get("settings").style.display = "block";
            $instructions.style = "display:block";
            autoclose = false;
        } else {
            get("settings").style.display = "none";
            $instructions.style = "display:none";
            autoclose = true;
        }
    }
    get("warningbutton").onclick = function () {
        phishing = false;
        get("superpw").disabled = false;
        get("siteun").disabled = false;
        get("sitename").disabled = false;
        msgoff("phishing");
        var sitename = getlowertrim("sitename");
        bg.settings = clone(database.sites[sitename]);
        bg.settings.sitename = get("sitename").value;
        database.domains[get("domainname").value] = bg.settings.sitename;
        get("siteun").value = bg.settings.username;
        showsettings();
        ask2generate();
    }
    get("cancelwarning").onclick = function () {
        phishing = true;
        msgoff("phishing");
        get("domainname").value = "";
        get("sitename").value = "";
        get("siteun").value = "";
        chrome.tabs.update(activetab.id, { url: "chrome://newtab" });
        window.close();
    }
    get("nicknamebutton").onclick = function () {
        setfocus(get("sitename"));
        showsettings();
        msgoff("phishing");
    }
}
function hidesitepw() {
    if (logging) console.log("popup checking hidesitepw", get("hidesitepw").checked, database.hidesitepw);
    if (get("hidesitepw").checked || database.hidesitepw) {
        get("sitepw").type = "password";
    } else {
        get("sitepw").type = "text";
    }
}
function setSuperpwMeter(pw) {
    const $superpw = get("superpw");
    const strengthText = ["Too Weak", "Very weak", "Weak", "Good", "Strong"];
    const $meter = get("password-strength-meter");
    const $meterText = get("password-strength-text");
    const report = zxcvbn(pw);
    $meter.value = report.score;
    $meterText.innerText = strengthText[report.score];
    $superpw.style.color = strengthColor[report.score];
    $superpw.title = strengthText[report.score] + " Super Password";
}

function handlekeyup(element, field) {
    handleblur(element, field);
}
function handleblur(element, field) {
    if (element === "superpw") {
        bg.superpw = get(element).value;
    } else {
        bg.settings[field] = get(element).value;
    }
    bg.settings.characters = characters(bg.settings, database);
    if (get("providesitepw").value && get("sitename").value && get("siteun").value) {
        get("providesitepw").disabled = false;
    } else {
        get("providesitepw").disabled = true;
    }
    ask2generate();
}
function handleclick(which) {
    bg.settings["allow" + which] = get("allow" + which + "checkbox").checked;
    pwoptions([which]);
    if (!(bg.settings.allowupper || bg.settings.allowlower)) {
        bg.settings.startwithletter = false;
        get("startwithletter").checked = false;
    }
    bg.settings.characters = characters(bg.settings, database)
    ask2generate();
}
function changePlaceholder() {
    let u = get("siteun").value
    if (get("superpw").value && get("sitename").value && u) {
        if (logging) console.log("popup sending fill fields", u);
        chrome.tabs.sendMessage(activetab.id, { "cmd": "fillfields", "u": u, "p": "", "readyForClick": true });
    }
}
function setfocus(element) {
    element.focus();
}
function defaultfocus() {
    if (!get("siteun").value) setfocus(get("siteun"));
    if (!get("sitename").value) setfocus(get("sitename"));
    if (!get("superpw").value) setfocus(get("superpw"));
}
function ask2generate() {
    var computed = "";
    if (!(bg.settings || bg.settings.allowlower || bg.settings.allownumber)) {
        msgon("nopw");
    } else {
        msgoff("nopw");
        computed = generate(bg);
        if (computed) {
            msgoff("nopw");
        } else {
            computed = "";
            if (get("superpw").value) {
                msgon("nopw");
            }
        }
    }
    let provided = stringXorArray(computed, bg.settings.xor);
    if (logging) console.log("popup filling sitepw field", computed);
    get("sitepw").value = provided;
    hidesitepw();
    const report = zxcvbn(provided);
    get("sitepw").style.color = strengthColor[report.score];
    return computed;
}
function fill() {
    if (bg.settings[domainname]) {
        if (!get("siteun").value) get("siteun").value = bg.settings.username;
        if (!get("sitename").value) get("sitename").value = bg.settings.sitename;
    } else {
        bg.settings.domainname = getlowertrim("domainname");
        bg.settings.sitename = getlowertrim("sitename");
        bg.settings.username = getlowertrim("siteun");
    }
    get("superpw").value = bg.superpw || "";
    if (logging) console.log("popup fill with", bg.settings.domainname, isSuperPw(bg.superpw), bg.settings.sitename, bg.settings.username);
    get("providesitepw").checked = bg.settings.providesitepw;
    if (get("superpw").value && get("sitename").value && get("siteun").value) {
        get("providesitepw").disabled = false;
    } else {
        get("providesitepw").disabled = true;
    }
    if (logging) console.log("popup sitename username disabled", get("sitename").value, get("siteun").value, get("providesitepw").disabled);
    if (get("providesitepw").checked && get("sitename").value && get("siteun").value) {
        get("sitepw").readOnly = false;
        get("sitepw").placeholder = "Enter your super password";
        get("superpw").focus();
    } else {
        get("sitepw").readOnly = true;
        get("sitepw").placeholder = "Generated site password";
        defaultfocus();
    }
    get("clearsuperpw").checked = database.clearsuperpw;
    get("hidesitepw").checked =  database.hidesitepw;
    hidesitepw();
    get("pwlength").value = bg.settings.pwlength;
    get("startwithletter").checked = bg.settings.startwithletter;
    get("minnumber").value = bg.settings.minnumber;
    get("minlower").value = bg.settings.minlower;
    get("minupper").value = bg.settings.minupper;
    get("minspecial").value = bg.settings.minspecial;
    get("specials").value = bg.settings.specials;
    ask2generate();
}
function showsettings() {
    get("settingsshow").style.display = "none";
    get("settingssave").style.display = "inline";
    get("settings").style.display = "block";
    //get("domainname").value = bg.settings.domainname;
    get("superpw").value = bg.superpw || "";
    fill();
    pwoptions(["lower", "upper", "number", "special"]);
}
function hidesettings() {
    get("settingsshow").style.display = "inline";
    get("settingssave").style.display = "none";
    get("settings").style.display = "none";
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
function sitedataHTML() {
    var domainnames = database.domains
    var sitenames = database.sites;
    var sorted = Object.keys(domainnames).sort(function (x, y) {
        if (x.toLowerCase() < y.toLowerCase()) return -1;
        if (x.toLowerCase() == y.toLowerCase()) return 0;
        return 1;
    });
    let workingdoc = document.implementation.createHTMLDocument("SitePassword Data");
    let doc = sitedataHTMLDoc(workingdoc, sorted);
    let sd = doc.outerHTML
    let url = "data:text/html," + encodeURIComponent(sd);
    chrome.tabs.create({ "url": url }).then((e) => {
        if (logging) console.log("popup downloaded settings");
    }).catch((e) => {
        // Can't SaveAs on Chrome
        let w = window.open();
        sitedataHTMLDoc(w.document, sorted);
    });
    return sd;
}
function sitedataHTMLDoc(doc, sorted) {
    let body = doc.getElementsByTagName("body")[0];
    let table = addElement(body, "table");
    tableCaption(table);
    let headings = ["Domain Name", "Site Name", "User Name", "Password Length", "Start with Letter",
        "Allow Lower", "Min Lower", "Allow Upper", "Min Upper", "Allow Numbers", "Min Numbers",
        "Allow Specials", "Min Specials", "Specials", "Code for User Provided Passwords"];
    tableHeader(table, headings);
    for (let i = 0; i < sorted.length; i++) {
        let tr = addElement(table, "tr");
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
        if ( settings[0] === "carbonite") { chrome.storage.local.set({"settings": settings})};
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
function specialclick() {
    var minspecial = get("minspecial");
    var specials = get("specials");
    if (get("allowspecial").checked) {
        minspecial.disabled = false;
        minspecial.value = 0;
        specials.disabled = false;
        specials.value = "/!=@?._-";
    } else {
        minspecial.disabled = true;
        minspecial.value = "";
        specials.disabled = true;
        specials.value = "";
    }
    bg.settings.characters = bg.characters(bg.settings);
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
    { name: "phishing", ison: false, transient: false },
    { name: "http", ison: false, transient: false },
    { name: "nopw", ison: false, transient: false },
    { name: "zero", ison: false, transient: false },
    { name: "multiple", ison: false, transient: false }
];
function msgon(msgname) {
    message(msgname, true);
}
function msgoff(msgname) {
    message(msgname, false);
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
}
function clearDatalist(listid) {
    let datalist = get(listid);
    if (datalist.hasChildNodes) {
        const newDatalist = datalist.cloneNode(false);
        datalist.replaceWith(newDatalist);
    }
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
function instructionSetup() {
    get("overviewinfo").onclick = function () { sectionClick("overview"); };
    get("basicinfo").onclick = function () { sectionClick("basic") };
    get("superinfo").onclick = function () { sectionClick("super"); };
    get("siteinfo").onclick = function () { sectionClick("site"); };
    get("clipboardinfo").onclick = function () { sectionClick("clipboard"); };
    get("acceptableinfo").onclick = function () { sectionClick("acceptable"); };
    get("changeinfo").onclick = function () { sectionClick("change"); };
    get("phishinginfo").onclick = function () { sectionClick("phishing"); };
    get("downloadinfo").onclick = function () { sectionClick("download"); };
    get("sharedinfo").onclick = function () { sectionClick("shared"); };
    get("sourceinfo").onclick = function () { sectionClick("source"); };
    get("paymentinfo").onclick = function () { sectionClick("payment"); };
    // Safari doesn't support the bookmarks API
    if (!chrome.bookmarks) {
        get("sharedinfo").style.display = "none";
    }
    get("syncinfo").onclick = function () { 
        if (chrome.bookmarks) {
            sectionClick("sync");
        } else {
            sectionClick("syncSafari");
        }
    }
    get("extensioninfo").onclick = function () {
        if (chrome.bookmarks) {
            sectionClick("extension");
        } else {
            sectionClick("extensionSafari");
        } 
    };
    function sectionClick(id) {
        const element = get(id + "div");
        if (element.style.display === "none") {
            element.style.display = "block";
            get("open" + id).style.display = "none";
            get("close" + id).style.display = "block";
        } else {
            element.style.display = "none";
            get("open" + id).style.display = "block";
            get("close" + id).style.display = "none";
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
