// Code that used to run in the Manifest 2 background page but now
// has to run in a tab.  This script is included by sspaux.html.
'use strict';
import { characters, generate } from "./generate.js";
import { binb2hex } from "./sha256.js";
// There might be a better way to make this state available to a bunch
// of closure, but globals are convenient.  Besides, that's what all
// I knew to do when I wrote the first version in 2012.
var bg = {"lastpersona": "everyone"};
var masterpw = "";
var activetab;
var hpSPG = {};
var bkmkid;
var legacy = false;  // true to emulate HP Antiphishing Toolbar
var lastpersona = "everyone";
var domainname = "";
var protocol = "";
var persona;
var pwcount = 0;
var origin = "chrome-extension://" + chrome.runtime.id;
console.log("bg clear masterpw");

console.log("bg starting");

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(Date.now(), "bg got message request, sender", request, sender);
    if (request.cmd === "getMetadata") {
        getMetadata(request, sender, sendResponse);
    } else if (request.cmd === "siteData") {
        masterpw = request.masterpw;
        bg.masterpw = masterpw;
        bg.settings = request.settings;
        hpSPG.personas[bg.lastpersona].sitenames[request.sitename] = request.settings;
        persistMetadata(bkmkid);
        console.log("bg setting masterpw", bg);
    } else if (request.cmd === "persistMetadata") {
        console.log("bg request persistMetadata", request.bg);
        bg = request.bg;
        masterpw = bg.masterpw;
        persistMetadata(bkmkid);
    } else if (request.cmd === "getPassword") {
        let domainname = getdomainname(sender.url);
        bg.settings = bgsettings(bg.lastpersona, domainname);
        let pr = generate(bg, hpSPG);
        console.log("bg calculated sitepw", bg, hpSPG, pr, masterpw);
        sendResponse(pr.p);
    } else if (request.onload) {
        OnContentPageload(request, sender, sendResponse);
    }
    console.log(Date.now(), "bg addListener returning: masterpw", masterpw || "nomasterpw");
    return true;
});
async function getMetadata(request, sender, sendResponse) {
    await retrieveMetadata();
    bg.lastpersona = lastpersona;
    domainname = request.domainname;
    bg.settings = bgsettings(lastpersona, domainname);
    console.log(Date.now(), "bg sending metadata to sender", bg, hpSPG, sender);
    if (sender.origin === origin) {
        sendResponse({ "masterpw": masterpw || "", "bg": bg, "hpSPG": hpSPG });
    } else {
        console.log("bg got message from wrong origin", sender.origin);
    }
}
function OnContentPageload(request, sender, sendResponse) {
    activetab = sender.tab;
    bg.pwcount = request.count;
    protocol = request.protocol;
    pwcount = bg.pwcount;
    domainname = getdomainname(sender.url);
    console.log("bg pwcount, domainname, masterpw", bg.pwcount, domainname, masterpw);
    retrieveMetadata().then(() => {
        bg.settings = bgsettings(bg.lastpersona, domainname);
        let readyForClick = false;
        if (masterpw && bg.settings.sitename && bg.settings.username) {
            readyForClick = true;
        }
        console.log(Date.now(), "bg send response to", { cmd: "fillfields", "u": bg.settings.username || "", "p": "", "readyForClick": readyForClick }, sender);
        sendResponse({ cmd: "fillfields", "u": bg.settings.username || "", "p": "", "readyForClick": readyForClick });
    });
}
function gotMetadata(hpSPGlocal) {
    if (!hpSPGlocal) {
        hpSPGlocal = {
            digits: "0123456789",
            lower: "abcdefghijklmnopqrstuvwxyz",
            upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            specials: "/!=@?._-",
            miniter: 10,
            maxiter: 1000,
            personas: {
                default: {
                    personaname: "default",
                    clearmasterpw: false,
                    sites: {},
                    sitenames: {
                        default: {
                            sitename: "",
                            username: "",
                            length: 12,
                            domainname: "",
                            startwithletter: true,
                            allowlower: true,
                            allowupper: true,
                            allownumber: true,
                            allowspecial: false,
                            minlower: 0,
                            minupper: 0,
                            minnumber: 0,
                            minspecial: 0,
                            specials: "",
                            characters: ""
                        }
                    }
                }
            }
        }
        hpSPG = hpSPGlocal;
        hpSPGlocal.personas.default.sitenames.default.specials = hpSPGlocal.specials;
        let defaultsettings = hpSPGlocal.personas.default.sitenames.default;
        bg.settings = defaultsettings;
        defaultsettings.characters = characters(defaultsettings, hpSPG);
        hpSPGlocal.personas.everyone = clone(hpSPGlocal.personas.default);
        persona = hpSPGlocal.personas.everyone;
        persona.personaname = "Everyone";
        hpSPG = hpSPGlocal;
        persistMetadata(bkmkid);
    }
    hpSPG = hpSPGlocal;
}
async function persistMetadata(bkmkid) {
    // localStorage[name] = JSON.stringify(value);
    persona = hpSPG.personas[bg.lastpersona];
    masterpw = bg.masterpw;
    if (bg.settings.sitename) {
        persona.sites[domainname] = bg.settings.sitename;
        persona.sitenames[bg.settings.sitename] = bg.settings;
    }
    let update = "ssp://" + JSON.stringify(hpSPG);
    await chrome.bookmarks.update(bkmkid, { "url": update });
}
async function retrieveMetadata() {
    // return JSON.parse(localStorage[name]);
    console.log("Retrieving metadata")
    // chrome.storage allows storing objects, but the content is not protected
    // allowing a bad guy to change it.  The best way to avoid problems is 
    // to parse the data from a string.
    let bkmkstr = await chrome.storage.local.get(["bkmkstr"]);
    try {
        let bkmk = JSON.parse(bkmkstr.bkmkstr);
        console.log("bg got bookmark", bkmk);
        if (bkmk) bkmkid = bkmk.bkmkid;
        console.log("Got SSP bookmark ID " + bkmkid);
        bkmk = await chrome.bookmarks.get(bkmkid);
        console.log("Got bookmark: ", bkmk);
        hpSPG = parseBkmk(bkmk[0]);
    } catch (e) {
        // Find ssp bookmark
        let tree = await chrome.bookmarks.getTree();
        console.log("Find SSP bookmark");
        let found = false;
        tree[0].children[0].children.forEach((bkmk, _index) => {
            if (!found && bkmk.url.substring(0, 6) == "ssp://") {
                found = true;
                console.log("Found bookmark: ", bkmk);
                bkmkid = bkmk.id;
                let value = { "bkmkid": bkmkid };
                chrome.storage.local.set({ "bkmk": JSON.stringify(value) });
                hpSPG = parseBkmk(bkmk);
            }
        });
        if (!found) {
            let bkmk = await chrome.bookmarks.create({ "parentId": "1", "title": "SitePasswordData", "url": "ssp://" });
            console.log("Creating SSP bookmark");
            bkmkid = bkmk.id;
            let value = { "bkmkid": bkmkid };
            chrome.storage.local.set({ "bkmkstr": JSON.stringify(value) });
            console.log("Bookmark id: " + bkmkid);
            hpSPG = undefined;
        }
    }
    gotMetadata(hpSPG);
    // Doing it this way because bg.js used to be a background page, 
    // and I don't want to change a lot of code after I moved it to
    // the popup.
    let settings = bgsettings(bg.lastpersona, domainname);
    bg = {
        "activetab": activetab,
        "lastpersona": lastpersona,
        "masterpw": masterpw,
        "legacy": legacy,
        "protocol": protocol,
        "pwcount": pwcount,
        "settings": settings,
    };
    console.log(Date.now(), "bg leaving retrieiveMetadata", settings, bg);
}
function parseBkmk(bkmk) {
    console.log("Parsing bookmark");
    try {
        // JSON.stringify turns some of my " into %22
        hpSPG = JSON.parse(bkmk.url.substr(6).replace(/%22/g, "\""));
    } catch (e) {
        console.error("Error parsing metadata " + e);
        hpSPG = undefined;
    }
    return hpSPG;
}
function bgsettings(personaname, domainname) {
    let persona = hpSPG.personas[personaname];
    let settings = {};
    if (!persona) {
        hpSPG.personas[personaname] = clone(hpSPG.personas.default);
        persona = hpSPG.personas.default;
        settings = clone(persona.sitenames.default);
        persona.personaname = personaname;
        settings.domainname = domainname;
        settings.characters = characters(bg.settings, hpSPG);
    }
    if (persona.sites[domainname]) {
        settings = persona.sitenames[persona.sites[domainname]];
    } else {
        settings = persona.sitenames.default;
        settings.domainname = domainname;
    }
    return clone(settings);
}
function clone(object) {
    return JSON.parse(JSON.stringify(object))
}
function getdomainname(url) {
    return url.split("/")[2];
}
function getprotocol(url) {
    return url.split(":")[0];
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
