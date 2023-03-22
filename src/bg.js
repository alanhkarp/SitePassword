'use strict';
import { generate, isMasterPw, normalize, stringXorArray } from "./generate.js";
const testMode = true;
const commonSettingsTitle = "CommonSettings";
let logging = testMode;
// State I want to keep around that doesn't appear in the file system
let sitedataBookmark = "SitePasswordData";
if (testMode) {
    sitedataBookmark = "SitePasswordDataTest"; //"SitePasswordDataTest";
}
var bg = {};
var masterpw = "";
var activetab;
const databaseDefault = { "clearmasterpw": false, "hidesitepw": false, "domains": {}, "sites": {} };
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
    sitename: "",
    username: "",
    providesitepw: false,
    xor: new Array(12).fill(0),
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
    minspecial: 1,
    specials: config.specials,
};

if (logging) console.log("bg clear masterpw");

if (logging) console.log("bg starting with database", database);

// Need to clear cache following an update
chrome.runtime.onInstalled.addListener(function (details) {
    if (logging) console.log("bg clearing browser cache because of", details)
    chrome.browsingData.removeCache({}, function () {
        if (logging) console.log("bg cleared the browser cache");
    });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (logging) console.log(Date.now(), "bg got message request, sender", request, sender);
    // Start with a new database in case something changed while the service worker stayed open
    database = clone(databaseDefault);
    bg = {};
    retrieveMetadata(sendResponse, () => {
        if (logging) console.log("bg listener back from retrieveMetadata", database);
        let masterpw = sessionStorage.getItem("masterpw") || "";
        bg.masterpw = masterpw;
        if (logging) console.log("bg got masterpw");
        if (request.cmd === "getMetadata") {
            getMetadata(request, sender, sendResponse);
        } else if (request.cmd === "siteData") {
            if (logging) console.log("bg got site data", request);
            // Update time stamp if settings changed
            bg = clone(request.bg);
            database.clearmasterpw = request.clearmasterpw;
            database.hidesitepw = request.hidesitepw;
            masterpw = bg.masterpw || "";
            persistMetadata(sendResponse);
        } else if (request.cmd === "getPassword") {
            let domainname = getdomainname(sender.url); // sender.origin in Chrome
            bg.settings = bgsettings(domainname);
            let p = generate(bg);
            p = stringXorArray(p, bg.settings.xor);
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
        database = clone(databaseDefault);
        if (logging) console.log(Date.now(), "bg addListener returning", isMasterPw(masterpw));
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
    activetab = request.activetab;
    // Don't lose database across async call
    let db = database;
    // Restores data stored the last time this page was loaded
    let activetabUrl = activetab.url;
    if (logging) console.log("bg got active tab", activetab);
    let t = sessionStorage.getItem("savedData");
    let savedData = JSON.parse(t);
    if (logging) console.log("bg got saved data", savedData);
    // I don't create savedData in onContentPageLoad() for two reasons.
    //    1. Pages without a password field never send the message to trigger the save.
    //    2. file:/// pages don't get a content script to send that message.
    // In those cases s === {}, but I still need to send a response.
    if (chrome.runtime.lastError) {
        console.log("bg lastError", chrome.runtime.lastError);
    } else if (savedData && savedData[activetabUrl]) {
        if (logging) console.log("bg got saved data for", activetabUrl, savedData[activetabUrl]);
        pwcount = savedData[activetabUrl];
        bg.pwcount = pwcount;
    } else {
        if (logging) console.log("bg no saved data for", activetabUrl, savedData);
        pwcount = 0;
        bg.pwcount = 0;
    }
    domainname = getdomainname(activetabUrl);
    if (!bg.settings.xor) bg.settings.xor = clone(defaultSettings.xor);
    if (logging) console.log("bg sending metadata", pwcount, bg, db);
    sendResponse({ "masterpw": masterpw || "", "bg": bg, "database": db });
}
function onContentPageload(request, sender, sendResponse) {
    if (logging) console.log("bg onContentPageLoad", bg, request, sender);
    activetab = sender.tab;
    bg.pwcount = request.count;
    pwcount = request.count;
    // Save data that service worker needs after it restarts
    let t = sessionStorage.getItem("savedData");
    let savedData = JSON.parse(t) || {};
    savedData[activetab.url] = pwcount;
    if (logging) console.log("bg saving data", savedData[activetab.url]);
    sessionStorage.setItem("savedData", JSON.stringify(savedData));
    let domainname = getdomainname(activetab.url);
    if (logging) console.log("bg domainname, masterpw, database, bg", domainname, isMasterPw(masterpw), database, bg);
    let sitename = database.domains[domainname];
    if (logging) console.log("bg |sitename|, settings, database", sitename, database.sites[sitename], database);
    if (sitename) {
        bg.settings = database.sites[sitename];
    } else {
        bg.settings = clone(defaultSettings);
    }
    bg.settings.domainname = domainname;
    bg.settings.pwdomainname = getdomainname(sender.url); // sender.origin in Chrome
    let readyForClick = false;
    if (masterpw && bg.settings.sitename && bg.settings.username) {
        readyForClick = true;
    }
    let sitepass = "";
    if (bg.pwcount !== 0 && bg.settings.username) {
        let p = generate(bg);
        p = stringXorArray(p, bg.settings.xor);
        sitepass = p;
    }
    if (logging) console.log(Date.now(), "bg send response", { cmd: "fillfields", "u": bg.settings.username || "", "p": sitepass, "readyForClick": readyForClick });
    sendResponse({
        "cmd": "fillfields",
        "u": bg.settings.username || "", "p": sitepass,
        "clearMasterpw": database.clearMasterpw,
        "hideSitepw": database.hideSitepw,
        "readyForClick": readyForClick
    });
}
async function persistMetadata(sendResponse) {
    // localStorage[name] = JSON.stringify(value);
    if (logging) console.log("bg persistMetadata", bg, database);
    masterpw = bg.masterpw;
    sessionStorage.setItem("masterpw", masterpw);
    let db = database;
    let found = await getRootFolder(sendResponse);
    if (found.length > 1) return;
    let rootFolder = found[0];
    let sitename = normalize(bg.settings.sitename);
    if (sitename) {
        let oldsitename = db.domains[bg.settings.domainname];
        if ((!oldsitename) || sitename === oldsitename) {
            db.domains[bg.settings.domainname] = normalize(bg.settings.sitename);
            if (bg.settings.pwdomainname !== bg.settings.domainname) {
                db.domains[bg.settings.pwdomainname] = normalize(bg.settings.sitename);
            }
            db.sites[sitename] = bg.settings;
        } else {
            // Find all domains that point to oldsitename and have them point to
            // the new one
            for (let entry of Object.entries(db.domains)) {
                if (db.domains[entry[0]] === oldsitename) db.domains[entry[0]] = normalize(bg.settings.sitename);
            }
            db.sites[sitename] = bg.settings;
            // then remove the old site name from database.sites
            delete db.sites[oldsitename];
        }
    } // Ignore blank sitename
    if (db && db.sites && db.sites[""] || db.sites["undefined"]) {
        console.log("bg bad sitename", db);
        delete db.sites[""];
        delete db.sites["undefined"];
    }
    if (db && db.domains && db.domains[""] || db.sites["undefined"]) {
        console.log("bg bad domainname", db);
        delete db.domains[""];
        delete db.domains["undefined"];
    }
    if (logging) console.log("bg root folder", rootFolder);
    // The databae is saved as one bookmark for the common settings
    // and a bookmark for each domain name.
    let allchildren = await chrome.bookmarks.getChildren(rootFolder.id); // Deleted some so recreate list
    if (chrome.runtime.lastError) console.log("bg lastError", chrome.runtime.lastError);
    let commonSettings = [];
    let domains = [];
    for (let i = 0; i < allchildren.length; i++) {
        if (allchildren[i].title === commonSettingsTitle) {
            commonSettings.push(allchildren[i]); // In case of duplicates
        } else {
            domains.push(allchildren[i]);
        }
    }
    let common = clone(db);
    delete common.domains;
    delete common.sites;
    // No merge for now
    if (commonSettings.length === 0) {
        let url = "ssp://" + JSON.stringify(common);
        chrome.bookmarks.create({ "parentId": rootFolder.id, "title": commonSettingsTitle, "url": url }, (commonBkmk) => {
            if (logging) console.log("bg created bookmark", commonBkmk.id);
        });
        if (chrome.runtime.lastError) console.log("bg lastError", chrome.runtime.lastError);
    }
    let url = "ssp://" + JSON.stringify(common);
    if (commonSettings.length > 0 && url !== commonSettings[0].url.replace(/%22/g, "\"").replace(/%20/g, " ")) {
        let url = "ssp://" + JSON.stringify(common);
        chrome.bookmarks.update(commonSettings[0].id, { "url": url }, (_e) => {
            if (logging) console.log("bg updated bookmark", _e, commonSettings[0].id);
        });
        if (chrome.runtime.lastError) console.log("bg lastError", chrome.runtime.lastError);
    }
    // Persist changes to domain settings
    let domainnames = Object.keys(db.domains);
    for (let i = 0; i < domainnames.length; i++) {
        let sitename = db.domains[domainnames[i]];
        let settings = db.sites[sitename];
        let url = "ssp://" + JSON.stringify(settings);
        let found = domains.find((item) => item.title === domainnames[i]);
        if (found) {
            let foundSettings = JSON.parse(found.url.substr(6).replace(/%22/g, "\"").replace(/%20/g, " "));
            if (!sameSettings(settings, foundSettings)) {
                url = "ssp://" + JSON.stringify(settings);
                chrome.bookmarks.update(found.id, { "url": url }, (_e) => {
                    //if (logging) console.log("bg updated settings bookmark", _e, found);
                });
                if (chrome.runtime.lastError) console.log("bg lastError", chrome.runtime.lastError);
            }
        } else {
            if (bg.settings.sitename &&
                (domainnames[i] === bg.settings.domainname) ||
                (domainnames[i] === bg.settings.pwdomainname)) {
                let title = domainnames[i];
                url = "ssp://" + JSON.stringify(settings);
                chrome.bookmarks.create({ "parentId": rootFolder.id, "title": title, "url": url }, (e) => {
                    if (logging) console.log("bg created settings bookmark", e, title);
                });
                if (chrome.runtime.lastError) console.log("bg lastError", chrome.runtime.lastError);
            }
        }
    }
}
async function parseBkmk(rootFolder, callback, sendResponse) {
    if (logging) console.log("bg parsing bookmark");
    chrome.bookmarks.getChildren(rootFolder, (children) => {
        let seenTitles = {};
        let newdb = clone(databaseDefault);
        for (let i = 0; i < children.length; i++) {
            let title = children[i].title;
            // Remove legacy bookmarks
            if (!isNaN(title)) {
                chrome.bookmarks.remove(children[i].id);
                if (chrome.runtime.lastError) console.log("bg lastError", chrome.runtime.lastError);
            }
            if (seenTitles[title]) {
                let seen = JSON.parse(children[seenTitles[title]].url.substr(6).replace(/%22/g, "\"").replace(/%20/g, " "));
                let dupl = JSON.parse(children[i].url.substr(6).replace(/%22/g, "\"").replace(/%20/g, " "));
                if (sameSettings(seen, dupl)) {
                    chrome.bookmarks.remove(children[i].id);
                    if (chrome.runtime.lastError) console.log("bg lastError", chrome.runtime.lastError);
                } else {
                    sendResponse("duplicate");
                    continue;
                }
            } else {
                seenTitles[title] = i;
            }
            if (title === commonSettingsTitle) {
                let common = JSON.parse(children[i].url.substr(6).replace(/%22/g, "\"").replace(/%20/g, " "));
                newdb.clearmasterpw = common.clearmasterpw;
                newdb.hidesitepw = common.hidesitepw;
            } else {
                let settings = JSON.parse(children[i].url.substr(6).replace(/%22/g, "\"").replace(/%20/g, " "));
                newdb.domains[title] = normalize(settings.sitename);
                newdb.sites[normalize(settings.sitename)] = settings;
            }
        }
        database = newdb;
        retrieved(callback);
    });
}
async function retrieveMetadata(sendResponse, callback) {
    database = clone(databaseDefault); // Start with an empty database
    bg = {}; // and settings
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
            let bkmk = await chrome.bookmarks.create({ "parentId": "toolbar_____", "title": sitedataBookmark });
            if (chrome.runtime.lastError) console.log("bg lastError", chrome.runtime.lastError);
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
        if (candidates[i].parentId === "toolbar_____" &&
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
    if (!domainname) {
        callback();
        return;
    };
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
    if (!bg.settings) bg.settings = settings;
    bg.masterpw = masterpw || "";
    if (logging) console.log(Date.now(), "bg leaving retrieived", bg, database);
    callback();
}
function bgsettings(domainname) {
    if (database.domains[domainname]) {
        bg.settings = database.sites[database.domains[domainname]];
        if (!bg.settings.username) bg.settings.username = "";
        if (!bg.settings.sitename) bg.settings.sitename = "";
    } else {
        if (!bg.settings) bg.settings = clone(defaultSettings);
        bg.settings.domainname = domainname;
    }
    return bg.settings;
}
function sameSettings(a, b) {
    if (!a || !b) return false;  // Assumes one or the other is set
    if (Object.keys(a).length !== Object.keys(b).length) return false;
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