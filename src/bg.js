let legacy = false;  // true to emulate HP Antiphishing Toolbar
'use strict';
// State I want to keep around that doesn't appear in the file system
var activetabid;
var hpSPG;
var bkmkid;
var masterpw = "";
var domainname = "";
var protocol = "";
var persona;
var pwcount = 0;
var settings = {};

chrome.runtime.onMessage.addListener(function (request, sender, _sendResponse) {
    activetabid = sender.tab.id;
    domainname = request.domainname;
    protocol = request.protocol;
    pwcount = request.count;
    let pr;
    if (request.clicked) {
        pr = generate(setup);
        if (persona.clearmasterpw) masterpw = "";
        chrome.tabs.sendMessage(activetabid,
            { cmd: "fillfields", "u": "", "p": pr.p });
    } else if (request.onload) {
        retrieveMetadata();
        pr = generate(setup);
    }
});
chrome.tabs.onActivated.addListener(function (activeinfo) {
    activetabid = activeinfo.tabId;
    chrome.tabs.sendMessage(activeinfo.tabId, { cmd: "gettabinfo" });
});
retrieveMetadata();

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
        persistMetadata(bkmkid, hpSPGlocal);
    }
    hpSPG = hpSPGlocal;
}
function persistMetadata(bkmkid, hpSPG) {
    // localStorage[name] = JSON.stringify(value);
    chrome.bookmarks.update(bkmkid, { "url": "ssp://" + JSON.stringify(hpSPG) }, (_node) => {
        persona = hpSPG.personas[hpSPG.lastpersona.toLowerCase().trim()];
        if (persona.sites[domainname]) {
            setup = clone(persona.sitenames[persona.sites[domainname]]);
        } else {
            setup = clone(persona.sitenames.default);
        }
        setup.domainname = domainname;
    });
}
function retrieveMetadata() {
    // return JSON.parse(localStorage[name]);
    console.log("Retrieving metadata")
    chrome.storage.local.get(["hpSPG"], (hpSPG) => {
        // I have no idea why I get hpSPG.hpSPG.bkmkid instead of hpSPG.bkmkid
        if (hpSPG && hpSPG.hpSPG) bkmkid = hpSPG.hpSPG.bkmkid;
        if (bkmkid) {
            console.log("Got SSP bookmark ID " + bkmkid);
            chrome.bookmarks.get(bkmkid, (bkmk) => {
                hpSPG = parseBkmk(bkmk[0]);
                gotMetadata(hpSPG);
            });
        } else {
            // Find ssp bookmark
            chrome.bookmarks.getTree((tree) => {
                console.log("Find SSP bookmark");
                let found = false;
                tree[0].children[0].children.forEach((bkmk, _index) => {
                    if (!found && bkmk.url.substring(0, 6) == "ssp://") {
                        found = true;
                        console.log("Found bookmark");
                        bkmkid = bkmk.id;
                        let value = { "bkmkid": bkmkid };
                        chrome.storage.local.set({ "hpSPG": value });
                        hpSPG = parseBkmk(bkmk);
                        gotMetadata(hpSPG);
                    }
                });
                if (!found) {
                    chrome.bookmarks.create({ "parentId": "1", "title": "SitePasswordData", "url": "ssp://" }, (bkmk) => {
                        console.log("Creating SSP bookmark");
                        bkmkid = bkmk.id;
                        let value = { "bkmkid": bkmkid };
                        chrome.storage.local.set({ "hpSPG": value }, () => {
                            console.log("Bookmark id: " + bkmkid);
                            hpSPG = undefined;
                            gotMetadata(hpSPG);
                        });
                    });
                }
            });
        }
    })
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
function generate(settings) {
    // let d = settings.domainname;
    if (legacy) {
        var n = settings.sitename;
        var u = settings.username;
    } else {
        var n = settings.sitename.toLowerCase().trim();
        var u = settings.username.toLowerCase().trim();
    }
    let m = masterpw;
    if (!m) {
        return { p: "", r: pwcount };
    }
    let s = n.toString() + u.toString() + m.toString();
    let p = compute(s, settings);
    if ((pwcount == 1) && u && n && m) {
        chrome.tabs.sendMessage(activetabid, { cmd: "fillfields", "u": u, "p": "" });
    }
    return { p: p, r: pwcount };
}
function compute(s, settings) {
    s = Utf8Encode(s);

    let h = core_sha256(str2binb(s), s.length * chrsz);
    for (iter = 1; iter < hpSPG.miniter; iter++) {
        h = core_sha256(h, 16 * chrsz);
    }
    // let ok = false;
    while (iter < hpSPG.maxiter) {
        h = core_sha256(h, 16 * chrsz);
        let hswap = Array(h.length);
        for (i = 0; i < h.length; i++) {
            hswap[i] = swap32(h[i]);
        }
        let sitePassword = binl2b64(hswap, settings.characters).substring(0, settings.length);
        if (verify(sitePassword, settings)) break;
        iter++;
        if (iter >= hpSPG.maxiter) {
            sitePassword = "";
        }
    }
    return sitePassword;
}
function verify(p, settings) {
    let counts = { lower: 0, upper: 0, number: 0, special: 0 };
    for (i = 0; i < p.length; i++) {
        let c = p.substr(i, 1);
        if (-1 < hpSPG.lower.indexOf(c)) counts.lower++;
        if (-1 < hpSPG.upper.indexOf(c)) counts.upper++;
        if (-1 < hpSPG.digits.indexOf(c)) counts.number++;
        if (-1 < settings.specials.indexOf(c)) counts.special++;
    }
    let valOK = true;
    if (settings.startwithletter) {
        let start = p.substr(0, 1).toLowerCase();
        valOK = valOK && -1 < hpSPG.lower.indexOf(start);
    }
    if (settings.allowlower) valOK = valOK && (counts.lower >= settings.minlower)
    if (settings.allowupper) {
        valOK = valOK && (counts.upper >= settings.minupper)
    } else {
        valOK = valOK && (counts.upper == 0);
    }
    if (settings.allownumber) {
        valOK = valOK && (counts.number >= settings.minnumber);
    } else {
        valOK = valOK && (counts.number == 0);
    }
    if (settings.allowspecial) {
        valOK = valOK && (counts.special >= settings.minspecial);
    } else {
        valOK = valOK && (counts.special == 0);
    }
    return valOK;
}
function characters(settings) {
    let chars = hpSPG.lower + hpSPG.upper + hpSPG.digits + hpSPG.lower.substr(0, 2);
    if (settings.allowspecial) {
        if (legacy) {
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
