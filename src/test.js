// To run the tests, set testMode to true in bg.js and reload 
// the extension.  Then open any https page, e.g., https://alanhkarp.com. 
// Right click on the SitePassword icon and select "Inspect".  You will 
// see an alert "Starting tests".  Click OK and check the console for results.
import { baseDefaultSettings, getRootFolder } from "./bg.js";
import { normalize } from "./generate.js";
import { getsettings, restoreForTesting } from "./ssp.js";
import {$, get} from "./domElements.js";

export let resolvers = {};

let logging = false;
let loggingCalculation = false;
let loggingClear = false;
let loggingClearsuperpw = false;
let loggingDefault = false;
let loggingDuplicateBkmks = false;
let loggingFill = false;
let loggingForget = false;
let loggingPhishing = false;
let loggingProvide = false;
let loggingReset = false;
let loggingTrigger = false;
let loggingWrapHandler = false;
let loggingRememberForm = false;
let loggingRememberSuperpw = false;
if (logging) {
    loggingCalculation = loggingClear = loggingDefault = loggingFill = 
                         loggingForget = loggingPhishing = loggingProvide = 
                         loggingReset = loggingTrigger = loggingWrapHandler = 
                         loggingRememberForm = loggingRememberSuperpw = true;
}

let passed = 0;
let failed = 0;
const expectedpw = "c3EEm4qRFSfk";

