'use strict';
import {generate} from "./generate.js";
// State I want to keep around that doesn't appear in the file system
var bg;
var activetab;
var hpSPG = {};
var bkmkid;
var legacy = false;  // true to emulate HP Antiphishing Toolbar
var domainname = "";
var protocol = "";
var persona;
var pwcount = 0;
var settings = {};
var setup;
var masterpw = "";

console.log("bg starting");

retrieveMetadata().then((bg) => {
    console.log("bg metadata retrieved", bg);
})
chrome.runtime.onStartup.addListener(() => {
    console.log("bg onStartup");
});

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    console.log("bg.js got message request, sender", request, sender);
    let activetabid = -1;
    if (sender.tab) {
        activetabid = sender.tab.id;
    }
    protocol = request.protocol;
    pwcount = request.count;
    if (request.cmd === "getMetadata") {
        console.log("bg request getMetadata: sending response", bg);
        chrome.runtime.sendMessage({"metadata": bg});
    } else if (request.cmd === "persistMetadata") {
        console.log("bg request persistMetadata", request.bg);
        hpSPG = request.bg.hpSPG;
        persistMetadata(bkmkid);
    } else if (request.masterpw) {
        console.log("bg got masterpw", request.masterpw);
        masterpw = request.masterpw;
    } else if (request.clicked) {
        if (persona.clearmasterpw) masterpw = "";
        domainname = request.domainname;
        console.log("bg clicked: sending response", bg);
        sendResponse(bg);
    } else if (request.onload) {
        bg.pwcount = request.count;
        domainname = request.domainname;
        console.log("bg pwcount, domainname", bg.pwcount, domainname);
        let persona = bg.hpSPG.personas[bg.hpSPG.lastpersona.toLowerCase()];
        let sitename = persona.sites[domainname];
        let username;
        if (persona.sitenames[sitename]) {
            username = persona.sitenames[sitename].username;
        }
        let hasMasterpw = false;
        if (masterpw) { hasMasterpw = true; }
        chrome.tabs.sendMessage(activetabid,
            { cmd: "fillfields", "u": username, "p": "", "hasMasterpw": hasMasterpw });
    }
    console.log("bg addListener returning");
    return true;
});

function gotMetadata(hpSPGlocal) {
    if (!hpSPGlocal) {
        hpSPGlocal = {
            digits: "0123456789",
            lower: "abcdefghijklmnopqrstuvwxyz",
            upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            specials: "/!=@?._-",
            miniter: 10,
            maxiter: 1000,
            lastpersona: "everyone",
            personas: {
                default: {
                    personaname: "default",
                    clearmasterpw: false,
                    sites: {},
                    sitenames: {
                        default: {
                            sitename: "",
                            username: "",
                            hostname: "",
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
        hpSPGlocal.lastpersona = persona.personaname;
        hpSPG = hpSPGlocal;
        persistMetadata(bkmkid);
    }
    hpSPG = hpSPGlocal;
}
async function persistMetadata(bkmkid) {
    // localStorage[name] = JSON.stringify(value);
    let update = "ssp://" + JSON.stringify(hpSPG);
    await chrome.bookmarks.update(bkmkid, { "url": update });
    persona = hpSPG.personas[hpSPG.lastpersona.toLowerCase().trim()];
    if (persona.sites[domainname]) {
        setup = clone(persona.sitenames[persona.sites[domainname]]);
    } else {
        setup = clone(persona.sitenames.default);
    }
    setup.domainname = domainname;
}
async function retrieveMetadata() {
    // return JSON.parse(localStorage[name]);
    console.log("Retrieving metadata")
    let hpSPGsaved = await chrome.storage.local.get(["hpSPGsaved"]);
    console.log("bg got hpSPGsaved", hpSPGsaved);
    // I have no idea why I get hpSPGsaved.hpSPGsaved.bkmkid instead of hpSPG.bkmkid
    if (hpSPGsaved && hpSPGsaved.hpSPGsaved) bkmkid = hpSPGsaved.hpSPGsaved.bkmkid;
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
                chrome.storage.local.set({ "hpSPGsaved": JSON.stringify(value) });
                hpSPG = parseBkmk(bkmk);
            }
        });
        if (!found) {
            let bkmk = await chrome.bookmarks.create({ "parentId": "1", "title": "SitePasswordData", "url": "ssp://" });
            console.log("Creating SSP bookmark");
            bkmkid = bkmk.id;
            let value = { "bkmkid": bkmkid };
            chrome.storage.local.set({ "hpSPGsaved": JSON.stringify(value) });
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
        "hpSPG": hpSPG,
        "legacy": legacy,
        "masterpw": masterpw,
        "protocol": protocol,
        "pwcount": pwcount,
        "settings": settings,
     }
    console.log("bg = ", bg);
    return bg;
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
