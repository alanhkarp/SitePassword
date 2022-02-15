'use strict';
import { generate } from "./generate.js";
// State I want to keep around that doesn't appear in the file system
var bg;
var activetab;
var hpSPG = {};
var bkmkid;
var legacy = false;  // true to emulate HP Antiphishing Toolbar
var lastpersona = "everyone";
var domainname = "";
var protocol = "";
var persona;
var pwcount = 0;
var settings = {};
console.log("bg clear masterpw");

console.log("bg starting");

retrieveMetadata().then(() => {
    console.log("bg metadata retrieved", { "bg": bg, "hpSPG": hpSPG });
    persona = hpSPG.personas[lastpersona];
    if (persona.sites[domainname]) {
        bg.settings = persona.sitenames[persona.sites[domainname]];
    } else {
        bg.settings = persona.sitenames.default;
    }
})
chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    console.log(Date.now(), "bg.js got message request, sender", request, sender);
    if (request.cmd === "getMetadata") {
        waitForMetadata();
        lastpersona = request.persona;
        domainname = request.domainname;
        console.log("bg.js sending response", bg);
        sendResponse(bg);
    } else if (request.cmd === "siteData") {
        bg.masterpw = request.masterpw;
        hpSPG.personas[bg.lastpersona].sitenames[request.sitename] = request.settings;
        persistMetadata(bkmkid);
        console.log("bg setting masterpw", bg);
    } else if (request.cmd === "persistMetadata") {
        console.log("bg request persistMetadata", request.bg);
        bg = request.bg;
        persistMetadata(bkmkid);
    } else if (request.cmd === "getPassword") {
        let domainname = getdomainname(sender.url);
        bg.settings = bgsettings(bg.lastpersona, domainname);
        let pr = generate(bg);
        console.log("bg calculated sitepw", pr);
        sendResponse(pr.p);
    } else if (request.clicked) {
        domainname = request.domainname;
        console.log("bg clicked: sending response", bg);
        sendResponse(bg);
        if (persona.clearmasterpw) {
            bg.masterpw = "";
            console.log("bg clear masterpw")
        }
    } else if (request.onload, sender) {
            waitForMetadata();
            activetab = sender.tab;
            bg.pwcount = request.count;
            domainname = request.domainname;
            console.log("bg pwcount, domainname, masterpw", bg.pwcount, domainname, bg.masterpw);
            let persona = hpSPG.personas[bg.lastpersona];
            let sitename = persona.sites[domainname];
            let username;
            if (persona.sitenames[sitename]) {
                username = persona.sitenames[sitename].username;
            }
            let hasSitepass = bg.masterpw && sitename && username;
            if (hasSitepass) {
                console.log("bg hasSitepass");
            } else {
                console.log("bg does not have sitePass");
            }
            let hasMasterpw;
            if (bg.masterpw) {
                hasMasterpw = true;
            } else {
                hasMasterpw = false;
            }
            console.log(Date.now(), "bg.js send response", hasMasterpw, username);
            sendResponse({ cmd: "fillfields", "u": username, "p": "", "hasMasterpw": hasMasterpw });
            console.log(Date.now(), "bg.js last error", chrome.runtime.lastError);
     }
    console.log(Date.now(), "bg addListener returning: masterpw", bg.masterpw || "nomasterpw");
    return true;
});
async function waitForMetadata() {
    await retrieveMetadata();
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
        defaultsettings.characters = characters(defaultsettings);
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
    let update = "ssp://" + JSON.stringify(hpSPG);
    await chrome.bookmarks.update(bkmkid, { "url": update });
    persona = hpSPG.personas[bg.lastpersona];
    if (persona.sites[domainname]) {
        bg.settings = clone(persona.sitenames[persona.sites[domainname]]);
    } else {
        bg.settings = clone(persona.sitenames.default);
    }
    bg.settings.domainname = domainname;
}
async function retrieveMetadata() {
    // return JSON.parse(localStorage[name]);
    console.log("Retrieving metadata")
    let bkmkstr = await chrome.storage.local.get(["bkmk"]);
    let bkmk = JSON.parse(bkmkstr.bkmk);
    console.log("bg got bookmark", bkmk);
    if (bkmk) bkmkid = bkmk.bkmkid;
    if (bkmkid) {
        console.log("Got SSP bookmark ID " + bkmkid);
        let bkmk = await chrome.bookmarks.get(bkmkid);
        console.log("Got bookmark: ", bkmk);
        hpSPG = parseBkmk(bkmk[0]);
    } else {
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
            chrome.storage.local.set({ "bkmk": JSON.stringify(value) });
            console.log("Bookmark id: " + bkmkid);
            hpSPG = undefined;
        }
    }
    gotMetadata(hpSPG);
    // Doing it this way because bg.js used to be a background page, 
    // and I don't want to change a lot of code after I moved it to
    // the popup.
    bg = {
        "activetab": activetab,
        "lastpersona": lastpersona,
        "legacy": legacy,
        "masterpw": "",
        "protocol": protocol,
        "pwcount": pwcount,
        "settings": settings,
    };
    console.log(Date.now(), "bg leaving retrieiveMetadata");
    return await Promise.resolve(bg);
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
// Copy of code in ssp.js because when I try to import it,
// ssp.js says "Object window is not defined"
export function bgsettings(personaname, domainname) {
    let persona = hpSPG.personas[personaname];
    if (!persona) {
        hpSPG.personas[personaname] = clone(hpSPG.personas.default);
        persona = hpSPG.personas[personaname];
        bg.settings = clone(persona.sitenames.default);
        persona.personaname = personaname;
        bg.settings.domainname = domainname;
        bg.settings.characters = characters(bg.settings);
    }
    if (persona.sites[domainname]) {
        bg.settings = persona.sitenames[persona.sites[domainname]];
    } else {
        bg.settings = persona.sitenames.default;
        bg.settings.domainname = domainname;
    }
    return bg.settings;
}
export function characters(settings) {
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
