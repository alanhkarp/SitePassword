'use strict';
import {isSuperPw, normalize, array2string, stringXorArray, generatePassword } from "./generate.js";
// Set to true to run the tests in test.js then reload the extension.
// Tests must be run on a page that has the content script, specifically,
// http or https whether it has a password field or not.

// Only one of these can be true at a time
const testMode = false;
const debugMode = false;
const demoMode = false;

const testLogging = false;
const demoLogging = false;
const logging = false;
const errorLogging = false;

const commonSettingsTitle = "CommonSettings";
// State I want to keep around
let sitedataBookmark = "SitePasswordData";
if (testMode) {
    sitedataBookmark = "SitePasswordDataTest";
} else if (debugMode) {
    sitedataBookmark = "SitePasswordDataDebug";
} else if (demoMode) {
    sitedataBookmark = "SitePasswordDataDemo";
}
var superpw = "";
var activetab;
var domainname = "";
var protocol; // VSCode says this is unused, but it is in function retrieved() below.
var rootFolder = {id: -1};
var pwcount = 0;
var createBookmarksFolder = true;
var createBookmark = true;
export const webpage = "https://sitepassword.info";
export const config = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    specials: "$/!=@?._-",
};
// These are the default settings if the user hasn't set any new values
let defaultSettings = {
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
// Default handling can be much simpler than what I have here.
// That's the price I'm paying for starting with 10 year old code.
export const baseDefaultSettings = clone(defaultSettings); // Exported for testing
Object.freeze(baseDefaultSettings); // so the values can't be changed
Object.freeze(baseDefaultSettings.xor); // so the array values can't be changed

export const bgBaseDefault = {"superpw": "", "pwcount": 0, "settings": baseDefaultSettings}; // Used in ssp.js
Object.freeze(bgBaseDefault); // so the values can't be changed
Object.freeze(bgBaseDefault.settings.xor); // so the array values can't be changed

let commonBaseDefault = {"clearsuperpw": false, "hidesitepw": false, "defaultSettings": baseDefaultSettings};
Object.freeze(commonBaseDefault); // so the values can't be changed
Object.freeze(commonBaseDefault.defaultSettings); // so the values can't be changed
Object.freeze(commonBaseDefault.defaultSettings.xor); // so the array values can't be changed

let databaseDefault = { "common": clone(commonBaseDefault), "domains": {}, "sites": {} };
var database = clone(databaseDefault);
let bgDefault = clone(bgBaseDefault);
var bg = clone(bgDefault);

export const isSafari = typeof chrome.bookmarks === "undefined";
if (logging) console.log("bg isSafari", isSafari);

let bkmksId;
let bkmksSafari = {};
// Need to clear cache on install or following an update
if (logging) console.log("bg running");
async function updateTab(tab) {
    if (isUrlMatch(tab.url)) {
        if (tab.status === "complete") {
            try {
                // The following needs scripting permission in the manifest and
                // host_permissions for http://*/* and https://*/*.
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id, frameIds: [0] },
                    files: ["src/findpw.js"]
                });
                if (logging) console.log("bg script executed successfully on tab activation");
            } catch (error) {
                throw(error);
            }
        } else {
            // Listen for the tab to complete loading (Thanks, Copilot!)
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
                if (tabId === tab.id && changeInfo.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(listener);
                    updateTab(updatedTab); // Retry updating the tab
                }
            });
        }
    }
}
// Listen for tab activation
chrome.tabs.onActivated.addListener(async function(activeInfo) {
    try {
        let tab = await chrome.tabs.get(activeInfo.tabId);
        await updateTab(tab);
    } catch (error) {
        if (errorLogging) console.log("Error handling tab activation", error);
        await Promise.resolve();
    }
})
chrome.runtime.onInstalled.addListener(async function(details) {
    // Check for consistency of the xMode flags
    if (testMode && debugMode || testMode && demoMode || debugMode && demoMode) {
        let developererror = chrome.runtime.getURL("developererror.html");
        chrome.windows.create({
            url: developererror,
            type:"normal",
            height:800,
            width:800
        });
        return;
    }
    if (testMode) {
        let developertest = chrome.runtime.getURL("developertest.html");
        chrome.windows.create({
            url: developertest,
            type:"normal",
            height:800,
            width:800
        });
    }
    if (logging) console.log("bg clearing browser cache because of", details);
    await chrome.browsingData.removeCache({});
    if (logging) console.log("bg cleared the browser cache");
    if (details.reason === "install") {
        let gettingstarted = chrome.runtime.getURL("gettingstarted.html");
        chrome.windows.create({
            url: gettingstarted,
            type:"normal",
            height:800,
            width:800
        });
    } else if (details.reason === "update") {
        let tabs = await chrome.tabs.query({});
        let start = Date.now();
        let count = 0;
        for (let i = 0; i < tabs.length; i++) {
            try {
                await updateTab(tabs[i]);
                if (logging) console.log("bg script executed successfully");
            } catch(error) {
                count++;
                let estring = error.toString();
                if (errorLogging && !estring.includes("showing error page")) console.log("bg reload tab error", tabs[i].url, error, count, tabs.length);
            }
        }
        if (logging) console.log("bg reloaded tabs in", Date.now() - start, "ms", count, tabs.length);
    }
});
// Listen for tab activation
chrome.tabs.onActivated.addListener(async function(activeInfo) {
    try {
        let tab = await chrome.tabs.get(activeInfo.tabId);
        await updateTab(tab);
    } catch (error) {
        if (errorLogging) console.log("Error handling tab activation", error);
        await Promise.resolve();
    }
});
async function setup() {
    if (!isSafari) {
        let nodes;
        try {
            nodes = await chrome.bookmarks.getTree();
        } catch (error) {
            if (errorLogging) console.log("Error getting bookmarks tree", error);
            nodes = [];
        }
        bkmksId = nodes[0] ? nodes[0].children[0].id : -1;
    } else {
        // Safari
        await Promise.resolve(); // Force timing to be the same as the other branch
        bkmksId = -1;
        if (logging) console.log("bg got Safari bookmarks", bkmksSafari);
     }

    if (logging) console.log("bg clear superpw");

    if (logging) console.log("bg starting with database", database);

    // Check reminder clock set in ssp.js.  If too much time has passed, 
    // clear superpw so user has to reenter it as an aid in not forgetting it.
    let value = await chrome.storage.local.get("reminder");
    if (logging) console.log("bg got reminder", value);
    if (value.reminder) {
        let now = new Date();
        let then = new Date(value.reminder);
        let diff = now - then;
        if (logging) console.log("bg reminder diff", diff);
        if (diff > 604800000) {
            if (logging) console.log("bg clearing superpw because of reminder");
            superpw = "";
            await chrome.storage.session.set({"superpw": ""});
            await chrome.storage.local.set({"reminder": ""});
        } else {
            await Promise.resolve(); // To match the await in the other branch
        }
    }
    // Add message listener
    if (logging) console.log("bg adding listener");
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (logging || testLogging) console.log("bg got message request, sender", request, sender);
        // Start with a new database in case something changed while the service worker stayed open
        database = clone(databaseDefault);
        bg = clone(bgDefault);
        retrieveMetadata(sendResponse, request, async () => {
            if (logging) console.log("bg listener back from retrieveMetadata", database);
            superpw = "";
            let value = await chrome.storage.session.get(["superpw"]);
            superpw = value.superpw || "";
            if (logging) console.log("bg got superpw", superpw);
            superpw = superpw || "";
            bg.superpw = superpw;
            if (logging) console.log("bg got ssp", isSuperPw(superpw));
            if (request.cmd === "getMetadata") {
                await getMetadata(request, sender, sendResponse);
            } else if (request.cmd === "resetIcon") {
                await chrome.storage.local.set({"onClipboard": false});
                await chrome.action.setTitle({title: "Site Password"});
                await chrome.action.setIcon({"path": "../images/icon128.png"});
                sendResponse("icon reset");        
            } else if (request.cmd === "siteData") {
                if (logging) console.log("bg got site data", request);
                bg = request.bg;
                database.common.clearsuperpw = request.clearsuperpw;
                database.common.hidesitepw = request.hidesitepw;
                superpw = bg.superpw || "";
                await persistMetadata(sendResponse);
                sendResponse("persisted");
            } else if (request.cmd === "getPassword") {                
                let domainname = getdomainname(sender.origin || sender.url);
                if (testMode) domainname = "alantheguru.alanhkarp.com";
                bg.settings = bgsettings(domainname);
                let p = await generatePassword(bg);
                p = stringXorArray(p, bg.settings.xor);
                if (database.common.clearsuperpw) {
                    superpw = "";
                    bg.superpw = "";
                    await persistMetadata(sendResponse);
                } else {
                    await Promise.resolve(); // To match the await in the other branch
                }
                if (logging) console.log("bg calculated sitepw", bg, database, p, isSuperPw(superpw));
                sendResponse(p);
                await Promise.resolve(); // To match the awaits in the other branches
            } else if (request.cmd == "getUsername") {
                let domainname = getdomainname(sender.origin || sender.url);
                if (testMode) domainname = "alantheguru.alanhkarp.com";
                bg.settings = bgsettings(domainname);
                sendResponse(bg.settings.username);
                await Promise.resolve(); // To match the awaits in the other branches
            } else if (request.cmd === "reset") {
                // Used for testing, can't be in test.js becuase it needs to set local variables 
                defaultSettings = clone(baseDefaultSettings);
                database = clone(databaseDefault);
                database.common = clone(commonBaseDefault);
                if (testLogging) console.log("bg removing bookmarks folder for testing", defaultSettings.pwlength);
                rootFolder = await getRootFolder(sendResponse);
                await chrome.bookmarks.removeTree(rootFolder[0].id);
                createBookmarksFolder = true;
                if (testLogging) console.log("bg removed bookmarks folder", rootFolder[0].title, defaultSettings.pwlength);
                sendResponse("reset");
            } else if (request.cmd === "newDefaults") {
                if (logging) console.log("bg got new default settings", request.newDefaults);
                database.common.defaultSettings = request.newDefaults;
                await persistMetadata(sendResponse);
                sendResponse("persisted");
            } else if (request.cmd === "forget") {
                if (logging) console.log("bg forget", request.cmd);
                rootFolder = await getRootFolder(sendResponse);
                if (logging) console.log("bg forget rootFolder", rootFolder, request.toforget);
                await forget(request.toforget, rootFolder[0], sendResponse);
                if (logging) console.log("bg forget done");
            } else if (request.clicked) {
                domainname = getdomainname(sender.origin || sender.url);
                bg.domainname = domainname;
                if (logging) console.log("bg clicked: sending response", bg);
                if (database.common.clearsuperpw) {
                    superpw = "";
                    if (logging) console.log("bg clear superpw", isSuperPw(superpw));
                }
                sendResponse(bg);
                await Promise.resolve(); // To match the awaits in the other branches
            } else if (request.onload) {
                await onContentPageload(request, sender, sendResponse);
                await persistMetadata(sendResponse);
                sendResponse("persisted");
            } else {
                if (logging) console.log("bg got unknown request", request);
                sendResponse("unknown request");
                await Promise.resolve(); // To match the awaits in the other branches
            }
            if (logging) console.log("bg addListener returning", isSuperPw(superpw));
        });
        return true;
    });
}
setup();
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
    if (logging) console.log("bg got active tab", activetab);
    // Don't lose database across async call
    let db = database;
    // Restores data stored the last time this page was loaded
    if (logging) console.log("bg got active tab", activetab);
    let s = await chrome.storage.session.get(["savedData"]); // Returns {} if nothing is saved
    let savedData = s.savedData || {};
    if (logging) console.log("bg got saved data", s);
    if (s && Object.keys(s).length > 0) savedData = s.savedData;
    pwcount = savedData[activetab.url] || {};
    if (logging) console.log("bg got saved data for", activetab.url, savedData[activetab.url]);
    bg.pwcount = pwcount;
    domainname = getdomainname(activetab.url);
    if (!bg.settings.xor) bg.settings.xor = clone(defaultSettings.xor);
    if (logging) console.log("bg sending metadata", bg, db);
    sendResponse({"test" : testMode, "superpw": superpw || "", "pwcount": pwcount, "bg": bg, "database": db});
}
async function onContentPageload(request, sender, sendResponse) {
    if (logging) console.log("bg onContentPageLoad", bg, request, sender);
    activetab = sender.tab;
    pwcount = request.count;
    // Save data that service worker needs after it restarts
    let savedData = {};
    if (isSafari) {
        let t = sessionStorage.getItem("savedData");
        if (t) savedData = JSON.parse(t);
        await Promise.resolve(); // To match the await in the other branch
    } else {
        let s = await chrome.storage.session.get(["savedData"]);
        if (Object.keys(s).length > 0) savedData = s.savedData;
    }
    if (pwcount) savedData[activetab.url] = pwcount || 0;
    if (logging) console.log("bg saving data", savedData[activetab.url]);
    if (isSafari) {
        let s = JSON.stringify(savedData);
        sessionStorage.setItem("savedData", s);
        await Promise.resolve(); // To match the awaits in the other branches
    } else {
        if (pwcount) await chrome.storage.session.set({"savedData": savedData}); 
    }    
    let domainname = getdomainname(activetab.url);
    if (logging) console.log("bg domainname, superpw, database, bg", domainname, isSuperPw(superpw), database, bg);
    let sitename = database.domains[domainname];
    if (logging) console.log("bg |sitename|, settings, database", sitename, database.sites[sitename], database);
    if (sitename) {
        bg.settings = database.sites[sitename];
    } else {
        bg.settings = clone(defaultSettings);
    }
    bg.settings.domainname = domainname;
    bg.settings.pwdomainname = getdomainname(sender.origin || sender.url);
    let readyForClick = false;
    if (superpw && bg.settings.sitename && bg.settings.username) {
        readyForClick = true;
    }
    if (logging) console.log("bg send response", { cmd: "fillfields", "u": bg.settings.username || "", "readyForClick": readyForClick });
    sendResponse({ "cmd": "fillfields", 
        "u": bg.settings.username || "", 
        "p": "", 
        "readyForClick": readyForClick
    });
}
async function persistMetadata(sendResponse) {
    if (logging) console.log("bg persistMetadata", bg, database);
    superpw = bg.superpw;
    await chrome.storage.session.set({"superpw": superpw});
    let db = clone(database);
    let found = await getRootFolder(sendResponse);
    if (found.length > 1) return;
    rootFolder = found[0];
    let sitename = normalize(bg.settings.sitename);
    if (sitename) {
        let oldsitename = db.domains[bg.settings.domainname];
        if ((!oldsitename) || sitename === oldsitename) {
            db.domains[bg.settings.domainname] = normalize(bg.settings.sitename);
            if (!bg.settings.pwdomainname) bg.settings.pwdomainname = bg.settings.domainname;
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
    if (db && db.domains && db.domains[""] || db.domains["undefined"]) {
        console.log("bg bad domainname", db);
        delete db.domains[""];
        delete db.domains["undefined"];
    }
    if (logging) console.log("bg root folder", rootFolder);
    // The databae is saved as one bookmark for the common settings
    // and a bookmark for each domain name.
    let allchildren;
    if (isSafari) {
        allchildren = Object.values(bkmksSafari);
        await Promise.resolve(); // To match the await in the other branch
    } else {
        try {
            allchildren = await chrome.bookmarks.getChildren(rootFolder.id);
        } catch (error) {
            console.error("bg getChildren error", error);
        }
    }
    let commonSettings = [];
    let domains = [];
    for (let i = 0; i < allchildren.length; i++) {
        // Bookmarks for Safari don't have a title
        if (allchildren[i].title === commonSettingsTitle) {
            commonSettings.push(allchildren[i]); // In case of duplicates
        } else {
            domains.push(allchildren[i]);
        }
    }
    let common = clone(db.common);
    if (logging) console.log("bg persistMetadata", common.defaultSettings.pwlength);
    // No merge for now
    let url = "ssp://" + stringifySettings(common);
    if (commonSettings.length === 0 && createBookmark) {
        createBookmark = false;
        if (isSafari) {
            bkmksSafari[commonSettingsTitle] = {};
            bkmksSafari[commonSettingsTitle].title = commonSettingsTitle;
            bkmksSafari[commonSettingsTitle].url = url;
            await chrome.storage.sync.set(bkmksSafari);
        } else {
            try {
                let commonBkmk = await chrome.bookmarks.create({ "parentId": rootFolder.id, "title": commonSettingsTitle, "url": url });
                if (logging) console.log("bg created common settings bookmark", commonBkmk.title, commonSettings.pwlength);
            } catch (error) {
                console.error("Error creating common settings bookmark:", error);
            }
        }
        createBookmark = true;
    } else {
        let existing = parseURL(commonSettings[0].url); // Common settings bookmark
        if (isLegacy(commonSettings[0].url) || !identicalObjects(common, existing)) {
            if (isSafari) {
                bkmksSafari[commonSettingsTitle].url = url;
                await chrome.storage.sync.set(bkmksSafari);
            } else {
                try {
                    await chrome.bookmarks.update(commonSettings[0].id, { "url": url });
                } catch (error) {
                    console.error("Error updating common settings bookmark:", error);
                }
                if (logging) console.log("bg updated bookmark", commonSettings[0].id, url);
            }
        }
    }
    // Persist changes to domain settings
    let domainnames = Object.keys(db.domains);
    for (let i = 0; i < domainnames.length; i++) {
        let sitename = db.domains[domainnames[i]];
        let settings = clone(db.sites[sitename]);
        settings.domainname = domainnames[i];
        settings.specials = array2string(settings.specials); // For legacy bookmarks
        let url = webpage + "?bkmk=ssp://" + stringifySettings(settings);
        let found = domains.find((item) => item.title === domainnames[i]);
        if (found) {
            let foundSettings = parseURL(found.url);
            if (isLegacy(found.url) || !identicalObjects(settings, foundSettings)) {
                if (isSafari) {
                    // Handle Safari bookmarks
                    if (bkmksSafari[found.title] && bkmksSafari[found.title].url !== url) {
                        bkmksSafari[found.title].url = url;
                        await chrome.storage.sync.set(bkmksSafari);
                    } else {
                        await Promise.resolve(); // To match the await in the other branch
                    }
                } else {
                    try {
                        await chrome.bookmarks.update(found.id, { "url": url });
                    } catch (error) {
                        console.error("Error updating bookmark:", error);
                    }
                }
            }
        } else if (createBookmark) {
            createBookmark = false;
            if (bg.settings.sitename && 
                (domainnames[i] === bg.settings.domainname) ||
                (domainnames[i] === bg.settings.pwdomainname)) {
                let title = domainnames[i];
                if (logging) console.log("bg creating bookmark for", title);
                if (isSafari) {
                    bkmksSafari[title] = {};
                    bkmksSafari[title].title = title;
                    bkmksSafari[title].url = url;
                    await chrome.storage.sync.set(bkmksSafari);
                } else {
                    try {
                        await chrome.bookmarks.create({ "parentId": rootFolder.id, "title": title, "url": url });
                    } catch (error) {
                        console.error("Error creating bookmark:", error);
                    }
                    if (logging) console.log("bg created settings bookmark", e, title);
                }
            }
            createBookmark = true;
        }
    }
}
async function retrieveMetadata(sendResponse, request, callback) {
    database = clone(databaseDefault); // Start with an empty database
    bg = clone(bgDefault); // and settings
    if (logging) console.log("bg find SSP bookmark folder", request);
    let folders = await getRootFolder(sendResponse);
    if (folders.length === 1) {
        if (logging) console.log("bg found bookmarks folder: ", folders[0]);
        // An earlier version mistakenly put bookmarks in sync storage.
        // They aren't needed, so get rid of them.  However, leaving 
        // them protects against the case where a browser (Safari) 
        // starts supporting the bookmarks API, but users haven't
        // updated the browser on all their machines.
        //chrome.storage.sync.clear();
        await parseBkmk(folders[0].id, callback, sendResponse);
    } else if (folders.length === 0 && createBookmarksFolder) {
        // findpw.js sends the SiteData message twice, once for document.onload
        // and once for window.onload.  The latter can arrive while the bookmark
        // folder is being created, resulting in two of them.  My solution is to
        // use a flag to make sure I only create it once.
        createBookmarksFolder = false;
        if (logging || testLogging) console.log("bg creating SSP bookmark folder");
        if (isSafari) {
            // Leaving the entries in sync storage protects against the case where a browser (Safari) 
            // starts supporting the bookmarks API, but users haven't updated the browser on all their machines.
            //chrome.storage.sync.clear();
            // Nothing in sync storage unless using Safari
            let values = await chrome.storage.sync.get();
            for (let title in values) {
                try {
                    let bkmk = await chrome.bookmarks.create({"parentId": bkmk.id, "title": title, "url": values[title].url});
                    if (testLogging) console.log("bg created bookmark", bkmk);
                    await parseBkmk(bkmk.id, callback, sendResponse);
                } catch (error) {
                    console.error("Error creating bookmark:", error);
                }
                await parseBkmk(bkmk.id, callback, sendResponse);
            }
        } else {
            // If there's no bookmarks folder, but there are entries in sync storage,
            // then copy those entries to bookmarks and clear sync storage.  This will
            // happen when the browser newly implements the bookmarks API.
            if (logging) console.log("bg creating bookmarks folder");
            try {
                let bkmk = await chrome.bookmarks.create({ "parentId": bkmksId, "title": sitedataBookmark });
                await parseBkmk(bkmk.id, callback, sendResponse);
            } catch (error) {
                console.error("Error creating bookmarks folder:", error);
            }
        }
        createBookmarksFolder = true;
    }
}
async function parseBkmk(rootFolderId, callback, sendResponse) {
    if (logging) console.log("bg parsing bookmark");
    let children = [];
    if (isSafari) {
        Object.values(bkmksSafari);
        await Promise.resolve(); // To match the await in the other branch
    } else {
        try {
            children = await chrome.bookmarks.getChildren(rootFolderId);
        } catch (error) {
            console.error("Error getting children bookmarks:", error);
        }
    }
    if (logging) console.log("bg cleaning bookmarks", children);
    let seenTitles = {};
    let newdb = clone(databaseDefault);
    for (let i = 0; i < children.length; i++) {
        let title = children[i].title;
        // Remove legacy bookmarks
        if (!isNaN(title)) {
            if (logging) console.log("bg removing legacy bookmark", children[i]);
            if (isSafari) {
                delete bkmksSafari[children[i]];
                try {
                    await chrome.storage.sync.set(bkmksSafari);
                } catch (error) {
                    console.error("Error setting Safari storage:", error);
                }
            } else {
                try {
                    await chrome.bookmarks.remove(children[i].id);
                } catch (error) {
                    console.error("Error removing legacy bookmark:", error);
                }
            }
        }
        if (seenTitles[title]) {
            if (logging) console.log("bg duplicate bookmark", children[i]);
            let dupl = parseURL(children[i].url);
            if (identicalObjects(seenTitles[title], dupl)) {
                if (isSafari) {
                    delete bkmksSafari[children[i]];
                } else {
                    chrome.bookmarks.remove(children[i].id);
                }
            } else {
                sendResponse({"duplicate": children[i].title});
            }
        } else {
            seenTitles[title] = parseURL(children[i].url);
        }
        if (title === commonSettingsTitle) {
            if (logging) console.log("bg common settings from bookmark", children[i]);
            let common = parseURL(children[i].url);
            if (logging) console.log("bg common settings from bookmark", common);
            defaultSettings = common.defaultSettings || defaultSettings;
            common.defaultSettings = defaultSettings;
            newdb.common = common;
        } else {
            if (logging && i < 3) console.log("bg settings from bookmark", children[i]);
            let settings = parseURL(children[i].url);
            if (logging) console.log("bg settings from bookmark", settings);
            if (settings.sitename) {
                newdb.domains[title] = normalize(settings.sitename);
                newdb.sites[normalize(settings.sitename)] = settings;
            }
        }
    }
    database = newdb;
    await retrieved(callback);
}
export async function getRootFolder(sendResponse) { // Exported for testing
    if (logging) console.log("bg getRootFolder", sitedataBookmark);
    // bookmarks.search finds any bookmark with a title containing the
    // search string, but I need to find one with an exact match.  I
    // also only want to include those in the bookmarks bar.
    if (isSafari) {
        await Promise.resolve(); // To match the await in the other branch
        return [bkmksSafari];
    } else {
        try {
            let candidates = await chrome.bookmarks.search({ "title": sitedataBookmark });
            if (logging) console.log("bg search candidates", candidates);
            let folders = [];
            for (let i = 0; i < candidates.length; i++) {
                if (candidates[i].parentId === bkmksId &&
                    candidates[i].title === sitedataBookmark) folders.push(candidates[i]);
            }
            if (folders.length > 1) {
                if (logging) console.log("bg found multiple", sitedataBookmark, "folders", folders);
                if (sendResponse) sendResponse("multiple");
            } else if (folders.length === 0) {
                if (logging) console.log("bg found no", sitedataBookmark, "folders");
            }
            if (logging) console.log("bg getRootFolder returning", folders);
            return folders;
        } catch (error) {
            console.error("Error searching bookmarks:", error);
            return [];
        }
    }
}
async function retrieved(callback) {
    if (logging) console.log("bg retrieved", database);
    if (!domainname) {
        await callback();
        return;
    };
    if (!database || !database.sites) {
        console.log("stop here please");
        await callback();
    } else {
        await Promise.resolve(); // To match the await in the other branch
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
    bg.superpw = superpw || "";
    if (logging) console.log("bg leaving retrieived", bg, database);
    await callback();
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
async function forget(toforget, rootFolder, sendResponse) {
    if (logging) console.log("bg forget", toforget);
    for (const item of toforget)  {
        if (logging) console.log("bg forget item", item);
        delete database.domains[item];
        if (logging) console.log("bg forget getting children", item, rootFolder);
        try {
            let allchildren = await chrome.bookmarks.getChildren(rootFolder.id);
            if (logging) console.log("bg forget got children", allchildren);
            for (let child of allchildren) {
                if (child.title === item) {
                    if (logging) console.log("bg removing bookmark for", child.title);
                    await chrome.bookmarks.remove(child.id);
                        if (isUrlMatch(activetab.url)) {
                            await chrome.tabs.sendMessage(activetab.id, { "cmd": "clear" });
                            if (logging) console.log("bg sent clear message");
                        }
                    if (logging) console.log("bg removed bookmark for", item);
                    if (logging) console.log("bg sent clear message");
                }
            }
        } catch (error) {
            console.error("Error forgetting:", error);
        }
        if (logging) console.log("bg forget done", item);
    }
    sendResponse("forgot");
}
function stringifySettings(settings) {
    let s = JSON.stringify(settings);
    try {
        return encodeURIComponent(s);
    } catch (e) {
        console.log("bad URI", settings);
    }
}
export function isUrlMatch(url) {
    const manifest = chrome.runtime.getManifest();
    const urlPatterns = manifest.content_scripts[0].matches;
    return urlPatterns.some((pattern) => new RegExp(pattern).test(url));
}
function parseURL(url) {
    // Returns settings or common settings object
    let str = sspUrl(url);
    let settings;
    try {
        settings = JSON.parse(decodeURIComponent(str));
    } catch (e) {
        settings = JSON.parse(str.replace(/%22/g, '"').replace(/%20/g, " "));
    }
    if (settings.specials) { // For regular legacy bookmarks
        settings.specials = array2string(settings.specials);
    } else { // For common settings legacy bookmarks
        settings.defaultSettings.specials = array2string(settings.defaultSettings.specials);
    }
    return settings; // To handle legacy bookmarks
}
function identicalObjects(a, b) {
    if (!a || !b) return false;  // Assumes one or the other is set
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (let key in a) {
        // The domain name may change for domains that share setting
        if (key === "domainname") continue;
        if (key === "updateTime") continue;
        if (key === "specials") { // For legacy bookmarks
            a[key] = array2string(a[key]);
            b[key] = array2string(b[key]);
        }
        if (typeof a[key] === "object") {
            if (!identicalObjects(a[key], b[key])) return false;
        } else {
            if (a[key] !== b[key]) {
                return false;
            }
        }
    }
    return true;
}
// Legacy bookmarks did not do URI encoding correctly.  This function
// checks for the presence of a curly brace to determine if the bookmark
// is legacy.  With proper URI encoding, the stringified value is %7B.
function isLegacy(url) { 
    return url.indexOf("{") > -1;
}
function sspUrl(url) {
    let sspUrl = url.split("ssp://")[1];
    if (sspUrl) {
        return sspUrl;
    } else {
        console.log("bg bad URL", url);
        return undefined;
    }
}
function clone(object) {
    return JSON.parse(JSON.stringify(object));
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