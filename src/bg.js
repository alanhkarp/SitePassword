'use strict';
import { characters, generate } from "./generate.js";
// State I want to keep around that doesn't appear in the file system
var bg = {}; 
var onClipboard = false;
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
console.log("bg clear masterpw");

console.log("bg starting");

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(Date.now(), "bg got message request, sender", request, sender);
    retrieveMetadata().then(() => {
        chrome.storage.session.get(["ssp"], (ssp) => {
            if (ssp.ssp) {
                persona = ssp.ssp.personaname || "default";
                bg.lastpersona = persona;
                masterpw = ssp.ssp.masterpw || "";
                bg.masterpw = masterpw;
                console.log("bg got ssp", persona || "foo", masterpw || "bar");
            }
            if (request.cmd === "getMetadata") {
                getMetadata(request, sender, sendResponse);
            } else if (request.cmd === "siteData") {
                console.log("bg got site data", request);
                onClipboard = request.onClipboard;
                bg = clone(request.bg);
                bg.lastpersona = request.personaname;
                masterpw = bg.masterpw;
                hpSPG.personas[bg.lastpersona].sitenames[request.sitename] = bg.settings;
                persistMetadata(bkmkid);
            } else if (request.cmd === "persistMetadata") {
                console.log("bg request persistMetadata", request.bg);
                bg = clone(request.bg);
                masterpw = bg.masterpw;
                persistMetadata(bkmkid);
            } else if (request.cmd === "getPassword") {
                let domainname = getdomainname(sender.url);
                bg.settings = bgsettings(bg.lastpersona, domainname);
                let pr = generate(bg, hpSPG);
                console.log("bg calculated sitepw", bg, hpSPG, pr, masterpw);
                sendResponse(pr.p);
            } else if (request.clicked) {
                domainname = request.domainname;
                bg.domainname = domainname;
                console.log("bg clicked: sending response", bg);
                sendResponse(bg);
                if (persona.clearmasterpw) {
                    masterpw = "";
                    console.log("bg clear masterpw")
                }
            } else if (request.onload) {
                onContentPageload(request, sender, sendResponse);
            }
            console.log(Date.now(), "bg addListener returning: masterpw", masterpw || "masterpw not defined");
        });
    });
    return true;
});
async function getMetadata(request, _sender, sendResponse) {
    bg.lastpersona = request.personaname;
    let sitename = hpSPG.personas[bg.lastpersona].sites[request.domainname]
    if (sitename) {
        bg.settings = hpSPG.personas[bg.lastpersona].sitenames[sitename];
    } else {
        bg.settings = hpSPG.personas[bg.lastpersona].sitenames.default;
    }
    bg.settings.domainname = request.domainname || domainname;
    console.log("bg sending metadata", bg, hpSPG);
    sendResponse({ "masterpw": masterpw || "", "bg": bg, "hpSPG": hpSPG });
}
function onContentPageload(request, sender, sendResponse) {
    activetab = sender.tab;
    bg.pwcount = request.count;
    protocol = request.protocol;
    pwcount = bg.pwcount;
    domainname = request.domainname || domainname;
    console.log("bg pwcount, domainname, masterpw", bg.pwcount, domainname, masterpw);
    let persona = hpSPG.personas[bg.lastpersona];
    let sitename = persona.sites[domainname];
    if (sitename) {
        bg.settings = persona.sitenames[sitename];
    } else {
        bg.settings = persona.sitenames.default;
    }
    bg.settings.domainname = domainname;
    let readyForClick = false;
    if (masterpw && bg.settings.sitename && bg.settings.username) {
        readyForClick = true;
    }
    let sitepass = "";
    if (bg.pwcount === 0) {
        let pr = generate(bg, hpSPG); 
        sitepass = pr.p;
    }
    console.log(Date.now(), "bg send response", { cmd: "fillfields", "u": bg.settings.username || "", "p": sitepass, "readyForClick": readyForClick });
    sendResponse({ cmd: "fillfields", "u": bg.settings.username || "", "p": sitepass, "readyForClick": readyForClick });
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
                            minlower: 1,
                            minupper: 1,
                            minnumber: 1,
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
    console.log("bg persistMetadata", bg, hpSPG);
    persona = hpSPG.personas[bg.lastpersona];
    if (bg.settings.sitename) {
        persona.sites[domainname] = bg.settings.sitename;
        persona.sitenames[bg.settings.sitename] = bg.settings;
    }
    let update = "ssp://" + JSON.stringify(hpSPG);
    chrome.bookmarks.update(bkmkid, { "url": update });
    chrome.storage.session.set({ "ssp": { "masterpw": masterpw, "personaname": bg.lastpersona } });
}
async function retrieveMetadata() {
    // return JSON.parse(localStorage[name]);
    console.log("Retrieving metadata");
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
    let persona = hpSPG.personas[lastpersona];
    let sitename = persona.sites[domainname];
    let settings;
    if (sitename) {
        settings = persona.sitenames[sitename];
    } else {
         settings = persona.sitenames.default;
    }
    settings.legacy = legacy;
    bg = {
        "activetab": activetab,
        "lastpersona": lastpersona,
        "masterpw": masterpw,
        "protocol": protocol,
        "pwcount": pwcount,
        "settings": settings,
    };
    console.log(Date.now(), "bg leaving retrieiveMetadata", bg, hpSPG);
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
    if (!persona) {
        hpSPG.personas[personaname] = clone(hpSPG.personas.default);
        persona = hpSPG.personas[personaname];
        bg.settings = clone(persona.sitenames.default);
        persona.personaname = personaname;
        bg.settings.domainname = domainname;
        bg.settings.characters = characters(bg.settings, hpSPG);
    }
    if (persona.sites[domainname]) {
        bg.settings = persona.sitenames[persona.sites[domainname]];
    } else {
        bg.settings = persona.sitenames.default;
        bg.settings.domainname = domainname;
    }
    return bg.settings;
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
