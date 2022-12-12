'use strict';
import { generate, isMasterPw, normalize } from "./generate.js";
const testMode = false;
const commonSettingsTitle = "CommonSettings";
let logging = testMode;
// State I want to keep around that doesn't appear in the file system
let sitedataBookmark = "SitePasswordDataMerge"; // So I don't step on my real bookmards
if (testMode) {
    sitedataBookmark = "SitePasswordDataMerge"; //"SitePasswordDataTest";
}
var bg = {};
var masterpw = "";
var activetab;
const databaseDefault = { "updateTime": 0, "clearmasterpw": false, "hidesitepw": false, "domains": {}, "sites": {} };
var database = clone(databaseDefault);
var domainname = "";
var protocol = "";
var pwcount = 0;
var createBookmarksFolder = true;
export const config = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    specials: "/!=@?._-",
    miniter: 100,
    maxiter: 1000
};
export const defaultSettings = {
    updateTime: 0,
    sitename: "",
    username: "",
    pwlength: 12,
    domainname: "",     // Domain name from the tab
    pwdomainname: "",   // Domain name from iframe with password field
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
        chrome.storage.session.get(["SitePassword"], (value) => {
            if (value.SitePassword) {
                masterpw = value.SitePassword.masterpw || "";
                bg.masterpw = masterpw;
                if (logging) console.log("bg got ssp", value.SitePassword);
            }
            if (request.cmd === "getMetadata") {
                getMetadata(request, sender, sendResponse);
            } else if (request.cmd === "siteData") {
                if (logging) console.log("bg got site data", request);
                // Update time stamp if settings changed
                let domainname = request.bg.settings.domainname;
                let sitename = database.domains[domainname];
                let oldsettings = database.sites[sitename];
                if (!sameSettings(oldsettings,request.bg.settings)) {
                    request.bg.settings.updateTime = Date.now();
                }
                bg = clone(request.bg);
                masterpw = bg.masterpw;
                persistMetadata(sendResponse);
            } else if (request.cmd === "getPassword") {
                let domainname = getdomainname(sender.origin);
                bg.settings = bgsettings(domainname);
                let p = generate(bg);
                if (database.clearmasterpw) {
                    masterpw = "";
                    bg.masterpw = "";
                    persistMetadata(sendResponse);
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
                persistMetadata(sendResponse);
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
    bg.settings.domainname = request.domainname;
    if (logging) console.log("bg sending metadata", pwcount, bg, database);
    sendResponse({ "masterpw": masterpw || "", "pwcount": pwcount, "bg": bg, "database": database });
}
function onContentPageload(request, sender, sendResponse) {
    if (logging) console.log("bg onContentPageLoad", bg, request, sender);
    activetab = sender.tab;
    bg.pwcount = request.count;
    pwcount = bg.pwcount;
    let domainname = getdomainname(activetab.url);
    if (logging) console.log("domainname, masterpw, database, bg", domainname, isMasterPw(masterpw), database, bg);
    let sitename = database.domains[domainname];
    if (logging) console.log("bg |sitename|, settings, database", sitename, database.sites[sitename], database);
    if (sitename) {
        bg.settings = database.sites[sitename];
    } else {
        bg.settings = clone(defaultSettings);
    }
    bg.settings.domainname = domainname;
    bg.settings.pwdomainname = getdomainname(sender.origin);
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
async function persistMetadata(sendResponse) {
    // localStorage[name] = JSON.stringify(value);
    if (logging) console.log("bg persistMetadata", bg, database);
    chrome.storage.session.set({ "SitePassword": { "masterpw": masterpw } });
    let found = await getRootFolder(sendResponse);
    if (found.length > 1) return;
    let rootFolder = found[0];
    let allchildren = await chrome.bookmarks.getChildren(rootFolder.id);
    let sitename = normalize(bg.settings.sitename);
    if (sitename) {
        let oldsitename = database.domains[bg.settings.domainname];
        if ((!oldsitename) || sitename === oldsitename) {
            database.domains[bg.settings.domainname] = normalize(bg.settings.sitename);
            if (bg.settings.pwdomainname !== bg.settings.domainname) {
                database.domains[bg.settings.pwdomainname] = normalize(bg.settings.sitename);
            }
            database.sites[sitename] = bg.settings;
        } else {
            // Find all domains that point to oldsitename and have them point to
            // the new one
            for (let entry of Object.entries(database.domains)) {
                if (database.domains[entry[0]] === oldsitename) database.domains[entry[0]] = normalize(bg.settings.sitename);
            }
            database.sites[sitename] = bg.settings;
            // then remove the old site name from database.sites
            delete database.sites[oldsitename];
        }
    } // Ignore blank sitename
    if (database && database.sites && database.sites[""] || database.sites["undefined"]) {
        console.log("bg bad sitename", database);
        delete database.sites[""];
        delete database.sites["undefined"];
    }
    if (database && database.domains && database.domains[""] || database.sites["undefined"]) {
        console.log("bg bad domainname", database);
        delete database.domains[""];
        delete database.domains["undefined"];
    }
    if (logging) console.log("bg root folder", rootFolder);
    // The databae is saved as one bookmark for the common settings
    // and a bookmark for each domain name.
    allchildren = await chrome.bookmarks.getChildren(rootFolder.id); // Deleted some so recreate list
    let commonSettings = [];
    let domains = [];
    for (let i = 0; i < allchildren.length; i++) {
        if (allchildren[i].title === commonSettingsTitle) {
            commonSettings.push(allchildren[i]); // In case of duplicates
        } else {
            domains.push(allchildren[i]);
        }
    }
    let common = clone(database);
    delete common.domains;
    delete common.sites;
    // No merge for now
    if (commonSettings.length === 0) {
        common.updateTime = Date.now();
        let url = "ssp://" + JSON.stringify(common);
        chrome.bookmarks.create({ "parentId": rootFolder.id, "title": commonSettingsTitle, "url": url }, (commonBkmk) => {
            if (logging) console.log("bg created bookmark", commonBkmk.id);
        });
    }
    let url = "ssp://" + JSON.stringify(common);
    if (commonSettings.length > 0 && url !== commonSettings[0].url.replace(/%22/g, "\"").replace(/%20/g, " ")) {
        common.updateTime = Date.now();
        let url = "ssp://" + JSON.stringify(common);
        chrome.bookmarks.update(commonSettings[0].id, { "url": url }, (_e) => {
            if (logging) console.log("bg updated bookmark", _e, children[i].id);
        });
    }
    // Persist changes to domain settings
    let domainnames = Object.keys(database.domains);
    for (let i = 0; i < domainnames.length; i++) {
        let sitename = database.domains[domainnames[i]];
        let settings = database.sites[sitename];
        let url = "ssp://" + JSON.stringify(settings);
        let found = domains.find((item) => item.title === domainnames[i]);
        if (found) {
            let foundSettings = JSON.parse(found.url.substr(6).replace(/%22/g, "\"").replace(/%20/g, " "));
            if (!sameSettings(settings, foundSettings)) {
                settings.updateTime = Date.now();
                url = "ssp://" + JSON.stringify(settings);
                chrome.bookmarks.update(found.id, { "url": url }, (_e) => {
                    //if (logging) console.log("bg updated settings bookmark", _e, found);
                });
        }
        } else {
            if (bg.settings.sitename && domainnames[i] === bg.settings.domainname) {
                let title = bg.settings.domainname;
                settings.updateTime = Date.now()
                url = "ssp://" + JSON.stringify(settings);
                chrome.bookmarks.create({ "parentId": rootFolder.id, "title": title, "url": url }, (e) => {
                    if (logging) console.log("bg created settings bookmark", e, title);
                });
            }
        }
    }
}
// Assumes bookmarks fetched in the order created
async function parseBkmk(rootFolder, callback, sendResponse) {
    if (logging) console.log("bg parsing bookmark");
    chrome.bookmarks.getChildren(rootFolder, (children) => {
        let seenTitles = {};
        let newdb = clone(databaseDefault);
        let duplicates = {};
        for (let i = 0; i < children.length; i++) {
            let title = children[i].title;
            if (seenTitles[title]) {
                let seen = JSON.parse(children[seenTitles[title]].url.substr(6).replace(/%22/g, "\"").replace(/%20/g, " "));
                let dupl = JSON.parse(children[i].url.substr(6).replace(/%22/g, "\"").replace(/%20/g, " "));
                if (sameSettings(seen, dupl)) {
                    chrome.bookmarks.remove(children[i].id);
                } else {
                    duplicates[title] = i;
                }
            } else {
                seenTitles[title] = i;
            }
            // Remove legacy bookmarks
            if (!isNaN(title)) {
                chrome.bookmarks.remove(children[i].id);
            }
            if (title === commonSettingsTitle) {
                let common = JSON.parse(children[i].url.substr(6).replace(/%22/g, "\"").replace(/%20/g, " "));
                newdb.updateTime = common.updateTime;
                newdb.clearmasterpw = common.clearmasterpw;
                newdb.hidesitepw = common.hidesitepw;
            } else {
                let settings = JSON.parse(children[i].url.substr(6).replace(/%22/g, "\"").replace(/%20/g, " "));
                newdb.domains[title] = normalize(settings.sitename);
                newdb.sites[normalize(settings.sitename)] = settings;
            }
        }
        if (Object.keys(duplicates).length > 0) {
            sendResponse("duplicate");
        }
        database = newdb;
        retrieved(callback);
    });
}
async function retrieveMetadata(sendResponse, callback) {
    // return JSON.parse(localStorage[name]);
    if (logging) console.log("bg find SSP bookmark folder");
    let folders = await getRootFolder(sendResponse);
    if (folders.length === 1) {
        if (logging) console.log("Found bookmarks folder: ", folders[0]);
        parseBkmk(folders[0].id, callback, sendResponse);
    } else if (folders.length === 0) {
        // findpw.js sends the SiteData message twice, once for document.onload
        // and once for window.onload.  The latter can arrive while the bookmark
        // folder is being created, resulting in two of them.  My solution is to
        // use a flag to make sure I only create it once.
        if (createBookmarksFolder) {
            if (logging) console.log("Creating SSP bookmark folder");
            createBookmarksFolder = false;
            let bkmk = await chrome.bookmarks.create({ "parentId": "1", "title": sitedataBookmark });
            parseBkmk(bkmk.id, callback, sendResponse);
        }
    }
}
async function getRootFolder(sendResponse) {
    // bookmarks.search finds any bookmark with a title containing the
    // search string, but I need to find one with an exact match.  I
    // also only want to include those in the bookmarks bar.
    let candidates = await chrome.bookmarks.search({ "title": sitedataBookmark });
    let folders = [];
    for (let i = 0; i < candidates.length; i++) {
        if (candidates[i].parentId === "1" &&
            candidates[i].title === sitedataBookmark) folders.push(candidates[i]);
    }
    if (folders.length > 1) {
        console.log("bg found multiple", sitedataBookmark, "folders", folders);
        sendResponse("multiple");
    }
    return folders;
}
function retrieved(callback) {
    if (logging) console.log("bg retrieved", database);
    if (!database || !database.sites) {
        console.log("stop here please");
        callback();
    }
    let sitename = database.domains[domainname];
    let settings;
    if (sitename) {
        settings = database.sites[sitename];
    } else {
        settings = clone(defaultSettings);
    }
    if (activetab) protocol = getprotocol(activetab.url);
    bg.settings = settings; 
    bg.masterpw = masterpw || "";
    bg.updateTime = Date.now();
    if (logging) console.log(Date.now(), "bg leaving retrieived", bg, database);
    callback();
}
function bgsettings(domainname) {
    if (database.domains[domainname]) {
        bg.settings = database.sites[database.domains[domainname]];
        if (!bg.settings.username) bg.settings.username = "";
        if (!bg.settings.sitename) bg.settings.sitename = "";
    } else {
        bg.settings = clone(defaultSettings);
        bg.settings.domainname = domainname;
    }
    return bg.settings;
}
function sameSettings(a, b) {
    if (!a || !b) return false;  // Assumes one or the other is set
    // To deal with old format that doesn't include updateTime
    if (!a.updateTime) a.updateTime = 0;
    if (!b.updateTime) b.updateTime = 0;
    // Assumes a and b have the same properties
    for (let key in a) {
        // The domain name may change for domains that share setting
        if (key === "domainname") continue;
        if (key === "updateTime") continue;
        if (a[key] !== b[key]) return false;
    }
    return true;
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