export async function runTests() {
    let restart = localStorage.restart;
    if (restart) {
        alert("Restarting test");
        console.log("Restarting test " + restart);
    } else {
        alert("Starting tests. Set testMode in bg.js to false to stop tests.");
    }
    await triggerEvent("click", $.settingsshow);  // For debugging
    if (!restart) {
        await testCalculation(); 
        await testRememberSuperpw();
        await testChangePassword();
        await testRememberForm();
        await testProvidedpw();
        await testPhishing();
        await testSharedCredentials();
        await testForget();
        await testClearSuperpw();
        await testHideSitepw();
        await testLegacyBkmks();
        await testDuplicateBkmks();
        await testSafeSuffixes();
        await testChangeSuperpw();
        console.log("Tests complete: " + passed + " passed, " + failed + " failed, ");
        alert("Tests restart complete: " + passed + " passed, " + failed + " failed, ");
        await testSaveAsDefault();
    } else {
        if (restart === "testSaveAsDefault2") {
            testSaveAsDefault2();
            localStorage.restart = "";
        } else {
            console.error("Unknown test", restart);
        }
    }
}
// Test password calculation
async function testCalculation() {
    if (loggingCalculation) console.log("testCalculation start");
    await resetState();
    await triggerEvent("click", $.settingsshow);  // For debugging
    if (loggingCalculation) console.log("testCalculation state reset", $.pwlength.value);
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
    if (loggingCalculation) console.log("testCalculation form filled", $.sitename.value, $.username.value);
    let actual = $.sitepw.value;
    let test = actual === expectedpw;
    let inputs = {"expectedpw": expectedpw, "actual": actual, "superpw": $.superpw.value, "sitename": $.sitename.value, "username": $.username.value};
    testMsg(test, "Calculation", "Calculation", inputs);
}
// Test remembering super password
async function testRememberSuperpw() {
    await resetState();
    let expectedsuperpw = "MySuperPassword";
    await fillForm(expectedsuperpw, "alantheguru.alanhkarp.com", "Guru", "Alan");
    if (loggingRememberSuperpw) console.log("testRememberSuperpw state reset", $.superpw.value);
    await triggerEvent("click", $.settingsshow);
    // superpwhash uses default settings, so make sure it ignores non-default setings
    await updateValue($.pwlength, "16");
    await triggerEvent("blur", $.pwlength);
    let expected = $.sitepw.value;
    await triggerEvent("mouseleave", $.mainpanel);  // $.mainpanel.onmouseleave(); saves the settings
    await clearForm();
    restoreForTesting();
    await updateValue($.domainname, "alantheguru.alanhkarp.com");
    await triggerEvent("blur", $.domainname);
    await triggerEvent("click", $.settingsshow); // For debugging
    let test = $.superpw.value === expectedsuperpw && $.sitepw.value === expected;
    testMsg(test, "Remember super password", "Remember super password", "expected", expectedsuperpw, "got", $.superpw.value);
}
// Test change password
async function testChangePassword() {
    await phishingSetup();
    await triggerEvent("click", $.sameacctbutton);
    restoreForTesting();
    await triggerEvent("mouseleave", $.mainpanel);
    restoreForTesting();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
    await updateValue($.sitename, "Guru2");
    await triggerEvent("blur", $.sitename);
    let actual = $.sitepw.value;
    await triggerEvent("mouseleave", $.mainpanel);
    restoreForTesting();
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    let test = $.sitename.value === "Guru2" && $.username.value === "Alan" && $.sitepw.value === actual;
    testMsg(test, "Change password", "Change password", "Guru2", "Alan", actual, $.sitename.value, $.username.value, $.sitepw.value);
}
async function testRememberForm() {
    if (loggingRememberForm) console.log("testRememberForm state reset");
    let setupFn = async () => {
        await triggerEvent("click", $.startwithletter);
    };
    let tests = await testFormElement(setupFn, "start with letter, password correct");
    tests = tests && /^\d/.test($.sitepw.value);
    if (tests) {
        console.log("Remember form password starts with letter");
        passed++;
    } else {
        console.warn("Remember form password starts with letter", $.sitepw.value);
        failed++;
    }
    setupFn = async () => {
        await triggerEvent("click", $.allowspecialcheckbox);
        await updateValue($.specials, "/!=@?._-");
        await triggerEvent("blur", $.specials); // For debugging
    };
    tests = tests && await testFormElement(setupFn, "allow special characters");
    setupFn = async () => {
        await updateValue($.pwlength, 16);
        await triggerEvent("blur", $.pwlength);
    };
    tests = tests && await testFormElement(setupFn, "password length");
    tests = tests && await testAllows("lower");
    tests = tests && await testAllows("upper");
    tests = tests && await testAllows("number");
    async function testAllows(which) {
        let regex = {"lower": /[a-z]/g, "upper": /[A-Z]/g, "number": /[0-9]/g, "special": /[^\w]/g}[which];         
        let element = "allow" + which + "checkbox";
        let setupFn = async () => {
            await triggerEvent("click", get(element));
        };
        let tests = await testFormElement(setupFn, "allow " + which);
        tests = tests && !regex.test($.sitepw.value);
        return tests;
    }
    async function testFormElement(setupFn, description) {
        await resetState();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
        await triggerEvent("click", $.settingsshow);
        await setupFn();
        let expectdpw = $.sitepw.value;
        await triggerEvent("mouseleave", $.mainpanel);  // $.mainpanel.onmouseleave(); saves the settings
        if (loggingRememberForm) console.log("testRememberForm filled form", $.sitename.value, $.username.value);
        // See if it remembers
        await clearForm();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        if (loggingRememberForm) console.log("testRememberForm filled form", $.sitename.value, $.username.value);
        await triggerEvent("blur", $.domainname);
        await triggerEvent("click", $.settingsshow); // For debugging
        let tests = $.sitename.value === "Guru";
        tests = tests && $.username.value === "Alan";
        tests = tests && $.sitepw.value === expectdpw;
        if (tests) {
            console.log("Remember form:", description);
            passed++;
        } else {
            console.warn("Remember form:", description, "expected pw", expectdpw, "got", $.sitepw.value);
            failed++;
        }
        return tests;
    }
}
async function testProvidedpw() {
    await resetState();
    const providedpw = "MyStrongPassword";
    // Test remembering provided password longer than computed password
    if (loggingProvide) console.log("testProvidedpw state reset");
    let unprovided = await providepwSetup("qwerty", providedpw, "alantheguru.alanhkarp.com", "Guru", "Alan");
    await triggerEvent("mouseleave", $.mainpanel);
    if (loggingProvide) console.log("testProvidedpw saved", $.sitepw.value);
    // See if it remembers
    await clearForm();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    document.activeElement.blur(); // So sitepw field is not the active element
    await triggerEvent("blur", $.domainname);
    await triggerEvent("click", $.settingsshow); // For debugging
    if (loggingProvide) console.log("testProvidedpw domainname blur", $.sitepw.value, $.providesitepw.checked);
    let test = $.sitepw.value === providedpw;
    testMsg(test, "Remembers provided pw longer than computed pw", "Remembers provided pw longer than computed pw", providedpw, "|" + $.sitepw.value + "|");
    // Test remembering provided password shorter than computed password
    await resetState();
    let expectedpw2 = "short";
    unprovided = await providepwSetup("qwerty", expectedpw2, "alantheguru.alanhkarp.com", "Guru", "Alan");
    await clearForm();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = $.sitepw.value === expectedpw2;
    testMsg(test, "Remembers provided pw shorter than computed pw", "Remembers provided pw shorter than computed pw", expectedpw2, "|" + $.sitepw.value + "|");
    // See if I ignore case when deciding if site name was changed
    await updateValue($.sitename, "guru");
    await triggerEvent("blur", $.sitename);
    test = $.changesitename.style.display === "none";
    testMsg(test, "Ignores case when deciding if site name was changed", "Ignores case when deciding if site name was changed", expectedpw2, "|" + $.sitepw.value + "|", "guru", "|" + $.sitename.value + "|");
    // See if I ignore case when deciding if user name was changed
    await updateValue($.username, "alan");
    await triggerEvent("blur", $.username);
    test = $.changeusername.style.display === "none";
    testMsg(test, "Ignores case when deciding if username was changed", "Ignores case when deciding if username was changed", expectedpw2, "|" + $.sitepw.value + "|", "Alan", "|" + $.username.value + "|");
    // See if I get a warning when I change the site name
    await updateValue($.sitename, "Guru2");
    await triggerEvent("blur", $.sitename);
    test = $.changesitename.style.display !== "none";
    await triggerEvent("click", $.changesitenameokbutton);
    test = test && $.changesitename.style.display == "none";
    test = test && $.sitepw.value === expectedpw2;
    testMsg(test, "Change sitename with provided pw", "Change sitename with provided pw", expectedpw2, "|" + $.sitepw.value + "|", "Guru2", "|" + $.sitename.value + "|");
    // See if I get a warning when I change the user name
    await updateValue($.username, "Alan2");
    await triggerEvent("blur", $.username);
    await triggerEvent("mouseleave", $.mainpanel);
    test = $.changeusername.style.display !== "none";
    await triggerEvent("click", $.changeusernameokbutton);
    test = test && $.changeusername.style.display === "none";
    await triggerEvent("click", $.changeusernameokbutton);
    test = test && $.sitepw.value === expectedpw2;
    testMsg(test, "Change username with provided pw", "Change username with provided pw", expectedpw2, "|" + $.sitepw.value + "|", "Alan2", "|" + $.username.value + "|");
    // What happens if I go back to the computed password that's shorter than the provided password
    restoreForTesting ();
    await clearForm();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
    await triggerEvent("click", $.settingsshow);
    await triggerEvent("click", $.providesitepw);
    await updateValue($.pwlength, 12);
    await triggerEvent("blur", $.pwlength);
    test = $.sitepw.value === unprovided;
    testMsg(test, "Go back to computed pw", "Go back to computed pw", unprovided, "|" + $.sitepw.value + "|");
}
// Test phishing
async function testPhishing() {
    await phishingSetup();
    // Does warning appear?
    let test = $.phishing.style.display === "block";
    testMsg(test, "Phishing warning is showing", "Phishing warning not showing");
    // Test cancel button
    await triggerEvent("click", $.cancelwarning);
    test = $.phishing.style.display === "none" && $.sitename.value === "";
    testMsg(test, "Phishing warning dismissed by cancel button", "Phishing warning not dismissed by cancel button");
    // Test nickname button
    await updateValue($.sitename, "Guru");
    await triggerEvent("blur", $.sitename);
    await triggerEvent("click", $.nicknamebutton);
    test = $.phishing.style.display === "none" && $.sitename.value === "Guru";
    testMsg(test, "Phishing warning dismissed by nickname button", "Phishing warning not dismissed by nickname button");
    // Does setting new site name work?
    await updateValue($.sitename, "Guru2");
    await triggerEvent("blur", $.sitename);
    test = $.phishing.style.display === "none" && $.sitename.value === "Guru2";
    testMsg(test, "Phishing warning remains hidden after changing site name", "Phishing warning appeared after changing site name");
    // Does same account option work?
    await updateValue($.sitename, "Guru");
    await triggerEvent("blur", $.sitename);
    await triggerEvent("click", $.sameacctbutton);
    await triggerEvent("mouseleave", $.mainpanel);
    test = $.phishing.style.display === "none";
    test = test && $.sitename.value === "Guru";
    test = test && $.username.value === "Alan";
    testMsg(test, "Phishing same account");
    await clearForm();
    // Does it remember the same account for the phishing domain?
    await fillForm("", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = $.sitename.value === "Guru" && $.username.value === "Alan";
    testMsg(test, "Phishing remembered same account", "Phishing remembered same account");
}
// Test shared credentials
async function testSharedCredentials() {
    await resetState();
    await fillForm("qwerty", "disney.com", "Disney", "Alan");
    await triggerEvent("mouseleave", $.mainpanel);  // $.mainpanel.onmouseleave(); saves the settings
    let expected = $.sitepw.value;
    restoreForTesting();
    await fillForm("qwerty", "hulu.com", "", "");
    await triggerEvent("blur", $.domainname);
    await triggerEvent("mouseleave", $.mainpanel);  // $.mainpanel.onmouseleave(); saves the settings
    restoreForTesting();
    await fillForm("qwerty", "hulu.com", "", "");
    await triggerEvent("blur", $.domainname);
    let test = $.phishing.style.display === "none";
    test = test && $.username.value === "Alan";
    test = test && $.sitepw.value === expected;
    testMsg(test, "Shared credentials", "Shared credentials");
}
// Test forget
async function testForget() {
    if (loggingForget) console.log("testForget");
    await resetState();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
    await triggerEvent("mouseleave", $.mainpanel);
    // Does cancel button work
    await triggerEvent("mouseover", $.domainname3bluedots);
    await triggerEvent("click", $.domainnamemenuforget);
    await triggerEvent("mouseout", $.domainname3bluedots);
    await triggerEvent("click", $.forgetcancelbutton);
    let test = $.forget.style.display === "none";
    testMsg(test, "Forget cancel button", "Forget cancel button did not work");
    // Test forget by domain name
    await forgetDomainname();
    // See if it forgot
    await clearForm();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = $.sitename.value === "" && $.username.value === "";
    testMsg(test, "Forget by domain name", "Forget by domain name");
    // See if database still has site name if it should
    await phishingSetup();
    await triggerEvent("click", $.sameacctbutton); // Now I have two domain names pointing to the same site name
    await triggerEvent("mouseleave", $.mainpanel);
    await forgetDomainname();
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = $.sitename.value === "" && $.username.value === "";
    testMsg(test, "Forget site name when it should", "Did not forget site name when it should");
    // See if forget by site name works
    await phishingSetup();
    await triggerEvent("click", $.sameacctbutton); // Now I have two domain names pointing to the same site name
    await forgetSitename();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = $.sitename.value === "" && $.username.value === "";
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = test && $.sitename.value === "" && $.username.value === "";
    testMsg(test, "Forget by site name", "Forget by site name");
    // See if forget by username works
    await phishingSetup();
    await triggerEvent("click", $.sameacctbutton); // Now I have two domain names pointing to the same site name
    if (loggingForget) console.log("testForget forget by username");
    await forgetUsername();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    if (loggingForget) console.log("testForget forgot by username", $.sitename.value, $.username.value);
    test = $.sitename.value === "" && $.username.value === "";
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = test && $.sitename.value === "" && $.username.value === "";
    testMsg(test, "Forget by username", "Forget by username");
    // See if forget works even if you don't leave the popup
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
    await triggerEvent("mouseleave", $.mainpanel);
    await forgetDomainname();
    test = $.forget.style.display === "none";
    testMsg(test, "Forget without leaving popup no warning", "Forget without leaving popup warning");
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "");
    test = $.username.value === "";
    testMsg(test, "Forget without leaving popup no username", "Forget without leaving popup username");
    async function forgetDomainname() {
        if (loggingForget) console.log("forgetDomainname");
        await triggerEvent("mouseover", $.domainname3bluedots);
        await triggerEvent("click", $.domainnamemenuforget);
        await triggerEvent("mouseout", $.domainname3bluedots);
        await triggerEvent("click", $.forgetbutton);
        if (loggingForget) console.log("forgetDomainname done");
    }
    async function forgetSitename() {
        if (loggingForget) console.log("forgetSitename");
        await triggerEvent("mouseover", $.sitename3bluedots);
        await triggerEvent("click", $.sitenamemenuforget);
        await triggerEvent("mouseout", $.sitename3bluedots);
        await triggerEvent("click", $.forgetbutton);
        if (loggingForget) console.log("forgetSitename done");
    }
    async function forgetUsername() {
        if (loggingForget) console.log("forgetUsername");
        await triggerEvent("mouseover", $.username3bluedots);
        await triggerEvent("click", $.usernamemenuforget);
        await triggerEvent("mouseout", $.username3bluedots);
        if (loggingForget) console.log("forgetUsername click forgetbutton forgetclickResolver");
        await triggerEvent("click", $.forgetbutton);
        if (loggingForget) console.log("forgetUsername forgetclickResolver done");
    }
}
// Test proper handling of duplicate bookmarks
async function testDuplicateBkmks() {
    let title = "duplicate.bkmk.com";
    let url = "https://sitepassword.info/?bkmk=ssp://%7B%22sitename%22%3A%22usps%22%2C%22username%22%3A%22fred%22%2C%22providesitepw%22%3Afalse%2C%22xor%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%2C%22domainname%22%3A%22reg.usps.com%22%2C%22pwdomainname%22%3A%22reg.usps.com%22%2C%22pwlength%22%3A%2212%22%2C%22startwithletter%22%3Atrue%2C%22allowlower%22%3Atrue%2C%22allowupper%22%3Atrue%2C%22allownumber%22%3Atrue%2C%22allowspecial%22%3Afalse%2C%22minlower%22%3A%221%22%2C%22minupper%22%3A%221%22%2C%22minnumber%22%3A%221%22%2C%22minspecial%22%3A%221%22%2C%22specials%22%3A%22%24%2F!%3D%40%3F._-%22%2C%22characters%22%3A%220123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%22%7D";
    await resetState();
    await triggerEvent("mouseleave", $.mainpanel);
    // Create a duplicate bookmark
    let rootFolder = await getRootFolder();
    if (loggingDuplicateBkmks) console.log("testDuplicateBkmks creating identical duplicate bookmarks");
    await chrome.bookmarks.create({ "parentId": rootFolder.id, "title": title, "url": url });
    await chrome.bookmarks.create({ "parentId": rootFolder.id, "title": title, "url": url });
    await triggerEvent("mouseleave", $.mainpanel);
    let children = await chrome.bookmarks.getChildren(rootFolder.id);
    // See if only one of the duplicats remains
    let test = children.length === 2; // because of the common settings bookmark
    test = test && (children[0].title === title || children[0].title === "CommonSettings");
    test = test && (children[1].title === title || children[1].title === "CommonSettings");
    testMsg(test, "Identical duplicate bookmark handled", "Identical duplicate bookmark not handled");
    // Create a duplicate bookmark with different settings
    let newUrl = url.replace("fred", "barney");
    if (loggingDuplicateBkmks) console.log("testDuplicateBkmks creating different duplicate bookmark");
    await chrome.bookmarks.create({ "parentId": rootFolder.id, "title": title, "url": newUrl });
    await triggerEvent("load", window);
    let alertString = await chrome.storage.local.get("alertString");
    alertString = alertString?.alertString;
    test = !!alertString;
    test = test && alertString?.includes("You have duplicate bookmarks");
    testMsg(test, "Different duplicate bookmark handled", "Different duplicate bookmark not handled");
    // Test duplicate common settings bookmark
    await resetState();
    await triggerEvent("mouseleave", $.mainpanel);
    rootFolder = await getRootFolder();
    // Create a duplicate common settings bookmark}
    if (loggingDuplicateBkmks) console.log("testDuplicateBkmks creating identical duplicate common settings bookmark");
    url = "ssp://%7B%22clearsuperpw%22%3Afalse%2C%22hidesitepw%22%3Afalse%2C%22safeSuffixes%22%3A%7B%7D%2C%22defaultSettings%22%3A%7B%22sitename%22%3A%22%22%2C%22username%22%3A%22%22%2C%22providesitepw%22%3Afalse%2C%22xor%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%2C%22pwlength%22%3A12%2C%22domainname%22%3A%22%22%2C%22pwdomainname%22%3A%22%22%2C%22startwithletter%22%3Atrue%2C%22allowlower%22%3Atrue%2C%22allowupper%22%3Atrue%2C%22allownumber%22%3Atrue%2C%22allowspecial%22%3Afalse%2C%22minlower%22%3A1%2C%22minupper%22%3A1%2C%22minnumber%22%3A1%2C%22minspecial%22%3A1%2C%22specials%22%3A%22%24%2F!%3D%40%3F._-%22%7D%7D";
    title = "CommonSettings";
    await chrome.bookmarks.create({ "parentId": rootFolder.id, "title": title, "url": url });
    url = url.replace("false", "true");
    await chrome.bookmarks.create({ "parentId": rootFolder.id, "title": title, "url": url });
    await triggerEvent("load", window);
    children = await chrome.bookmarks.getChildren(rootFolder.id);
    alertString = await chrome.storage.local.get("alertString");
    alertString = alertString?.alertString;
    test = !!alertString;
    test = test && alertString?.includes("You have duplicate bookmarks");
    testMsg(test, "Duplicate common settings bookmark handled", "Duplicate common settings bookmark not handled");
    // Test duplicate folders
    await resetState();
    if (loggingDuplicateBkmks) console.log("testDuplicateBkmks creating different duplicate common settings bookmark");
    await chrome.bookmarks.create({ "parentId": "1", "title": "SitePasswordDataTest" });
    await triggerEvent("blur", $.domainname);
    alertString = await chrome.storage.local.get("alertString");
    alertString = alertString?.alertString;
    test = !!alertString;
    test = test && alertString?.includes("You have multiple bookmark folders with the title");
    testMsg(test, "Different duplicate common settings bookmark handled", "Different duplicate common settings bookmark not handled");
    await resetState();
}
// Test clear superpw
async function testClearSuperpw() {
    if (loggingClearsuperpw) console.log("testClearSuperpw");
    await resetState();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
    await triggerEvent("click", $.settingsshow); // For debugging
    await triggerEvent("click", $.clearsuperpw);
    restoreForTesting();
    await triggerEvent("mouseleave", $.mainpanel);
    let response = await chrome.runtime.sendMessage({"cmd": "getPassword", "domainname": "alantheguru.alanhkarp.com"});
    await triggerEvent("blur", $.domainname);
    if (loggingClearsuperpw || logging) console.log("testClearSuperpw getPassword", response);
    let test = $.superpw.value === "" && response === expectedpw;
    testMsg(test, "Clear superpw", "Clear superpw");
}
// Test hide sitepw
async function testHideSitepw() {
    await resetState();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
    await triggerEvent("mouseleave", $.mainpanel);
    await triggerEvent("click", $.hidesitepw);
    await triggerEvent("mouseleave", $.mainpanel);
    await triggerEvent("blur", $.domainname);
    let test = $.sitepw.type === "password";
    testMsg(test, "Hide sitepw", "Hide sitepw");
}
// Test updating legacy bookmarks
async function testLegacyBkmks() {
    // Create a legacy bookmark
    await resetState();
    let title = "legacy.bkmk.com";
    let url = "https://sitepassword.info/?bkmk=ssp://{%22sitename%22:%22usps%22,%22username%22:%22fred%22,%22providesitepw%22:false,%22xor%22:[0,0,0,0,0,0,0,0,0,0,0,0],%22pwlength%22:12,%22domainname%22:%22reg.usps.com%22,%22pwdomainname%22:%22reg.usps.com%22,%22startwithletter%22:true,%22allowlower%22:true,%22allowupper%22:true,%22allownumber%22:true,%22allowspecial%22:false,%22minlower%22:1,%22minupper%22:1,%22minnumber%22:1,%22minspecial%22:1,%22specials%22:%22$./!=@?._-%22,%22characters%22:%220123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%22}";
    let rootFolder = await getRootFolder();
    await chrome.bookmarks.create({ "parentId": rootFolder.id, "title": title, "url": url });
    await triggerEvent("mouseleave", $.mainpanel);
    let children = await chrome.bookmarks.getChildren(rootFolder.id);
    let test = children[0].url.indexOf("{") === -1;
    testMsg(test, "Legacy bookmark updated", "Legacy bookmark not updated");
}
// Test safe suffixes
async function testSafeSuffixes() {
    // Test that you get the simple phishing warning with a safe suffix
    await resetState();
    await phishingSetup();
    await triggerEvent("click", $.sameacctbutton);
    restoreForTesting();
    await triggerEvent("mouseleave", $.mainpanel);
    await fillForm("qwerty", "ahktheguru.alanhkarp.com", "Guru", "");
    await triggerEvent("blur", $.sitename);
    let test = $.suffix.style.display === "block";
    await triggerEvent("click", $.suffixacceptbutton);
    test = test && $.suffix.style.display === "none";
    test = test && $.username.value === "Alan" && $.sitepw.value === expectedpw && $.suffix.style.display === "none";
    await triggerEvent("mouseleave", $.mainpanel);
    testMsg(test, "Safe suffix", "Safe suffix");
    // Test that you do get a phishing warning with an unsafe suffix
    restoreForTesting();
    await fillForm("qwerty", "alantheguru.allanhkarp.com", "Guru", "");
    await triggerEvent("blur", $.sitename);
    test = $.username.value === "" && $.phishing.style.display === "block";
    testMsg(test, "Unsafe suffixes", "Unsafe suffixes");
    // Test that you don't get an entry in the public suffix list in the safe suffixes
    restoreForTesting();
    await fillForm("qwerty", "alantheguru.allanhkarp.com", "Guru", "");
    await triggerEvent("blur", $.sitename);
    await triggerEvent("click", $.sameacctbutton);
    restoreForTesting();
    await triggerEvent("mouseleave", $.mainpanel);
    await fillForm("qwerty", "alantheguru.alenhkarp.com", "Guru", "");
    await triggerEvent("blur", $.sitename);
    test = $.phishing.style.display === "block";
    get("phishing").style.display = "none";
    testMsg(test, "Not in safe suffixes", "Not in safe suffixes");
}
// Test changing super password 
async function testChangeSuperpw() { 
    await resetState();
    // Test superpw typo path
    await updateValue($.superpw, "qwerty");
    await triggerEvent("mouseleave", $.mainpanel); // Remember superpw
    let test = $.changesuperpw.style.display === "none";
    testMsg(test, "Change super password not showing", "Change super password showing");
    // Enter the old superpw - The account button should be disabled
    await updateValue($.superpw, "");
    await triggerEvent("mouseleave", $.superpw);
    test = $.changesuperpw.style.display === "none";
    testMsg(test, "Change super password not showing when super password is blank", "Change super password showing when super password is blank");
    await triggerEvent("mouseover", $.superpw3bluedots);
    await triggerEvent("click", $.superpwmenuaccount);
    test = $.changesuperpw.style.display === "none";
    testMsg(test, "Account icon disabled when super password is blank", "Account icon not disabled when super password is blank");
    await updateValue($.superpw, "qwerty");
    await triggerEvent("mouseover", $.superpw3bluedots);
    await triggerEvent("click", $.superpwmenuaccount);
    test = $.changesuperpw.style.display === "block";
    testMsg(test, "Account icon enabled after keyup event", "Account icon not enabled after keyup event");
    await triggerEvent("click", $.changesuperpwcancelbutton);
    // Enter the new super password 
    await updateValue($.superpw, "asdfgh");
    await triggerEvent("mouseover", $.superpw3bluedots);
    await triggerEvent("click", $.superpwmenuaccount);
    test = $.changesuperpw.style.display === "block";
    testMsg(test, "Change super password opens when clicking account icon", "Change super password does not open when clicking account icon");
    // Close the change super password warning with the cancel button
    await triggerEvent("click", $.changesuperpwcancelbutton);
    test = $.changesuperpw.style.display === "none";
    testMsg(test, "Change super password warning closed with cancel button", "Change super password warning not closed with cancel button");
    // Enter the wrong old superpw 
    await updateValue($.superpw, "asdfgh");
    await triggerEvent("mouseleave", $.superpw);
    test = $.changesuperpw.style.display === "block";
    testMsg(test, "Change super password shows when old super password is wrong", "Change super password does not show when old super password is wrong");
    test = $.superpw.disabled === true;
    testMsg(test, "Super password input disabled when old super password is wrong", "Super password input not disabled when old super password is wrong");
    // Change all account passwords after changing the super password
    resetState();
    let sitepws = await changeSuperpwSetup("qwerty");
    await updateValue($.superpw, "asdfgh");
    await triggerEvent("blur", $.superpw);
    await triggerEvent("click", $.changesuperpwlosebutton);
    test = !await checkSitepws(sitepws);
    testMsg(test, "Change all account passwords after changing the super password", "Change all account passwords after changing the super password failed");
    // Keep all account passwords when changing the super password
    await resetState();
    sitepws = await changeSuperpwSetup("asdfgh");
    await updateValue($.superpw, "qwerty");
    await triggerEvent("mouseleave", $.mainpanel);
    await updateValue($.changesuperpwkeepoldinput, "ghjkl");
    await triggerEvent("blur", $.changesuperpwkeepoldinput);
    test = !$.changesuperpwkeepoldtypo.classList.contains("nodisplay");
    testMsg(test, "Change super password keep old input typo shows", "Change super password keep old input typo does not show");
    await updateValue($.changesuperpwkeepoldinput, "a");
    await triggerEvent("keyup", $.changesuperpwkeepoldinput);
    test = $.changesuperpwkeepoldtypo.classList.contains("nodisplay");
    testMsg(test, "Change super password keep old input typo hidden", "Change super password keep old input typo not hidden");
    await updateValue($.changesuperpwkeepoldinput, "asdfgh");
    await triggerEvent("blur", $.changesuperpwkeepoldinput);
    test = $.changesuperpwkeepoldtypo.classList.contains("nodisplay");
    testMsg(test, "Change super password keep old input typo shows after correct input", "Change super password keep old input typo does not show after correct input");
    await triggerEvent("click", $.changesuperpwkeepbutton);
    test = await checkSitepws(sitepws);
    testMsg(test, "Keep all account passwords when changing the super password", "Keep all account passwords when changing the super password failed");
}
// Test save as default
async function testSaveAsDefault() {
    if (loggingDefault) console.log("testSaveAsDefault");
    await resetState();
    await triggerEvent("mouseleave", $.mainpanel);
    await triggerEvent("click", $.settingsshow);
    if (loggingDefault) console.log("testSaveAsDefault state reset");
    await updateValue($.pwlength, 15);
    await triggerEvent("blur", $.pwlength);
    if (loggingDefault) console.log("testSaveAsDefault blur pwlength");
    await triggerEvent("click", $.allowspecialcheckbox);
    if (loggingDefault) console.log("testSaveAsDefault click allowspecialcheckbox");
    await updateValue($.specials, "%^&");
    if (loggingDefault) console.log("testSaveAsDefault blur |" + $.pwlength.value + "|" + $.specials.value + "|" + $.allowspecialcheckbox.checked + "|");
    await triggerEvent("blur", $.specials);
    if (loggingDefault) console.log("testSaveAsDefault click |" + $.pwlength.value + "|" + $.specials.value + "|" + $.allowspecialcheckbox.checked + "|");
    await triggerEvent("click", $.makedefaultbutton);
    localStorage.restart = "testSaveAsDefault2";
    alert("Inspect the extension again to see the results of testSaveAsDefault.");
}
async function testSaveAsDefault2() {
    if (loggingDefault) console.log("testSaveAsDefault2 |" + $.pwlength.value + "|" + $.specials.value + "|" + $.allowspecialcheckbox.checked + "|");
    await triggerEvent("click", $.settingsshow);
    localStorage.restart = "";
    let tests = $.pwlength.value === "15";
    tests = tests && $.allowspecialcheckbox.checked;
    tests = tests && $.specials.value === "%^&";
    testMsg(tests, "Save as default", "Save as default |" + $.pwlength.value + "|" + $.specials.value + "|" + $.allowspecialcheckbox.checked + "|");
}
// Utility functions

