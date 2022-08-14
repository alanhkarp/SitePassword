'use strict';
import { generate, isMasterPw } from "./generate.js";
// State I want to keep around that doesn't appear in the file system
const sitedataBookmark = "SitePasswordData";
const logging = false;
var bg = {};
var masterpw = "";
var activetab;
const databaseDefault = {"domains": {}, "sites": {}};
var database = clone(databaseDefault);
var domainname = "";
var protocol = "";
var pwcount = 0;
var createBookmarksFolder = true;
var pwfielddomain = {};
export const config = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    specials: "/!=@?._-",
    miniter: 10,
    maxiter: 1000
};
export const defaultSettings = {
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
    specials: config.specials,
};

if (logging) console.log("bg clear masterpw");

if (logging) console.log("bg starting with database", database);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (logging) console.log(Date.now(), "bg got message request, sender", request, sender);
    retrieveMetadata(sendResponse, () => {
        if (logging) console.log("bg listener back from retrieveMetadata", database);
        chrome.storage.session.get(["ssp"], (ssp) => {
            if (ssp.ssp) {
                masterpw = ssp.ssp.masterpw || "";
                bg.masterpw = masterpw;
                if (logging) console.log("bg got ssp");
            }
            if (request.cmd === "forget") {
                console.log("bg forget feature not implemented");
                // let domainname = request.domainname;
                // let sitename = database.domains[domainname];
                // let domains = Object.keys(database.domains);
                // let count = 0;
                // domains.forEach(function (d) {
                //     if ((database.domains[d].toLowerCase().trim() === sitename.toLowerCase().trim()) &&
                //         (d.toLowerCase().trim() !== domainname)) count++;
                // });
                // if (count === 0) delete database.sites[sitename]; // If this is the only use of sitename
                // delete database.domains[domainname];
                // chrome.bookmarks.search(sitedataBookmark, async function (folders) {
                //     // Persist changes to database
                //     let rootFolder = folders[0];
                //     let children = await chrome.bookmarks.getChildren(rootFolder.id);
                //     let found = children.find(element => element.title = domainname);
                //     if (found) chrome.bookmarks.remove(found.id, () =>{
                //         if (logging) console.log("bg removed bookmark", found.id, "for", domainname);
                //     });
                // });
                // bg.settings.sitename = "";
                if (logging) console.log("bg forgot", domainname, database);
                persistMetadata();
            } else if (request.cmd === "getMetadata") {
                getMetadata(request, sender, sendResponse);
            } else if (request.cmd === "siteData") {
                if (logging) console.log("bg got site data", request);
                bg = clone(request.bg);
                masterpw = bg.masterpw;
                database.clearmasterpw = request.clearmasterpw;
                database.sites[request.sitename] = bg.settings;
                persistMetadata();
            } else if (request.cmd === "getPassword") {
                let origin = getdomainname(sender.origin);
                domainname = pwfielddomain[origin] || origin;
                bg.settings = bgsettings(domainname);
                let p = generate(bg);
                if (database.clearmasterpw) {
                    masterpw = "";
                    bg.masterpw = "";
                    persistMetadata();
                }
                if (logging) console.log("bg calculated sitepw", bg, database, p, isMasterPw(masterpw));
                sendResponse(p);
            } else if (request.clicked) {
                domainname = getdomainname(sender.origin);
                bg.domainname = domainname;
                if (logging) console.log("bg clicked: sending response", bg);
                sendResponse(bg);
                if (database.clearmasterpw) {
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
    if (logging) console.log("bg getMetadata", bg, request);
    let sitename = database.domains[request.domainname];
    if (sitename) {
        bg.settings = database.sites[sitename];
    } else {
        bg.settings = clone(defaultSettings);
    }
    // Domain name comes from popup, which is trusted not to spoof it
    bg.settings.domainname = pwfielddomain[request.domainname] || request.domainname;
    if (logging) console.log("bg sending metadata", pwcount, bg, database);
    sendResponse({ "masterpw": masterpw || "", "pwcount": pwcount, "bg": bg, "database": database });
}
function onContentPageload(request, sender, sendResponse) {
    if (logging) console.log("bg onContentPageLoad", request);
    activetab = sender.tab;
    bg.pwcount = request.count;
    pwcount = bg.pwcount;
    if (pwcount > 0) {
        pwfielddomain[getdomainname(sender.origin)] = getdomainname(sender.tab.url);
    }
    let origin = getdomainname(sender.origin);
    domainname = pwfielddomain[origin] || origin;
    if (logging) console.log("bg pwcount, domainname, masterpw", database, bg.pwcount, domainname, isMasterPw(masterpw));
    let sitename = database.domains[domainname];
    if (sitename) {
        bg.settings = database.sites[sitename];
    } else {
        bg.settings = clone(defaultSettings);
    }
    bg.settings.domainname = domainname;
    let readyForClick = false;
    if (masterpw && bg.settings.sitename && bg.settings.username) {
        readyForClick = true;
    }
    let sitepass = "";
    if (bg.pwcount !== 0 && bg.settings.username) {
        let p = generate(bg);
        sitepass = p;
    }
    if (logging) console.log(Date.now(), "bg send response", { cmd: "fillfields", "u": bg.settings.username || "", "p": sitepass, "readyForClick": readyForClick });
    sendResponse({ cmd: "fillfields", "u": bg.settings.username || "", "p": sitepass, "readyForClick": readyForClick });
}
async function persistMetadata() {
    // localStorage[name] = JSON.stringify(value);
    if (logging) console.log("bg persistMetadata", bg, database);
    if (bg.settings.sitename) {
        database.domains[bg.settings.domainname] = bg.settings.sitename;
        database.sites[bg.settings.sitename] = bg.settings;
    }
    if (database && database.domains && database.domains[""] || database.domains["undefined"]) {
        console.log("bg bad sitename", database);
    }
    chrome.storage.session.set({ "ssp": { "masterpw": masterpw } });
    chrome.bookmarks.search(sitedataBookmark, async function (candidates) {
        // Persist changes to database
        let rootFolder = getRootFolder(candidates)[0];
        if (logging) console.log("bg root folder", rootFolder);
        let allchildren = await chrome.bookmarks.getChildren(rootFolder.id);
        let children = [];
        let domains = [];
        for (let i = 0; i < allchildren.length; i++) {
            // database is saved in 4K chunks of bookmarks each with the string of an integer as a title
            // All other bookmarks are domain names, which can't be converted to integers
            if (!isNaN(allchildren[i].title)) {
                children.push(allchildren[i]);
            } else {
                domains.push(allchildren[i]);
            }
        }
        let pieces = JSON.stringify(database).match(/.{1,4090}/g);
        for (let i = 0; i < Math.max(pieces.length, children.length); i++) {
            if (pieces[i]) {
                let url = "ssp://" + pieces[i];
                if (children[i]) {
                    chrome.bookmarks.update(children[i].id, { "url": url }, (e) => {
                        //if (logging) console.log("bg updated bookmark", e, children[i].id);
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
        let domainNames = Object.keys(database.domains);
        for (let i = 0; i < domainNames.length; i++) {
            let sitename = database.domains[domainNames[i]];
            let settings = "ssp://" + JSON.stringify(database.sites[sitename]);
            let found = domains.find((item) => item.title === domainNames[i]);
            if (found) {
                chrome.bookmarks.update(found.id, { "url": settings }, (e) => {
                    //if (logging) console.log("bg updated settings bookmark", e, found);
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
        let databasestr = "";
        for (let i = 0; i < children.length; i++) {
            // Only use bookmarks containing pieces of database
            if (!isNaN(children[i].title)) {
                let data = children[i].url.substring(6);
                databasestr += data;
            }
        }
        try {
            // JSON.stringify turns some of my " into %22
            // and some of my blanks into %20
            if (databasestr) database = JSON.parse(databasestr.replace(/%22/g, "\"").replace(/%20/g, " "));
        } catch (e) {
            console.log("Error parsing metadata " + e);
            database = clone(databaseDefault);
        }
        retrieved(callback);
    });
}
async function retrieveMetadata(sendResponse, callback) {
    // return JSON.parse(localStorage[name]);
    if (logging) console.log("bg find SSP bookmark folder");
    chrome.bookmarks.search(sitedataBookmark, (candidates) => {
        let folders = getRootFolder(candidates);
        if (folders.length === 1) {
            if (logging) console.log("Found bookmarks folder: ", folders[0]);
            parseBkmk(folders[0].id, callback);
        } else if (folders.length === 0) {
            if (logging) console.log("Creating SSP bookmark folder");
            // findpw.js sends the SiteData message twice, once for document.onload
            // and once for window.onload.  The latter can arrive while the bookmark
            // folder is being created, resulting in two of them.  My solution is to
            // use a flag to make sure I only create it once.
            if (createBookmarksFolder) {
                createBookmarksFolder = false;
                chrome.bookmarks.create({ "parentId": "1", "title": sitedataBookmark },
                    (bkmk) => {
                        parseBkmk(bkmk.id, callback);
                    });
            }
        } else {
            console.log("bg found multiple", sitedataBookmark, "folders", folders);
            sendResponse("multiple");
        }
    });
}
function getRootFolder(candidates) {
    // bookmarks.search finds any bookmark with a title containing the
    // search string, but I need to find one with an exact match
    let folders = [];
    for (let i = 0; i < candidates.length; i++) {
        if (candidates[i].title === sitedataBookmark) folders.push(candidates[i]);
    }
    return folders;
}
function retrieved(callback) {
    if (logging) console.log("bg retrieved", database);
    if (!database.sites) {
        console.log("stop here please");
    }
    let sitename = database.domains[domainname];
    let settings;
    if (sitename) {
        settings = database.sites[sitename];
    } else {
        settings = clone(defaultSettings);
    }
    bg = {
        "activetab": activetab,
        "masterpw": masterpw,
        "protocol": protocol,
        "pwcount": pwcount,
        "settings": settings,
    };
    if (logging) console.log(Date.now(), "bg leaving retrieived", bg, database);
    callback();
}
function bgsettings(domainname) {
    if (database.domains[domainname]) {
        bg.settings = database.sites[database.domains[domainname]];
    } else {
        bg.settings = clone(defaultSettings);
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