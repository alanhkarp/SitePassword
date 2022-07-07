'use strict';
import { characters, generate, isMasterPw } from "./generate.js";
// State I want to keep around that doesn't appear in the file system
var logging = true;
var bg = {};
var masterpw = "";
var activetab;
var hpSPG = {};
var lastpersona = "everyone";
var domainname = "";
var protocol = "";
var persona;
var pwcount = 0;
var pwfielddomain = {};
if (logging) console.log("bg clear masterpw");

if (logging) console.log("bg starting");

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (logging) console.log(Date.now(), "bg got message request, sender", request, sender);
    retrieveMetadata(() => {
        if (logging) console.log("bg listener back from retrieveMetadata", hpSPG);
        chrome.storage.session.get(["ssp"], (ssp) => {
            if (ssp.ssp) {
                persona = ssp.ssp.personaname || "default";
                bg.lastpersona = persona;
                masterpw = ssp.ssp.masterpw || "";
                bg.masterpw = masterpw;
                if (logging) console.log("bg got ssp: persona", persona || "not defined");
            }
            if (request.cmd === "forget") {
                let domainname = request.domainname;
                let personaname = request.persona.toLowerCase();
                let persona = hpSPG.personas[personaname];
                let sitename = persona.sites[domainname];
                let domains = Object.keys(persona.sites);
                let count = 0;
                domains.forEach(function (d) {
                    if ((persona.sites[d].toLowerCase().trim() == sitename.toLowerCase().trim()) &&
                        (d.toLowerCase().trim() != domainname)) count++;
                });
                if (count === 1) delete persona.sitenames[sitename]; // If this is the only use of sitename
                delete persona.sites[domainname];
                bg.settings.sitename = "";
                hpSPG.personas[personaname] = persona;
                if (logging) console.log("bg forgot", domainname, hpSPG);
                persistMetadata();
            } else if (request.cmd === "getMetadata") {
                getMetadata(request, sender, sendResponse);
            } else if (request.cmd === "siteData") {
                if (logging) console.log("bg got site data", request);
                bg = clone(request.bg);
                bg.lastpersona = request.personaname;
                masterpw = bg.masterpw;
                hpSPG.personas[bg.lastpersona].sitenames[request.sitename] = bg.settings;
                persistMetadata();
            } else if (request.cmd === "getPassword") {
                let origin = getdomainname(sender.origin);
                let domainname = pwfielddomain[origin] || origin;
                bg.settings = bgsettings(bg.lastpersona, domainname);
                let pr = generate(bg, hpSPG);
                if (logging) console.log("bg calculated sitepw", bg, hpSPG, pr, isMasterPw(masterpw));
                sendResponse(pr.p);
            } else if (request.clicked) {
                domainname = getdomainname(sender.origin);
                bg.domainname = domainname;
                if (logging) console.log("bg clicked: sending response", bg);
                sendResponse(bg);
                if (persona.clearmasterpw) {
                    masterpw = "";
                    if (logging) console.log("bg clear masterpw")
                }
            } else if (request.onload) {
                onContentPageload(request, sender, sendResponse);
                persistMetadata();
            }
            if (logging) console.log(Date.now(), "bg addListener returning", isMasterPw(masterpw));
        });
    });
    return true;
});
async function getMetadata(request, _sender, sendResponse) {
    bg.lastpersona = request.personaname;
    let sitename = hpSPG.personas[bg.lastpersona].sites[request.domainname];
    if (sitename) {
        bg.settings = hpSPG.personas[bg.lastpersona].sitenames[sitename];
    } else {
        bg.settings = hpSPG.personas[bg.lastpersona].sitenames.default;
    }
    // Domain name comes from popup, which is trusted not to spoof it
    bg.settings.domainname = pwfielddomain[request.domainname] || request.domainname;
    if (logging) console.log("bg sending metadata", bg, hpSPG);
    sendResponse({ "masterpw": masterpw || "", "bg": bg, "hpSPG": hpSPG });
}
function onContentPageload(request, sender, sendResponse) {
    if (logging) console.log("bg onContentPageLoad");
    activetab = sender.tab;
    bg.pwcount = request.count;
    pwcount = bg.pwcount;
    if (pwcount > 0) {
        pwfielddomain[getdomainname(sender.tab.url)] = getdomainname(sender.origin);
    }
    let origin = getdomainname(sender.origin);
    let domainname = pwfielddomain[origin] || origin;
    if (logging) console.log("bg pwcount, domainname, masterpw", hpSPG, bg.pwcount, domainname, isMasterPw(masterpw));
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
    if (bg.pwcount !== 0 && bg.settings.username) {
        let pr = generate(bg, hpSPG);
        sitepass = pr.p;
    }
    if (logging) console.log(Date.now(), "bg send response", { cmd: "fillfields", "u": bg.settings.username || "", "p": sitepass, "readyForClick": readyForClick });
    sendResponse({ cmd: "fillfields", "u": bg.settings.username || "", "p": sitepass, "readyForClick": readyForClick });
}
function gotMetadata(hpSPGlocal) {
    if (logging) console.log("bg gotMetadata", hpSPGlocal);
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
        if (logging) console.log("bg gotMetadata default", hpSPG);
        persistMetadata();
    }
    hpSPG = hpSPGlocal;
}
async function persistMetadata() {
    // localStorage[name] = JSON.stringify(value);
    if (logging) console.log("bg persistMetadata", bg, hpSPG);
    persona = hpSPG.personas[bg.lastpersona];
    if (bg.settings.sitename) {
        persona.sites[bg.settings.domainname] = bg.settings.sitename;
        persona.sitenames[bg.settings.sitename] = bg.settings;
    }
    if (persona && persona.sites && persona.sites[""]) {
        alert("bg bad sitename", hpSPG);
    }
    chrome.storage.session.set({ "ssp": { "masterpw": masterpw, "personaname": bg.lastpersona } });
    chrome.bookmarks.search("SitePasswordData", async function (folders) {
        // Persist changes to hpSPG
        let rootFolder = folders[0];
        let allchildren = await chrome.bookmarks.getChildren(rootFolder.id);
        let children = [];
        let domains = [];
        for (let i = 0; i < allchildren.length; i++) {
            // hpSPG is saved in 4K chunks of bookmarks each with the string of an integer as a title
            // All other bookmarks are domain names, which can't be converted to integers
            if (!isNaN(allchildren[i].title)) {
                children.push(allchildren[i]);
            } else {
                domains.push(allchildren[i]);
            }
        }
        let pieces = JSON.stringify(hpSPG).match(/.{1,4090}/g);
        for (let i = 0; i < Math.max(pieces.length, children.length); i++) {
            if (pieces[i]) {
                let url = "ssp://" + pieces[i];
                if (children[i]) {
                    chrome.bookmarks.update(children[i].id, { "url": url }, (e) => {
                        if (logging) console.log("bg updated bookmark", e, children[i].id);
                    });
                } else {
                    chrome.bookmarks.create({ "parentId": rootFolder.id, "title": i.toString(), "url": url }, (e) => {
                        if (logging) console.log("bg created bookmark", e.id);
                    });
                }
            } else {
                let id = children[i].id;
                chrome.bookmarks.remove(children[i].id, (e) => {
                    if (logging) console.log("bg removed bookmark", e, id);
                });
            }
        }
        // Persist changes to domain settings
        let domainNames = Object.keys(persona.sites);
        for (let i = 0; i < domainNames.length; i++) {
            let sitename = persona.sites[domainNames[i]];
            let settings = "ssp://" + JSON.stringify(persona.sitenames[sitename]);
            let found = domains.find((item) => item.title === domainNames[i]);
            if (found) {
                chrome.bookmarks.update(found.id, { "url": settings }, (e) => {
                    if (logging) console.log("bg updated settings bookmark", e, found);
                });
            } else {
                chrome.bookmarks.create({ "parentId": rootFolder.id, "title": domainNames[i], "url": settings }, (e) => {
                    if (logging) console.log("bg created settings bookmark", e, domainNames[i]);
                });
            }

        }
    });
}
// Assumes bookmarks fetched in the order created
async function parseBkmk(bkmkid, callback) {
    if (logging) console.log("bg parsing bookmark");
    chrome.bookmarks.getChildren(bkmkid, (children) => {
        let hpSPGstr = "";
        for (let i = 0; i < children.length; i++) {
            // Only use bookmarks containing pieces of hpSPG
            if (!isNaN(children[i].title)) {
                let data = children[i].url.substring(6);
                hpSPGstr += data;
            }
        }
        try {
            // JSON.stringify turns some of my " into %22
            hpSPG = JSON.parse(hpSPGstr.replace(/%22/g, "\""));
        } catch (e) {
            console.error("Error parsing metadata " + e);
            hpSPG = undefined;
        }
        retrieved(callback);
    });
}
async function retrieveMetadata(callback) {
    // return JSON.parse(localStorage[name]);
    if (logging) console.log("bg find SSP bookmark folder");
    chrome.bookmarks.search("SitePasswordData", (folders) => {
        if (folders.length === 1) {
            if (logging) console.log("Found bookmarks folder: ", folders[0]);
            parseBkmk(folders[0].id, callback);
        } else if (folders.length === 0) {
            if (logging) console.log("Creating SSP bookmark folder");
            alert("Creating SitePasswordData");
            hpSPG = undefined;
            chrome.bookmarks.create({ "parentId": "1", "title": "SitePasswordData" },
                (bkmk) => {
                    parseBkmk(bkmk.id, callback);
                });
        } else {
            alert("Found multple SitePasswordData folders");
            if (logging) console.log("bg found multiple SitePasswordData folders", folders);
        }
    });
}
function retrieved(callback) {
    if (logging) console.log("bg retrieved");
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
    bg = {
        "activetab": activetab,
        "lastpersona": lastpersona,
        "masterpw": masterpw,
        "protocol": protocol,
        "pwcount": pwcount,
        "settings": settings,
    };
    if (logging) console.log(Date.now(), "bg leaving retrieived", bg, hpSPG);
    callback();
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