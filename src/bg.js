'use strict';
import {isSuperPw, normalize,  string2array, array2string, stringXorArray, generatePassword } from "./generate.js";
// Set to true to run the tests in test.js then reload the extension.
// Using any kind of storage (session, local, sync) is awkward because 
// accessing the value is an async operation.
const testMode = false;
const testLogging = false;
const debugMode = false;
const logging = false;
const commonSettingsTitle = "CommonSettings";
// State I want to keep around
let sitedataBookmark = "SitePasswordData"; 
if (testMode) {
    sitedataBookmark = "SitePasswordDataTest";
} else if (debugMode) {
    sitedataBookmark = "SitePasswordDataDebug";
}
var superpw = "";
var activetab;
var domainname = "";
var protocol; // VSCode says this is unused, but it is in function retrieved() below.
var rootFolder = {id: -1};
var pwcount = 0;
var createBookmarksFolder = true;
export const webpage = "https://sitepassword.info/index.html";
export const config = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    specials: "/!=@?._-",
};
const baseDefaultSettings = {
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
export let defaultSettings =  clone(baseDefaultSettings);
export let bgDefault = {superpw: "", settings: defaultSettings};
export const databaseDefault = { "clearsuperpw": false, "hidesitepw": false, "domains": {}, "sites": {} };
var database = clone(databaseDefault);
var bg = clone(bgDefault);

let bkmksId;
let bkmksSafari = {};
async function setup() {
    try {
        bkmksId = await new Promise((resolve, reject) => {
            chrome.bookmarks.getTree((nodes) => {
                if (chrome.runtime.lastError) console.log("bg bkmksid lastError", chrome.runtime.lastError);
                bkmksId = nodes[0].children[0].id;
                resolve(bkmksId);
            });
        });
    } catch {
        // Safari
        bkmksId = -1;
        bkmksSafari = await new Promise((resolve, reject) => {
            if (chrome.runtime.lastError) console.log("bg bkmksSafarilastError", chrome.runtime.lastError);
            chrome.storage.sync.get((value) => {
                resolve(value);
                if (logging) console.log("bg got Safari bookmarks", bkmksSafari);
            });
        });
    }

    // Make sure previous asynch calls have finished
    setTimeout(() => {
        if (logging) console.log("bg finished waiting");
    }, 0);

    if (logging) console.log("bg clear superpw");

    if (logging) console.log("bg starting with database", database);

    // Check reminder clock set in ssp.js.  If too much time has passed, 
    // clear superpw so user has to reenter it as an aid in not forgetting it.
    await new Promise((resolve, reject) => {
        chrome.storage.local.get("reminder", (value) => {
            if (logging) console.log("bg got reminder", value);
            if (value.reminder) {
                let now = new Date();
                let then = new Date(value.reminder);
                let diff = now - then;
                if (logging) console.log("bg reminder diff", diff);
                if (diff > 604800000) {
                    if (logging) console.log("bg clearing superpw because of reminder");
                    superpw = "";
                    chrome.storage.session.set({"superpw": ""}, () => {
                        chrome.storage.local.set({"reminder": ""}, () => {
                            resolve("cleared");
                        });
                    });
                }
            }
            resolve("no reminder");
        });
    });
    // Need to clear cache following an update
    chrome.runtime.onInstalled.addListener(async function(details) {
        if (logging) console.log("bg clearing browser cache because of", details)
        await new Promise((resolve, reject) => {
            chrome.browsingData.removeCache({}, function() {
                if (logging) console.log("bg cleared the browser cache");
                if (details.reason === "install") {
                    chrome.windows.create({
                        url: "./gettingStarted.html",
                        type:"normal",
                        height:800,
                        width:800
                    }, () => {
                        resolve("installed");
                    });
                }
            });
        });
    });
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
            try {
                sessionStorage.getItem("superpw", (value) => {
                    if (logging) console.log("bg got superpw", value.superpw);
                    superpw = value.superpw;
               });
            } catch {
                superpw = await new Promise((resolve, reject) => {
                    chrome.storage.session.get(["superpw"], async (value) => {
                        resolve(value.superpw);
                    });
                });
            }
            superpw = superpw || "";
            bg.superpw = superpw;
            if (logging) console.log("bg got ssp", isSuperPw(superpw));
            if (request.cmd === "getMetadata") {
                await getMetadata(request, sender, sendResponse);
            } else if (request.cmd === "resetIcon") {
                // Don't worry about ordering or waiting for theses to finish
                chrome.storage.local.set({"onClipboard": false});
                chrome.action.setTitle({title: "Site Password"});
                chrome.action.setIcon({"path": "icon128.png"});
                sendResponse("icon reset");        
            } else if (request.cmd === "siteData") {
                if (logging) console.log("bg got site data", request);
                bg = clone(request.bg);
                database.clearsuperpw = request.clearsuperpw;
                database.hidesitepw = request.hidesitepw;
                superpw = bg.superpw || "";
                await persistMetadata(sendResponse);
            } else if (request.cmd === "getPassword") {                
                let domainname = getdomainname(sender.origin || sender.url);
                bg.settings = bgsettings(domainname);
                let p = await generatePassword(bg);
                p = stringXorArray(p, bg.settings.xor);
                if (database.clearsuperpw) {
                    superpw = "";
                    bg.superpw = "";
                    await persistMetadata(sendResponse);
                }
                if (logging) console.log("bg calculated sitepw", bg, database, p, isSuperPw(superpw));
                sendResponse(p);
            } else if (request.cmd === "keepAlive") {
                // Firefox doesn't preserve session storage across restarts, but Chrome does.
                // It's a good thing the keepAlive message works for Firefox but not for Chrome.
                if (chrome.storage.session) {
                    sendResponse({"keepAlive": false});
                } else {
                    sendResponse({"keepAlive": true});
                }
            } else if (request.cmd === "reset") {
                // Used for testing, can't be in test.js becuase it needs to set local variables 
                defaultSettings = clone(baseDefaultSettings);
                database = clone(databaseDefault);
                if (testLogging) console.log("bg removing bookmarks folder for testing", defaultSettings.pwlength);
                rootFolder = await getRootFolder(sendResponse);
                await new Promise((resolve, reject) => {
                    chrome.bookmarks.removeTree(rootFolder[0].id, () => {
                        createBookmarksFolder = true;
                        if (testLogging) console.log("bg removed bookmarks folder", rootFolder[0].title, defaultSettings.pwlength);
                        sendResponse("reset");
                        resolve("reset");
                    });
                });
            } else if (request.cmd === "newDefaults") {
                if (logging) console.log("bg got new default settings", request.newDefaults);
                defaultSettings = request.newDefaults;
                await persistMetadata(sendResponse);
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
                sendResponse(bg);
                if (database.clearsuperpw) {
                    superpw = "";
                    if (logging) console.log("bg clear superpw", isSuperPw(superpw));
                }
            } else if (request.onload) {
                await onContentPageload(request, sender, sendResponse);
                await persistMetadata(sendResponse);
            } else {
                if (logging) console.log("bg got unknown request", request);
                sendResponse("unknown request");
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
    // Don't lose database across async call
    let db = database;
    // Restores data stored the last time this page was loaded
    let activetabUrl = activetab.url;
    if (logging) console.log("bg got active tab", activetab);
    let savedData = {};
    try {
        let t = sessionStorage.getItem("savedData");
        savedData = JSON.parse(t) || {};
    } catch {
        await new Promise((resolve, reject) => {
            chrome.storage.session.get(["savedData"], (s)=> {
                if (logging) console.log("bg got saved data", s);
                if (s && Object.keys(s).length > 0) savedData = s.savedData;
                resolve("savedData");
            });
        });
    }
    // I don't create savedData in onContentPageLoad() for two reasons.
    //    1. Pages without a password field never send the message to trigger the save.
    //    2. file:/// pages don't get a content script to send that message.
    // In those cases s === {}, but I still need to send a response.
    if (savedData[activetabUrl]) {
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
    sendResponse({"test" : testMode, "superpw": superpw || "", "bg": bg, "database": db});
}
async function onContentPageload(request, sender, sendResponse) {
    if (logging) console.log("bg onContentPageLoad", bg, request, sender);
    activetab = sender.tab;
    bg.pwcount = request.count;
    pwcount = request.count;
    // Save data that service worker needs after it restarts
    let savedData = {};
    try {
        let t = sessionStorage.getItem("savedData");
        savedData = JSON.parse(t) || {};
    } catch {
        savedData = await new Promise((resolve, reject) => {
            chrome.storage.session.get(["savedData"], (s) => {
                if (Object.keys(s).length > 0) savedData = s.savedData;
                resolve(savedData);
            });
        });
    }
    savedData[activetab.url] = pwcount;
    if (logging) console.log("bg saving data", savedData[activetab.url]);
    try {
        let s = JSON.stringify(savedData);
        sessionStorage.setItem("savedData", s);
    } catch {
        await new Promise((resolve, reject) => {
            chrome.storage.session.set({"savedData": savedData}); 
            resolve("savedData");
        });
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
        "clearsuperpw": database.clearsuperpw,
        "hideSitepw": database.hideSitepw,
        "readyForClick": readyForClick
    });
}
async function persistMetadata(sendResponse) {
    // localStorage[name] = JSON.stringify(value);
    if (logging) console.log("bg persistMetadata", bg, database);
    // There appears to be a race condition.  Every once in a while
    // bg.settings is not defined when I get here.  I have no idea
    // why.  I think it makes sense to just exit in this case.
    if (!bg.settings) return;
    superpw = bg.superpw;
    try {
        sessionStorage.setItem("superpw", superpw);
    } catch {
        await new Promise((resolve, reject) => {
            chrome.storage.session.set({"superpw": superpw});
            resolve("superpw");
        });
    }
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
    try {
        allchildren = await new Promise((resolve, reject) => {
            chrome.bookmarks.getChildren(rootFolder.id, (allchildren) => {
                if (chrome.runtime.lastError) console.log("bg getChildren lastError", chrome.runtime.lastError);
                resolve(allchildren);
            }); // Deleted some so recreate list
        });
    } catch {
        allchildren = Object.values(bkmksSafari);
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
    let common = clone(db);
    delete common.domains;
    delete common.sites;
    common.defaultSettings = defaultSettings;
    if (logging) console.log("bg persistMetadata", common.defaultSettings.pwlength);
    // No merge for now
    if (commonSettings.length === 0) {
        let url = "ssp://" + JSON.stringify(common);
        await new Promise((resolve, reject) => {
            try {
                chrome.bookmarks.create({ "parentId": rootFolder.id, "title": commonSettingsTitle, "url": url }, (commonBkmk) => {
                    if (chrome.runtime.lastError) console.log("bg create root folder lastError", chrome.runtime.lastError);
                    if (logging) console.log("bg created common settings bookmark", commonBkmk.title, commonSettings.pwlength);
                    resolve("created");
                });
            } catch {
                bkmksSafari[commonSettingsTitle] = {};
                bkmksSafari[commonSettingsTitle].title = commonSettingsTitle;
                bkmksSafari[commonSettingsTitle].url = url;
                chrome.storage.sync.set(bkmksSafari, () => {
                    resolve("created Safari");
                });
            }
        });
    }
    let url = "ssp://" + JSON.stringify(common);
    if (commonSettings.length > 0 && url !== commonSettings[0].url.replace(/%22/g, "\"").replace(/%20/g, " ")) {
        await new Promise((resolve, reject) => {
            try {
                chrome.bookmarks.update(commonSettings[0].id, { "url": url }, (_e) => {
                    if (chrome.runtime.lastError) console.log("bg update commonSettings lastError", chrome.runtime.lastError);
                    console.log("bg updated bookmark", _e, commonSettings[0].id, url);
                    resolve("updated");
                });
            } catch {
                bkmksSafari[commonSettingsTitle].url = url;
                chrome.storage.sync.set(bkmksSafari, () => {
                    resolve("updated");
                });
            }
        });
    }
    // Persist changes to domain settings
    let domainnames = Object.keys(db.domains);
    for (let i = 0; i < domainnames.length; i++) {
        let sitename = db.domains[domainnames[i]];
        let settings = db.sites[sitename];
        if ("string" === typeof settings.specials) {
            let array = string2array(settings.specials);
            settings.specials = array;
        }
        let url = webpage + "?bkmk=ssp://" + JSON.stringify(settings);
        let found = domains.find((item) => item.title === domainnames[i]);
        if (found) {
            let foundSettings = JSON.parse(sspUrl(found.url).replace(/%22/g, "\"").replace(/%20/g, " "));
            if (!sameSettings(settings, foundSettings) || found.url.substr(0,6) === "ssp://") {
                url = webpage + "?bkmk=ssp://" + JSON.stringify(settings);
                await new Promise((resolve, reject) => {
                    try {
                        chrome.bookmarks.update(found.id, { "url": url }, (_e) => {
                            if (chrome.runtime.lastError) console.log("bg update lastError", chrome.runtime.lastError, found);
                            if (logging) console.log("bg updated bookmark resolving promise");
                            resolve("updated");
                        });
                    } catch {
                        // Handle Safari bookmarks
                        if (bkmksSafari[found.title] && bkmksSafari[found.title].url !== url) {
                            bkmksSafari[found.title].url = url;
                            chrome.storage.sync.set(bkmksSafari, () => {
                                resolve("updated Safari");
                            });
                        }
                    }
                });
            }
        } else {
            if (bg.settings.sitename && 
                (domainnames[i] === bg.settings.domainname) ||
                (domainnames[i] === bg.settings.pwdomainname)) {
                let title = domainnames[i];
                url = webpage + "?bkmk=ssp://" + JSON.stringify(settings);
                if (logging) console.log("bg creating bookmark for", title);
                try {
                    await new Promise((resolve, reject) => {
                        chrome.bookmarks.create({ "parentId": rootFolder.id, "title": title, "url": url }, (e) => {
                            if (chrome.runtime.lastError) console.log("bg create bookmark lastError", chrome.runtime.lastError);
                            if (logging) console.log("bg created settings bookmark", e, title);
                            resolve("created");
                        });
                    });
                } catch {
                    bkmksSafari[title] = {};
                    bkmksSafari[title].title = title;
                    bkmksSafari[title].url = url;
                    await new Promise((resolve, reject) => {
                        chrome.storage.sync.set(bkmksSafari, () => {;
                            resolve("created Safari");
                        });
                    });
                }
            }
        }
    }
    sendResponse("persisted");
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
    } else if (folders.length === 0) {
        // findpw.js sends the SiteData message twice, once for document.onload
        // and once for window.onload.  The latter can arrive while the bookmark
        // folder is being created, resulting in two of them.  My solution is to
        // use a flag to make sure I only create it once.
        if (createBookmarksFolder) {
            createBookmarksFolder = false;
            if (logging || testLogging) console.log("Creating SSP bookmark folder");
            let bkmk = - 1;
            await new Promise((resolve, reject) => {
                try {
                    // If there's no bookmarks folder, but there are entries in sync storage,
                    // then copy those entries to bookmarks and clear sync storage.  This will
                    // happen when the browser newly implements the bookmarks API.
                    if (logging) console.log("bg creating bookmarks folder");
                    chrome.bookmarks.create({ "parentId": bkmksId, "title": sitedataBookmark }, async (bkmk) => {
                        if (chrome.runtime.lastError) console.log("bg sync lastError", chrome.runtime.lastError);
                        await parseBkmk(bkmk.id, callback, sendResponse);
                        resolve(bkmk);
                    });
                } catch {
                    // Leaving the entries in sync storage protects against the case where a browser (Safari) 
                    // starts supporting the bookmarks API, but users haven't updated the browser on all their machines.
                    //chrome.storage.sync.clear();

                    // Nothing in sync storage unless using Safari
                    chrome.storage.sync.get((values) => {
                        for (let title in values) {
                            chrome.bookmarks.create({"parentId": bkmk.id, "title": title, "url": values[title].url}, async (bkmk) => {
                                if (chrome.runtime.lastError) {
                                    console.log("bg sync create lastError", chrome.runtime.lastError);
                                } else {
                                    if (testLogging) console.log("bg created bookmark", bkmk);
                                }
                                await parseBkmk(bkmk.id, callback, sendResponse);
                                resolve(bkmk);
                            });
                        }
                    });
                }
            });
        }
    }
}
async function parseBkmk(rootFolderId, callback, sendResponse) {
    if (logging) console.log("bg parsing bookmark");
    let children = [];
    try {
        children = await new Promise((resolve, reject) => {
            chrome.bookmarks.getChildren(rootFolderId, (children) => {
                if (chrome.runtime.lastError) console.log("bg parseBkmk lastError", chrome.runtime.lastError);
                resolve(children);
            });
        });
    } catch {
        Object.values(bkmksSafari);
    }
    if (logging) console.log("bg cleaning bookmarks", children);
    let seenTitles = {};
    let newdb = clone(databaseDefault);
    for (let i = 0; i < children.length; i++) {
        let title = children[i].title;
        // Remove legacy bookmarks
        if (!isNaN(title)) {
            await new Promise((resolve, reject) => {
                try {
                    chrome.bookmarks.remove(children[i].id, () => {
                        if (chrome.runtime.lastError) console.log("bg remove legacy lastError", chrome.runtime.lastError);
                        resolve("removed");
                    });
                } catch {
                    delete bkmksSafari[children[i]];
                    chrome.storage.sync.set(bkmksSafari, () => {
                        resolve("removed Safari");
                    });
                }
            });
        }
        if (seenTitles[title]) {
            let seen = JSON.parse(sspUrl(children[seenTitles[title]].url).replace(/%22/g, "\"").replace(/%20/g, " "));
            let dupl = JSON.parse(sspUrl(children[i].url).replace(/%22/g, "\"").replace(/%20/g, " "));
            if (sameSettings(seen, dupl)) {
                try {
                    await new Promise((resolve, reject) => {
                        chrome.bookmarks.remove(children[i].id, () => {
                            if (chrome.runtime.lastError) console.log("bg duplicates lastError", chrome.runtime.lastError);
                            resolve("removed");
                        });
                    });
                } catch {
                    delete bkmksSafari[children[i]];
                }
            } else {
                sendResponse({"duplicate": children[i].title});
                continue;
            }
        } else {
            seenTitles[title] = i;
        }
        if (title === commonSettingsTitle) {
            let common = JSON.parse(sspUrl(children[i].url).replace(/%22/g, "\"").replace(/%20/g, " "));
            if (logging) console.log("bg common settings from bookmark", common.defaultSettings.pwlength);
            newdb.clearsuperpw = common.clearsuperpw;
            newdb.hidesitepw = common.hidesitepw;
            defaultSettings = common.defaultSettings || defaultSettings;
        } else {
            let settings = JSON.parse(sspUrl(children[i].url).replace(/%22/g, "\"").replace(/%20/g, " "));
            if ('string' !== typeof settings.specials) {
                let specials = array2string(settings.specials);
                settings.specials = specials;
            }
            if (settings.sitename) {
                newdb.domains[title] = normalize(settings.sitename);
                newdb.sites[normalize(settings.sitename)] = settings;
            }
        }
    }
    database = newdb;
    retrieved(callback);
}
async function getRootFolder(sendResponse) {
    if (logging) console.log("bg getRootFolder", sitedataBookmark);
    // bookmarks.search finds any bookmark with a title containing the
    // search string, but I need to find one with an exact match.  I
    // also only want to include those in the bookmarks bar.
    try {
        return await new Promise((resolve, reject) => {
            chrome.bookmarks.search({ "title": sitedataBookmark }, (candidates) => {
                if (logging) console.log("bg search candidates", candidates);
                if (chrome.runtime.lastError) console.log("bg search lastError", chrome.runtime.lastError);
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
                resolve(folders);
            });
        });
    } catch (e){
        return [bkmksSafari];
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
        await new Promise((resolve, reject) => {
            if (logging) console.log("bg forget getting children", item, rootFolder);
            chrome.bookmarks.getChildren(rootFolder.id, (allchildren) => {
                if (chrome.runtime.lastError) console.log("bg forget lastError", chrome.runtime.lastError);
                if (logging) console.log("bg forget got children", allchildren);
                for (let child of allchildren) {
                    if (child.title === item) {
                        if (logging) console.log("bg removing bookmark for", child.title);
                        chrome.bookmarks.remove(child.id, () => {
                            if (chrome.runtime.lastError) console.log("bg remove child lastError", chrome.runtime.lastError);
                            if (logging) console.log("bg removed bookmark for", item);
                            chrome.tabs.sendMessage(activetab.id, { "cmd": "clear" }, () => {
                                if (logging) console.log("bg sent clear message");
                                resolve("removed");
                            });
                        });                       
                    } else {
                        resolve("not found");
                    }
                }
            });
        });
        if (logging) console.log("bg forget await promise", item, promise);
        if (logging) console.log("bg forget done", item);
    }
    sendResponse("forgot");
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