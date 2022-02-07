'use strict';
import {generate} from "./generate.js";
console.log("Version 0.99");
var persona;
var bg;
console.log("popup starting");
// window.onunload appears to only work for background pages, which
// no longer work.  Fortunately, using the password requires a click
// outside the popup window.
window.onblur = function () {
    if (bg) {
        console.log("ssp sending bg", bg);
        chrome.runtime.sendMessage({"cmd": "persistMetadata", "bg": bg});
    }
}
window.onunload = function () {
    alert("popup unloading");
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("popup got message", request, sender);
    if (request.metadata) {
        bg = request.metadata;
        console.log("islegacy " + bg.legacy);
        message("zero", bg.pwcount === 0);
        message("multiple", bg.pwcount > 1);
        init();
     } else if (request.cmd === "getPassword") {
        let p = get("sitepass").value;
        console.log("popup sending", p);
        sendResponse(p);
    }
    return true;
});
window.onload = async function () {
    console.log("Popup window loaded");
    if (bg) {
        console.log("popup: bg is defined");
        return;
    }
    console.log("popup: bg is not defined");
    chrome.runtime.sendMessage({ "cmd": "getMetadata"});
    get("ssp").onmouseleave = function () {
        bg.settings.sitename = get("sitename").value;
        if (bg.settings.sitename) {
            persona.sitenames[bg.settings.sitename] = clone(bg.settings);
            persona.sites[bg.settings.domainname] = bg.settings.sitename;
        } else {
            delete persona.sites[bg.settings.domainname];
        }
        bg.hpSPG.lastpersona = get("persona").value;
        if (bg.pwcount != 1 &&
            get("sitepass").value &&
            !isphishing(get("sitename").value)) {
            copyToClipboard();
        }
    }
    get("persona").onkeyup = function () {
        get("masterpw").value = "";
        get("sitename").value = "";
        get("username").value = "";
        get("sitepass").value = "";
        bg.masterpw = "";
    }
    get("persona").onblur = function () {
        getsettings();
        fill();
        bg.hpSPG.lastpersona = get("persona").value;
        bg.masterpw = "";
        get("masterpw").value = "";
    }
    get("domainname").onkeyup = function () {
        get("sitename").value = "";
    }
    get("domainname").onblur = function () {
        get("sitename").value = "";
        getsettings();
        fill();
        ask2generate();
    }
    get("masterpw").onkeyup = function () {
        bg.masterpw = get("masterpw").value;
        ask2generate();
    }
    get("masterpw").onblur = function () {
        console.log("ssp sending masterpw to bg", get("masterpw").value);
        chrome.runtime.sendMessage({"masterpw": get("masterpw").value, "sitepass": get("sitepass").value});
    }
    get("sitename").onkeyup = function () {
        handlekeyup("sitename", "sitename");
    }
    get("sitename").onblur = function () {
        getsettings();
        bg.settings.domainname = get("domainname").value;
        bg.settings.sitename = get("sitename").value;
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
        }
    }
    get("username").onkeyup = function () {
        handlekeyup("username", "username");
    }
    get("username").onblur = function () {
        handleblur("username", "username");
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
    get("minlower").onblur = function () {
        handleblur("minlower", "minlower");
    }
    get("minupper").onblur = function () {
        handleblur("minupper", "minupper");
    }
    get("minnumber").onblur = function () {
        handleblur("minnumber", "minnumber");
    }
    get("minspecial").onblur = function () {
        handleblur("minspecial", "minspecial");
    }
    get("specials").onblur = function () {
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
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tab) {
            chrome.tabs.update(tab[0].id, { url: "chrome://newtab" });
            window.close();
        });
    }
}
function handlekeyup(element, field) {
    handleblur(element, field);
}
function handleblur(element, field) {
    bg.settings[field] = get(element).value;
    bg.settings.characters = characters(bg.settings);
    ask2generate();
}
function handleclick(which) {
    bg.settings["allow" + which] = get("allow" + which + "checkbox").checked;
    pwoptions([which]);
    if (!(bg.settings.allowupper || bg.settings.allowlower)) {
        bg.settings.startwithletter = false;
        get("startwithletter").checked = false;
    }
    bg.settings.characters = characters(bg.settings)
    ask2generate();
}
function setfocus(element) {
    element.focus();
}
function init() {
    persona = bg.hpSPG.personas[bg.hpSPG.lastpersona.toLowerCase()];
    get("persona").value = persona.personaname;
    bg.settings = clone(persona.sitenames.default);
    var a = document.createElement('a');
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        bg.activetab = tabs[0];
        a.href = tabs[0].url;
        if (persona.sites[a.hostname]) {
            bg.settings = clone(persona.sitenames[persona.sites[a.hostname]]);
        }
        bg.protocol = a.protocol;
        get("domainname").value = a.hostname;
        bg.settings.domainname = a.hostname;
        bg.settings.url = a.href;
        fill();
        defaultfocus();
    });
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
function getsettings() {
    var personaname = getlowertrim("persona");
    var domainname = getlowertrim("domainname");
    // var sitename = getlowertrim("sitename");
    persona = bg.hpSPG.personas[personaname];
    if (!persona) {
        bg.hpSPG.personas[personaname] = clone(bg.hpSPG.personas.default);
        persona = bg.hpSPG.personas[personaname];
        bg.settings = clone(persona.sitenames.default);
        persona.personaname = get("persona").value;
        bg.settings.domainname = domainname;
        bg.settings.characters = bg.characters(bg.settings);
    }
    if (persona.sites[domainname]) {
        bg.settings = clone(persona.sitenames[persona.sites[domainname]]);
    } else {
        bg.settings = clone(persona.sitenames.default);
        bg.settings.domainname = domainname;
    }
    return bg.settings;
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
        var r = generate(bg);
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
        chrome.tabs.sendMessage(bg.activetab.id,
            { cmd: "fillfields", "u": u, "p": "" });
        msgoff("multiple");
        msgoff("zero");
    } else {
        if (m) chrome.tabs.sendMessage(bg.activetab.id,
            { cmd: "fillfields", "u": u, "p": "" });
        message("multiple", r.r > 1);
        message("zero", r.r == 0);
    }
    return true;
}
function characters(settings) {
    let hpSPG = bg.hpSPG;
    let chars = hpSPG.lower + hpSPG.upper + hpSPG.digits + hpSPG.lower.substr(0, 2);
    if (settings.allowspecial) {
        if (bg.legacy) {
            // Use for AntiPhishing Toolbar passwords
            chars = chars.substr(0, 32) + settings.specials.substr(1) + chars.substr(31 + settings.specials.length);
        } else {
            // Use for SitePassword passwords
            chars = settings.specials + hpSPG.lower.substr(settings.specials.length - 2) + hpSPG.upper + hpSPG.digits;
        }
    }
    if (!settings.allowlower) chars = chars.toUpperCase();
    if (!settings.allowupper) chars = chars.toLowerCase();
    if (!(settings.allowlower || settings.allowupper)) {
        chars = hpSPG.digits + hpSPG.digits + hpSPG.digits +
            hpSPG.digits + hpSPG.digits + hpSPG.digits;
        if (settings.allowspecials) {
            chars = chars + persona.specials.substr(0, 4);
        } else {
            chars = chars + hpSPG.digits.substr(0, 4);
        }
    }
    return chars;
}
function fill() {
    if (persona.sites[bg.settings.domainname]) {
        if (!get("username").value) get("username").value = bg.settings.username;
        if (!get("sitename").value) get("sitename").value = bg.settings.sitename;
    } else {
        bg.settings.domainname = getlowertrim("domainname").value;
        bg.settings.sitename = getlowertrim("sitename");
        bg.settings.username = getlowertrim("username");
    }
    get("masterpw").value = bg.masterpw;
    console.log("ssp fill with", bg.settings.domainname, bg.masterpw, bg.settings.sitename, bg.settings.username);
    get("clearmasterpw").checked = persona.clearmasterpw;
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
    // var stored = bg.retrieveObject("hpSPG");
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
    var domainname = get("domainname").value.toLowerCase().trim();
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
