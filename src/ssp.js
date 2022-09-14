'use strict';
import { characters, generate, isMasterPw } from "./generate.js";
const testMode = true;
let logging = testMode;
if (logging) console.log("Version 1.0");
var activetab;
var domainname;
const strengthColor = ["#bbb", "#f06", "#f90", "#093", "#036"]; // 0,3,6,9,C,F

var phishing = false;
var bg = { "settings": {} };
// I need all the metadata stored in database for both the phishing check
// and for downloading the site data.
var database;
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
        domainname = activetab.url.split("/")[2];
        get("domainname").value = domainname;
        get("sitepw").value = "";
        if (logging) console.log("popup got tab", domainname, activetab);
        if (logging) console.log(Date.now(), "popup getting metadata");
        getsettings();
        eventSetup();
    });
}
function init() {
    get("masterpw").value = bg.masterpw;
    get("sitename").value = bg.settings.sitename;
    get("username").value = bg.settings.username;
    if (get("masterpw").value) {
        setMasterpwMeter(get("masterpw").value);
    }
    defaultfocus();
    ask2generate();
}
function getsettings() {
    if (logging) console.log("popup getsettings", domainname);
    chrome.runtime.sendMessage({
        "cmd": "getMetadata",
        "domainname": domainname,
    }, (response) => {
        bg = response.bg;
        database = response.database;
        if (!bg.settings.sitename) bg.settings.sitename = "";
        get("masterpw").value = response.masterpw;
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
    get("mainpanel").onmouseleave = function () {
        if (logging) console.log(Date.now(), "popup window.mouseleave", phishing, bg);
        if (phishing) return; // Don't persist phishing sites
        // window.onblur fires before I even have a chance to see the window, much less focus it
        if (bg.settings) {
            bg.masterpw = get("masterpw").value;
            bg.settings.sitename = get("sitename").value.toLowerCase().trim();
            if (bg.settings.sitename) {
                database.sites[bg.settings.sitename] = clone(bg.settings);
                database.domains[bg.settings.domainname] = bg.settings.sitename;
            }
            let s = get("sitename").value.toLowerCase().trim();
            changePlaceholder();
            bg.settings.domainname = domainname;
            if (logging) console.log("popup sending site data", domainname, bg);
            if (!s) chrome.tabs.sendMessage(activetab.id, {"cmd": "clear"});
            chrome.runtime.sendMessage({
                "cmd": "siteData",
                "sitename": s,
                "clearmasterpw": get("clearmasterpw").checked,
                "bg": bg
            });
        }
        // If I close the window immediately, then messages in flight get lost
        setTimeout(() => {
            if (!testMode) window.close();
        }, 500);
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
    const $masterpw = get("masterpw");
    get("masterpw").onkeyup = function () {
        bg.masterpw = get("masterpw").value;
        ask2generate();
        setMasterpwMeter($masterpw.value);
    }
    get("masterpw").onblur = function () {
        if (logging) console.log("popup masterpw onblur");
        handleblur("masterpw", "masterpw");
        changePlaceholder();
}
    get("masterpwshow").onclick = function() {
        get("masterpw").type = "text";
        get("masterpwhide").style.display = "block";
        get("masterpwshow").style.display = "none";
    }
    get("masterpwhide").onclick = function() {
        get("masterpw").type = "password";
        get("masterpwhide").style.display = "none";
        get("masterpwshow").style.display = "block";
    }
    get("sitename").onkeyup = function () {
        handlekeyup("sitename", "sitename");
    }
    get("sitename").onblur = function () {
        if (isphishing(bg.settings.sitename)) {
            phishing = true;
            msgon("phishing");
            // bg.settings.domainname;
            get("masterpw").disabled = true;
            get("username").disabled = true;
            get("sitepw").value = "";
        } else {
            phishing = false;
            msgoff("phishing");
            get("masterpw").disabled = false;
            get("username").disabled = false
            handleblur("sitename", "sitename");
            changePlaceholder();
        }
    }
    get("username").onkeyup = function () {
        handlekeyup("username", "username");
    }
    get("username").onblur = function () {
        handleblur("username", "username");
        changePlaceholder();
    }
    get("sitepwcopy").onclick = function () {
        let sitepass = get("sitepw").value;
        navigator.clipboard.writeText(sitepass).then(() => {
            if (logging) console.log("findpw wrote to clipboard", sitepass);
        }).catch((e) => {
            if (logging) console.log("findpw clipboard write failed", e);
        });
    };
    get("sitepwhide").onclick = function() {
        get("sitepw").type = "password";
        get("sitepwhide").style.display = "none";
        get("sitepwshow").style.display = "block";
    }
    get("sitepwshow").onclick = function() {
        get("sitepw").type = "text";
        get("sitepwhide").style.display = "block";
        get("sitepwshow").style.display = "none";
    }
    get("settingsshow").onclick = showsettings;
    get("settingssave").onclick = hidesettings;
    get("clearmasterpw").onclick = function () {
        database.clearmasterpw = get("clearmasterpw").checked;
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
    const alphanumerics = /[0-9A-Za-z]/g;
    get("specials").onkeyup = function() {
        let specials = get("specials");
        specials.value = specials.value
            .replace(alphanumerics, '')  // eliminate alphanumerics
            .substring(0, 12);  // limit to 12 specials
        bg.settings.specials = specials.value;
        handlekeyup("specials");
    }
    get("sitedatagetbutton").onclick = sitedataHTML;
    get("maininfo").onclick = function () {
        chrome.tabs.create({ "url": "https://sitepassword.info/instructions.html" });
    }
    get("warningbutton").onclick = function () {
        phishing = false;
        get("masterpw").disabled = false;
        get("username").disabled = false;
        get("sitename").disabled = false;
        msgoff("phishing");
        var sitename = get("sitename").value.toLowerCase().trim();
        bg.settings = clone(database.sites[sitename]);
        bg.settings.sitename = get("sitename").value;
        database.domains[get("domainname").value] = bg.settings.sitename;
        get("username").value = bg.settings.username;
        ask2generate();
    }
    get("cancelwarning").onclick = function () {
        phishing = true;
        msgoff("phishing");
        get("domainname").value = "";
        get("sitename").value = "";
        get("username").value = "";
        chrome.tabs.update(activetab.id, { url: "chrome://newtab" });
        window.close();
    }
}
function setMasterpwMeter(pw) {
    const $masterpw = get("masterpw");
    const strengthText = ["Don't Use", "Bad", "Weak", "Good", "Strong"];
    const $meter = get("password-strength-meter");
    const $meterText = get("password-strength-text");
    const report = zxcvbn(pw);
    $meter.value = report.score;
    $meterText.innerHTML = strengthText[report.score];
    $masterpw.style.color = strengthColor[report.score];
    $masterpw.title = strengthText[report.score] + " Master Password";
}

function handlekeyup(element, field) {
    handleblur(element, field);
}
function handleblur(element, field) {
    if (element === "masterpw") {
        bg.masterpw = get(element).value;
    } else {
        bg.settings[field] = get(element).value;
    }
    bg.settings.characters = characters(bg.settings, database);
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
    let u = get("username").value
    if (get("masterpw").value && get("sitename").value && u) {
        if (logging) console.log("popup sending fill fields", u);
        chrome.tabs.sendMessage(activetab.id, { "cmd": "fillfields", "u": u, "p": "", "readyForClick": true });
    }
}
function setfocus(element) {
    element.focus();
}
function defaultfocus() {
    if (!get("username").value) setfocus(get("username"));
    if (!get("sitename").value) setfocus(get("sitename"));
    if (!get("masterpw").value) setfocus(get("masterpw"));
}
function clearmasterpw() {
    if (get("clearmasterpw").checked) {
        bg.masterpw = "";
        get("masterpw").value = bg.masterpw;
        get("sitepw").value = "";
    }
}
function ask2generate() {
    var p = "";
    if (!(bg.settings || bg.settings.allowlower || bg.settings.allownumber)) {
        msgon("nopw");
    } else {
        msgoff("nopw");
        p = generate(bg);
        if (p) {
            msgoff("nopw");
        } else {
            p = "";
            if (get("masterpw").value) {
                msgon("nopw");
            }
        }
    }
    if (logging) console.log("popup filling sitepw field", p);
    get("sitepw").value = p;
    const report = zxcvbn(p);
    get("sitepw").style.color = strengthColor[report.score];
return true;
}
function fill() {
    if (bg.settings[domainname]) {
        if (!get("username").value) get("username").value = bg.settings.username;
        if (!get("sitename").value) get("sitename").value = bg.settings.sitename;
    } else {
        bg.settings.domainname = getlowertrim("domainname");
        bg.settings.sitename = getlowertrim("sitename");
        bg.settings.username = getlowertrim("username");
    }
    get("masterpw").value = bg.masterpw;
    if (logging) console.log("popup fill with", bg.settings.domainname, isMasterPw(bg.masterpw), bg.settings.sitename, bg.settings.username);
    get("clearmasterpw").checked = database.clearmasterpw;
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
    //get("domainname").value = bg.settings.domainname;
    get("masterpw").value = bg.masterpw;
    fill();
    get("settings").style.display = "block";
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
        var a = x.toLowerCase();
        var b = y.toLowerCase();
        if (domainnames[a].toLowerCase() < domainnames[b].toLowerCase()) return -1;
        if (domainnames[a].toLowerCase() == domainnames[b].toLowerCase()) return 0;
        return 1;
    });
    let sd = ""
    sd += "<html><body><table>";
    sd += "<tr>";
    sd += "<th>Site Name</th>";
    sd += "<th>Domain Name</th>";
    sd += "<th>User Name</th>";
    sd += "<th>Password Length</th>";
    sd += "<th>Start with Letter</th>";
    sd += "<th>Allow Lower</th>";
    sd += "<th>Min Lower</th>";
    sd += "<th>Allow Upper</th>";
    sd += "<th>Min Upper</th>";
    sd += "<th>Allow Numbers</th>";
    sd += "<th>Min Numbers</th>";
    sd += "<th>Allow Specials</th>";
    sd += "<th>Min Specials</th>";
    sd += "<th>Specials</th>";
    sd += "</tr>";
    for (var i = 0; i < sorted.length; i++) {
        var domainname = sorted[i];
        var sitename = domainnames[sorted[i]];
        var s = sitenames[sitename];
        sd += "<tr>";
        sd += "<td><pre>" + sitename + "</pre></td>";
        sd += "<td><pre>" + domainname + "</pre></td>";
        sd += "<td><pre>" + s.username + "</pre></td>";
        sd += "<td><pre>" + s.pwlength + "</pre></td>";
        sd += "<td><pre>" + s.startwithletter + "</pre></td>";
        sd += "<td><pre>" + s.allowlower + "</pre></td>";
        sd += "<td><pre>" + s.minlower + "</pre></td>";
        sd += "<td><pre>" + s.allowupper + "</pre></td>";
        sd += "<td><pre>" + s.minupper + "</pre></td>";
        sd += "<td><pre>" + s.allownumber + "</pre></td>";
        sd += "<td><pre>" + s.minnumber + "</pre></td>";
        sd += "<td><pre>" + s.allowspecial + "</pre></td>";
        sd += "<td><pre>" + s.minspecial + "</pre></td>";
        sd += "<td><pre>" + s.specials + "</pre></td>";
        sd += "</tr>";
    }
    sd += "</table></body></html>";
    let url = "data:application/octet-stream," + encodeURIComponent(sd);
    chrome.downloads.download({
        "url": url,
        "filename": "SiteData.html",
        "conflictAction": "uniquify",
        "saveAs": true
    }, (e) => {
        console.log("ssp download complete", e);
    });
    return sd;
}
function isphishing(sitename) {
    if (!sitename) return false;
    var domainname = getlowertrim("domainname");
    var domains = Object.keys(database.domains);
    var phishing = false;
    domains.forEach(function (d) {
        if ((database.domains[d].toLowerCase().trim() == sitename.toLowerCase().trim()) &&
            (d.toLowerCase().trim() != domainname)) {
            phishing = true;
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
    return document.getElementById(element).value.toLowerCase().trim();
}
function clone(object) {
    return JSON.parse(JSON.stringify(object))
}
// Messages in priority order high to low
var messages = [
    { name: "phishing", ison: false, transient: false },
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