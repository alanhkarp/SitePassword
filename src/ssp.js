'use strict';
import { characters, generate } from "./generate.js";
console.log("Version 0.99");
var activetab;
var domainname;
var persona;
var bg;
var hpSPG;
console.log("popup starting");
// window.onunload appears to only work for background pages, which
// no longer work.  Fortunately, using the password requires a click
// outside the popup window.
window.onblur = function () {
    if (bg) {
        console.log(Date.now(), "popup sending", { "cmd": "persistMetadata", "bg": bg });
        chrome.runtime.sendMessage({ "cmd": "persistMetadata", "bg": bg });
    }
}
window.onunload = function () {
    alert("popup unloading");
}
function init() {
    console.log("islegacy " + bg.legacy);
    get("persona").value = bg.lastpersona;
    get("domainname").value = bg.settings.domainname;
    get("sitename").value = bg.settings.sitename;
    get("username").value = bg.settings.username;
    domainname = bg.settings.domainname;
    persona = hpSPG.personas[bg.lastpersona];
    ask2generate();
}
function getMetadata() {
    getsettings(() => {
        message("zero", bg.pwcount === 0);
        message("multiple", bg.pwcount > 1);
        init();
        console.log("popup got metadata", bg, hpSPG);
        if (chrome.runtime.lastError) console.log("popup lastError", chrome.runtime.lastError);
    });
}
function getsettings(gotMetadata) {
    // var sitename = getlowertrim("sitename");
    console.log("popup getting metadata", domainname);
    chrome.runtime.sendMessage({
        "cmd": "getMetadata",
        "domainname": domainname,
        "persona": getlowertrim("persona"),
        "sitename": getlowertrim("sitename")
    }, (response) => {
        bg = response.bg;
        hpSPG = response.hpSPG;
        let masterpw = response.masterpw;
        get("masterpw").value = masterpw;
        gotMetadata();
    });
}
window.onload = function () {
    console.log("popup getting active tab");
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
        activetab = tabs[0];
        domainname = activetab.url.split("/")[2];
        get("domainname").value = domainname;
        console.log("popup got tab", domainname, activetab);
        console.log(Date.now(), "popup getting metadata");
        getMetadata();
    });
    // UI Event handlers
    get("ssp").onblur = function () {
        bg.settings.sitename = get("sitename").value;
        if (bg.settings.sitename) {
            persona.sitenames[bg.settings.sitename] = clone(bg.settings);
            persona.sites[bg.settings.domainname] = bg.settings.sitename;
        } else {
            delete persona.sites[bg.settings.domainname];
        }
        bg.lastpersona = getlowertrim("persona").value;
        if (bg.pwcount != 1 &&
            get("sitepass").value &&
            !isphishing(get("sitename").value)) {
            copyToClipboard();
        }
        let masterpw = get("masterpw").value;
        chrome.runtime.sendMessage({ "cmd": "siteData", "masterpw": masterpw, "sitename": sitename, "settings": bg.settings });
    }
    get("persona").onkeyup = function () {
        get("masterpw").value = "";
        get("sitename").value = "";
        get("username").value = "";
        get("sitepass").value = "";
        bg.masterpw = "";
    }
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
    get("masterpw").onkeyup = function () {
        bg.masterpw = get("masterpw").value;
        ask2generate();
    }
    get("masterpw").onblur = function () {
        handleblur("masterpw", "masterpw");
        changePlaceholder();
    }
    get("sitename").onkeyup = function () {
        handlekeyup("sitename", "sitename");
    }
    get("sitename").onblur = function () {
        if (isphishing(bg.settings.sitename)) {
            msgon("phishing");
            get("domainname").value = bg.settings.domainname;
            get("masterpw").disabled = true;
            get("username").disabled = true;
            get("sitepass").value = "";
        } else {
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
    get("settingsshowbutton").onclick = showsettings;
    get("settingshidebutton").onclick = hidesettings;
    get("clearmasterpw").onclick = function () {
        persona.clearmasterpw = get("clearmasterpw").checked;
    }
    get("pwlength").onblur = function () {
        handleblur("pwlength", "length");
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
    get("minupper").onmouseleave = function () {
        handleblur("minupper", "minupper");
    }
    get("minnumber").onmouseleave = function () {
        handleblur("minnumber", "minnumber");
    }
    get("minspecial").onmouseleave = function () {
        handleblur("minspecial", "minspecial");
    }
    get("specials").onmouseleave = function () {
        handleblur("specials", "specials");
    }
    get("sitedatagetbutton").onclick = sitedataHTML;
    get("warningbutton").onclick = function () {
        get("masterpw").disabled = false;
        get("username").disabled = false;
        get("sitename").disabled = false;
        msgoff("phishing");
        var n = get("sitename").value;
        bg.settings = clone(persona.sitenames[n]);
        persona.sites[get("domainname").value] = bg.settings.sitename;
        get("username").value = bg.settings.username;
        ask2generate();
    }
    get("cancelwarning").onclick = function () {
        msgoff("phishing");
        get("domainname").value = "";
        chrome.tabs.update(activtab.id, { url: "chrome://newtab" });
        window.close();
    }
}
function handlekeyup(element, field) {
    handleblur(element, field);
}
function handleblur(element, field) {
    bg.settings[field] = get(element).value;
    bg.settings.characters = characters(bg.settings, hpSPG);
    ask2generate();
}
function handleclick(which) {
    bg.settings["allow" + which] = get("allow" + which + "checkbox").checked;
    pwoptions([which]);
    if (!(bg.settings.allowupper || bg.settings.allowlower)) {
        bg.settings.startwithletter = false;
        get("startwithletter").checked = false;
    }
    bg.settings.characters = characters(bg.settings, hpSPG)
    ask2generate();
}
function changePlaceholder() {
    let u = get("username").value
    if (get("masterpw").value && get("sitename").value && u) {
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
        get("sitepass").value = "";
    }
}
function ask2generate() {
    var u = get("username").value;
    var n = get("sitename").value;
    var m = get("masterpw").value;
    var p = "";
    if (!(bg.settings || bg.settings.allowlower || bg.settings.allownumber)) {
        msgon("nopw");
    } else {
        msgoff("nopw");
        var r = generate(bg, hpSPG);
        p = r.p;
        if (p) {
            msgoff("nopw");
        } else {
            p = "";
            if (get("masterpw").value) {
                msgon("nopw");
            }
        }
    }
    get("sitepass").value = p;
    if ((r.r == 1) && u && n && m && "https:" == bg.protocol) {
        chrome.tabs.sendMessage(activetab.id, { "cmd": "fillfields", "u": u, "p": "", "readyForClick": false });
        msgoff("multiple");
        msgoff("zero");
    } else {
        if (m) {
            chrome.tabs.sendMessage(activetab.id, { "cmd": "fillfields", "u": u, "p": "", "readyForClick": false });
        }
        message("multiple", r.r > 1);
        message("zero", r.r == 0);
    }
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
    console.log("popup fill with", bg.settings.domainname, bg.masterpw, bg.settings.sitename, bg.settings.username);
    get("clearmasterpw").checked = bg.lastpersona.clearmasterpw;
    get("pwlength").value = bg.settings.length;
    get("startwithletter").checked = bg.settings.startwithletter;
    get("minnumber").value = bg.settings.minnumber;
    get("minlower").value = bg.settings.minlower;
    get("minupper").value = bg.settings.minupper;
    get("minspecial").value = bg.settings.minspecial;
    get("specials").value = bg.settings.specials;
    ask2generate();
}
function showsettings() {
    get("settingsshowbutton").style.display = "none";
    get("settingshidebutton").style.display = "inline";
    get("domainname").value = bg.settings.domainname;
    get("masterpw").value = bg.masterpw;
    fill();
    get("settings").style.display = "block";
    pwoptions(["lower", "upper", "number", "special"]);
}
function hidesettings() {
    get("settingsshowbutton").style.display = "inline";
    get("settingshidebutton").style.display = "none";
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
    var sites = persona.sites
    var sitenames = persona.sitenames;
    var sorted = Object.keys(sites).sort(function (x, y) {
        var a = x.toLowerCase();
        var b = y.toLowerCase();
        if (sites[a].toLowerCase() < sites[b].toLowerCase()) return -1;
        if (sites[a].toLowerCase() == sites[b].toLowerCase()) return 0;
        return 1;
    });
    var sd = "<html><body><table>";
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
        var sitename = sites[sorted[i]];
        var s = sitenames[sitename];
        sd += "<tr>";
        sd += "<td><pre>" + sitename + "</pre></td>";
        sd += "<td><pre>" + domainname + "</pre></td>";
        sd += "<td><pre>" + s.username + "</pre></td>";
        sd += "<td><pre>" + s.length + "</pre></td>";
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
    var download = get("data");
    download.href = download.href.replace("xxx", sd);
    download.click();
    return sd;
}
function isphishing(sitename) {
    if (!sitename) return false;
    var personaname = getlowertrim("persona");
    var persona = hpSPG.personas[personaname];
    var domainname = getlowertrim("domainname");
    var domains = Object.keys(persona.sites);
    var phishing = false;
    domains.forEach(function (d) {
        if ((persona.sites[d].toLowerCase().trim() == sitename.toLowerCase().trim()) &&
            (d.toLowerCase().trim() != domainname)) phishing = true;
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
function copyToClipboard() {
    let sitepass = get("sitepass").innerHTML;
    navigator.clipboard.writeText(sitepass);
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
