'use strict';
import { characters, generate } from "./generate.js";
console.log("Version 0.99");
var activetab;
var domainname;
var persona;
var bg = {};
// I need all the metadata stored in hpSPG for both the phishing check
// and for downloading the site data.
var hpSPG;
console.log("popup starting");
// window.onunload appears to only work for background pages, which
// no longer work.  Fortunately, using the password requires a click
// outside the popup window.  I can't use window.onblur because the 
// popup window closes before the message it sends gets delivered.

window.onload = function () {
    console.log("popup getting active tab");
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
        activetab = tabs[0];
        console.log("popup tab", activetab);
        domainname = activetab.url.split("/")[2];
        get("domainname").value = domainname;
        console.log("popup got tab", domainname, activetab);
        console.log(Date.now(), "popup getting metadata");
        getMetadata();
    });
    eventSetup();
}
function init() {
    console.log("islegacy " + bg.legacy);
    get("masterpw").value = bg.masterpw;
    get("sitename").value = bg.settings.sitename;
    get("username").value = bg.settings.username;
    if (bg.settings.sitename) {
        get("forgetbutton").style.visibility = "visible";
    }
    persona = hpSPG.personas[getlowertrim("persona")];
    defaultfocus();
    ask2generate();
}
async function getMetadata() {
    getsettings(() => {
        message("zero", bg.pwcount === 0);
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
        "personaname": getlowertrim("persona"),
        "sitename": getlowertrim("sitename")
    }, (response) => {
        bg = response.bg;
        hpSPG = response.hpSPG;
        if (!bg.settings.sitename) bg.settings.sitename = "";
        get("domainname").value = bg.settings.domainname;
        get("masterpw").value = response.masterpw;
        gotMetadata();
    });
}
function eventSetup() {
    // This function sends a message to the service worker when the mouse leaves the 
    // outermost div on the window.  When the user clicks outside the popup, the window
    // loses focus and closes.  Any messages in flight will be lost.  That means there
    // is a race between message delivery and the next user click.  Fortunately, messages
    // are delivered in just a couple of ms, so there's no problem.  Just be aware that
    // this race is the source of any problems related to loss of the message sent here.
    get("ssp").onmouseleave = function () {
        console.log(Date.now(), "popup window.mouseleave", bg);
        // window.onblur fires before I even have a chance to see the window, much less focus it
        if (bg.settings) {
            bg.lastpersona = getlowertrim("persona");
            bg.masterpw = get("masterpw").value;
            bg.settings.sitename = get("sitename").value;
            if (bg.settings.sitename) {
                persona.sitenames[bg.settings.sitename] = clone(bg.settings);
                persona.sites[bg.settings.domainname] = bg.settings.sitename;
            } else {
                delete persona.sites[bg.settings.domainname];
            }
            let s = get("sitename").value;
            changePlaceholder();
            let personaname = getlowertrim("persona");
            let domainname = get("domainname").value;
            bg.settings.domainname = domainname;
            console.log("popup sending site data", personaname, domainname, bg);
            chrome.runtime.sendMessage({ "cmd": "siteData",
                "personaname": personaname, 
                "sitename": s, 
                "bg": bg });
        }
        // It would be nice to close the window here, but the contents script doesn't work if I do
        // window.close()
    }
    // UI Event handlers
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
        console.log("popup masterpw onblur");
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
    get("sitepass").onclick = copyToClipboard;
    get("settingsshowbutton").onclick = showsettings;
    get("settingshidebutton").onclick = hidesettings;
    get("forgetbutton").onclick = forgetDomain;
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
        var sitename = get("sitename").value;
        bg.settings = clone(persona.sitenames[sitename]);
        bg.settings.sitename = get("sitename").value;
        persona.sites[get("domainname").value] = bg.settings.sitename;
        get("username").value = bg.settings.username;
        ask2generate();
    }
    get("cancelwarning").onclick = function () {
        msgoff("phishing");
        get("domainname").value = "";
        chrome.tabs.update(activetab.id, { url: "chrome://newtab" });
        window.close();
    }
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
        console.log("popup sending fill fields", u);
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
        msgoff("multiple");
        msgoff("zero");
    } else if ((r.r === 0) && u && n && m && "https:" == bg.protocol) {
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
function forgetDomain() {
    if (get("username").value) {
        get("sitename").value = "";
        get("username").value = "";
        get("forgetbutton").style.visibility = "hidden";
        let personaname = get("persona").value.toLowerCase();
        bg.settings = hpSPG.personas[personaname].sitenames.default;
        bg.settings.sitename = "";
        ask2generate();
        chrome.runtime.sendMessage({
            "cmd": "forget",
            "persona": get("persona").value,
            "domainname": get("domainname").value
        }, (response) => {
            hpSPG = response;
        });
        chrome.tabs.sendMessage(activetab.id, { "cmd": "forget" })
    };
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
    let sitepass = get("sitepass").value;
    console.log("popup copy sitepass to clipboard", sitepass);
    navigator.clipboard.writeText(sitepass);
    setTimeout(function () {
        navigator.clipboard.writeText("");
     }, 60000);
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