// I want to start with a clean slate for each set of tests.
async function resetState() {
    if (loggingReset) console.log("resetState send reset message");
    let response = await chrome.runtime.sendMessage({"cmd": "reset"}, );
    if (chrome.runtime.lastError) console.error("resetState reset message error", chrome.runtime.lastError);
    // Only works when only folders have the title "SitePasswordDataTest"
    const toDelete = await chrome.bookmarks.search({"title": "SitePasswordDataTest"});
    for (const bookmark of toDelete) {
        await chrome.bookmarks.removeTree(bookmark.id);
    }
    if (loggingReset) console.log("resetState reset message response", response);
    restoreForTesting();
    await getsettings("");
    await clearForm();
    if (loggingClear) console.log("resetState done", $.pwlength.value);
}
async function clearForm() {
    if (loggingClear) console.log("clearForm", baseDefaultSettings.pwlength);
    await updateValue($.domainname, "");
    await updateValue($.superpw, "");
    await updateValue($.sitename, "");
    await updateValue($.username, "");
    await updateValue($.sitepw, "");
    $.providesitepw.checked = baseDefaultSettings.providesitepw;
    $.clearsuperpw.checked = baseDefaultSettings.clearsuperpw;
    $.hidesitepw.checked = baseDefaultSettings.hidesitepw;
    await updateValue($.pwlength, baseDefaultSettings.pwlength);
    $.startwithletter.checked = baseDefaultSettings.startwithletter;
    $.allowlowercheckbox.checked = baseDefaultSettings.allowlower;
    $.allowuppercheckbox.checked = baseDefaultSettings.allowupper;
    $.allownumbercheckbox.checked = baseDefaultSettings.allownumber;
    $.allowspecialcheckbox.checked = baseDefaultSettings.allowspecial;
    await updateValue($.minlower, baseDefaultSettings.minlower);
    await updateValue($.minupper, baseDefaultSettings.minupper);
    await updateValue($.minnumber, baseDefaultSettings.minnumber);
    await updateValue($.minspecial, baseDefaultSettings.minspecial);
    await updateValue($.specials, baseDefaultSettings.specials);
    $.settingsmenu.style.display = "none";
    if (loggingClear) console.log("clearForm done", $.pwlength.value);
}
async function fillForm(superpw, domainname, sitename, username) {
    // Simulate user filling the form
    if (loggingFill) console.log("fillForm", superpw, domainname, sitename, username);
    await clearForm();
    await updateValue($.domainname, domainname);
    if (superpw) {
        await updateValue($.superpw, superpw);
        await triggerEvent("keyup", $.superpw);
        if (loggingFill) console.log("fillForm superpw");
    }
    await triggerEvent("blur", $.superpw);
    await updateValue($.sitename, sitename);
    await triggerEvent("keyup", $.sitename);
    if (loggingFill) console.log("fillForm sitename");
    await triggerEvent("blur", $.sitename);
    await updateValue($.username, username);
    await triggerEvent("keyup", $.username);
    if (loggingFill) console.log("fillForm username");
    await triggerEvent("blur", $.username);
    if (loggingFill) console.log("fillForm", $.domainname.value, $.superpw.value, $.sitename.value, $.username.value);
}
async function phishingSetup() {
    if (loggingPhishing) console.log("phishingSetup");
    await resetState();
    if (loggingPhishing) console.log("phishingSetup state reset");
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
    if (loggingPhishing) console.log("phishingSetup mouseleave", $.domainname.value, $.sitename.value, $.username.value);
    await triggerEvent("mouseleave", $.mainpanel);
    restoreForTesting();
    if (loggingPhishing) console.log("phishingSetup allantheguru click", $.domainname.value, $.sitename.value, $.username.value);
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "guru", "");
}
async function triggerEvent(event, element) {
    if (!element["on" + event]) alert("Element " + element.id + " does not have an event handler for " + event + ".");
    if (event === "click") element.checked = !element.checked;
    if (loggingTrigger) console.log("triggerEvent", element.id, event, resolverName, promise);
    let e = new Event(event);
    let promise = new Promise((resolve, reject) => e.resolver = resolve);
    element.dispatchEvent(e);
    await promise;
    if (loggingTrigger) console.log("triggerEvent promise resolved", element.id, event, promise, resolvers);
}
async function providepwSetup(superpw, providedpw, domainname, sitename, username) {
    $.pwlength.value = 12;
    await triggerEvent("blur", $.pwlength);
    if ($.providesitepw.checked) await triggerEvent("click", $.providesitepw);
    await fillForm(superpw, domainname, sitename, username);
    let unprovided = $.sitepw.value; // For later tests to make sure it changes when I go back to computed password
    await triggerEvent("click", $.settingsshow);
    await triggerEvent("click", $.providesitepw);
    await updateValue($.sitepw, providedpw);
    await triggerEvent("blur", $.sitepw);
    await triggerEvent("click", $.settingssave);
    await triggerEvent("mouseleave", $.mainpanel);
    return unprovided;
}
// Utility functions for testing changeing super password
async function changeSuperpwSetup(superpw) {
    await fillForm(superpw, "notprovided.example.com", "Guru", "Alan");
    await triggerEvent("mouseleave", $.mainpanel);
    let notprovided = $.sitepw.value;
    let unprovided1 = await providepwSetup(superpw, "provided1", "provided1.example.com", "Provided1", "Alan");
    let unprovided2 = await providepwSetup(superpw, "provided2", "provided2.example.com", "Provided2", "Alan");
    let unprovided3 = await providepwSetup(superpw, "provided3", "provided3.example.com", "Provided3", "Alan");
    return {"unprovideds": [notprovided, unprovided1, unprovided2, unprovided3],
            "provideds": [notprovided, "provided1", "provided2", "provided3"]
    };
}
async function checkSitepws(sitepws) {
    await clearForm();
    $.domainname.value = "notprovided.example.com";
    await triggerEvent("blur", $.domainname);
    let test = $.sitepw.value === sitepws.unprovideds[0];
    await clearForm();
    $.domainname.value = "provided1.example.com";
    await triggerEvent("blur", $.domainname);
    test = test && $.sitepw.value === sitepws.provideds[1];
    await clearForm();
    $.domainname.value = "provided2.example.com";
    await triggerEvent("blur", $.domainname);
    test = test && $.sitepw.value === sitepws.provideds[2];
    await clearForm();
    $.domainname.value = "provided3.example.com";
    await triggerEvent("blur", $.domainname);
    test = test && $.sitepw.value === sitepws.provideds[3];
    return test;
}
// Just setting the value of a DOM element doeesn't take effed immediately
async function updateValue(element, value, eventName = "focus") {
    const e = new Event(eventName);
    const promise = new Promise((resolve) => {
        e.resolver = resolve;
    });
    element.dispatchEvent(e);
    element.value = value;
    await promise;
}
function testMsg(test, passMsg, failMsg = passMsg, ...details) {
    if (test) {
        console.log("Passed:", passMsg);
        passed++;
    } else {
        console.warn("Failed:", failMsg, ...details);
        failed++;
    }
}