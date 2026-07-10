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
        // await testRememberSuperpw();
        // await testChangePassword();
        // await testRememberForm();
        // await testProvidedpw();
        // await testPhishing();
        // await testSharedCredentials();
        // await testForget();
        // await testClearSuperpw();
        // await testHideSitepw();
        // await testLegacyBkmks();
        // await testDuplicateBkmks();
        // await testSafeSuffixes();
        // await testChangeAccount();
        await testChangeSuperpw();
        console.log("Tests complete: " + passed + " passed, " + failed + " failed, ");
        alert("Tests restart complete: " + passed + " passed, " + failed + " failed, ");
        // await testSaveAsDefault();
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
    // There's a test on the web page for clicking the cancelwarning button that
    // makes no sense for the extension because the extension loads the home page.
    // Does setting new site name work?
    await phishingSetup();
    if (loggingPhishing) console.log("testPhishing phishingSetup done");
    $.nicknamebutton.click();
    test = $.phishing.style.display === "none" && $.sitename.value === normalize("Guru") 
        && document.activeElement === $.sitename;
    testMsg(test, "Phishing new site name", "Phishing new site name");
    // Does same account option work?
    await phishingSetup();
    await triggerEvent("click", $.sameacctbutton);
    restoreForTesting();
    await triggerEvent("mouseleave", $.mainpanel);
    if (loggingPhishing) console.log("testPhishing same account", $.phishing.style.display, $.sitename.value, $.username.value);
    test = $.phishing.style.display === "none";
    test = test && $.sitename.value === normalize("Guru");
    test = test && $.username.value === "Alan";
    testMsg(test, "Phishing same account", "Phishing same account");
    await clearForm();
    await fillForm("", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = $.sitename.value === normalize("Guru") && $.username.value === "Alan";
    testMsg(test, "Phishing remembered same account", "Phishing remembered same account");
}
// Test shared credentials
async function testSharedCredentials() {
    await resetState();
    await fillForm("qwerty", "disney.com", "Disney", "Alan");
    await triggerEvent("mouseleave", $.mainpanel);  // $.mainpanel.onmouseleave(); saves the settings
    let expected = $.sitepw.value;
    restoreForTesting();
    await fillForm("qwerty", "hulu.com", "Disney", "");
    await triggerEvent("blur", $.sitename);
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
    await forgetDomainname();
    // See if it forgot
    await clearForm();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    let test = $.sitename.value === "" && $.username.value === "";
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
    await triggerEvent("click", $.forgetbutton);
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
    await triggerEvent("click", $.forgetbutton);
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
// Test reassign account
async function testChangeAccount() {
    await resetState();
    await phishingSetup();
    await triggerEvent("click", $.sameacctbutton);
    restoreForTesting();
    $.sitepw3bluedots.style.display = "none"; // Can't use mouseout because call gets a null event
    await triggerEvent("mouseleave", $.mainpanel);
    $.sitepw3bluedots.onmouseover();
    $.sitepwmenuaccount.onclick();
    let test = $.account.style.display === "block";
    let elements = document.getElementsByName("hassuffix");
    for (let element of elements) {
        test = test && !element.classList.contains("nodisplay");
    }
    testMsg(test, "Change account popup open", "Change account popup not open");
    restoreForTesting();
    $.sitepwmenu.style.display = "none";
    await updateValue($.accountnicknameinput, "newGuru");
    $.accountnicknamecancelbutton.onclick();
    test = $.account.style.display === "none";
    test = test && normalize($.sitename.value) === "guru";
    testMsg(test, "Change account cancel", "Change account cancel");
    restoreForTesting();
    $.sitepwmenu.style.display = "none";
    $.sitepw3bluedots.onmouseover();
    $.sitepwmenuaccount.onclick();
    await updateValue($.accountnicknameinput, "newGuru");
    await triggerEvent("click", $.accountnicknamesavebutton);
    test = $.account.style.display === "none";
    test = test && normalize($.sitename.value) === normalize("newGuru");
    await triggerEvent("mouseleave", $.mainpanel);
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = test && normalize($.sitename.value) === normalize("newGuru");
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = test && normalize($.sitename.value) === normalize("newGuru");
    testMsg(test, "Change account save", "Change account save");
    restoreForTesting();
    $.sitepwmenu.style.display = "none";
    $.sitepw3bluedots.onmouseover();
    $.sitepwmenuaccount.onclick();
    await updateValue($.accountnicknameinput, "Guru");
    await triggerEvent("click", $.accountnicknamenewbutton);
    test = $.account.style.display === "none";
    await triggerEvent("mouseleave", $.mainpanel);
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = test && normalize($.sitename.value) === normalize("Guru");
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    test = test && normalize($.sitename.value) === normalize("guru");
    testMsg(test, "Change account new", "Change account new");
}
// Test changing super password.  Make sure it doesn't change provided passwords.
async function testChangeSuperpw() {
    await resetState();
    // Test no warning when superpw = ""
    await triggerEvent("blur", $.superpw);
    let test = $.superpwtypo.style.display === "none";
    testMsg(test, "No super password typo warning when superpw is empty");
    // Test no warning
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
    await triggerEvent("mouseleave", $.mainpanel);
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $.domainname);
    await triggerEvent("keyup", $.superpw); // Don't do anything on keyup
    await triggerEvent("blur", $.superpw);
    test = $.superpwtypo.style.display === "none";
    testMsg(test, "No super password typo warning", "No super password typo warning", "qwerty", "|" + $.superpw.value + "|");
    // Test showing the warning
    await updateValue($.superpw, "asdfgh");
    await triggerEvent("mouseleave", $.superpw);
    test = $.superpwtypo.style.display === "block";
    testMsg(test, "Show change super password typo warning", "Show change super password typo warning", "asdfgh", "|" + $.superpw.value + "|");
    // Test close warning button
    await triggerEvent("click", $.superpwtypobutton);
    test = $.superpwtypo.style.display === "none" && $.superpw.value === "asdfgh";
    testMsg(test, "Close super password typo warning", "Close super password typo warning");
    // Test change super password lose button with no superpw
    await resetState();
    let sitepws = await changeSuperpwSetup("qwerty");
    await updateValue($.superpw, "");
    // Make sure the change all passwords buttons is disabled.
    await triggerEvent("mouseover", $.superpw3bluedots);
    await triggerEvent("click", $.superpwmenuaccount);
    // Is the warning for entering the old super password showing?
    test = $.changesuperpwoptions.style.display === "block";
    // Does Cancel work
    await triggerEvent("click", $.changesuperpwoptioncancelbutton);
    test = test && $.changesuperpw.style.display === "none";
    // Does the Keep button open the right message?
    await triggerEvent("mouseover", $.superpw3bluedots);
    await triggerEvent("click", $.superpwmenuaccount);
    await triggerEvent("click", $.changesuperpwoptionkeepbutton);
    test = test && $.changesuperpwkeep.style.display === "block";
    // Enter the wrong old superpw
    $.changesuperpwkeepoldinput.value = "wrongpassword";
    test = test && $.changesuperpwkeepoldtypo.style.display === "block";

    await updateValue($.changesuperpwloseinput, "asdfgh");
    await triggerEvent("mouseleave", $.changesuperpwloseinput);
    test = test && $.newsuperpwmsg.style.display === "block";
    // Test if message goes away on typing in the input field
    await updateValue($.changesuperpwloseinput, "q");
    await triggerEvent("keyup", $.changesuperpwloseinput);
    test = test && $.newsuperpwmsg.style.display === "none";
    // Test if the button is enabled
    test = test && $.changesuperpwlosebutton.disabled === false;
    await updateValue($.changesuperpwloseinput, "qwerty");
    await triggerEvent("mouseleave", $.changesuperpwloseinput);
    test = test && $.changesuperpwlosechangebutton.disabled === false;
    test = test && !await checkSitepws(sitepws);
    testMsg(test, "Change super password button opens message and changes account passwords", "Change super password button opens message and changes account passwords");
    // Test change super password button with superpw
    await updateValue($.superpw, "asdfgh");
    await triggerEvent("mouseover", $.superpw3bluedots);
    await triggerEvent("click", $.superpwmenuaccount);
    test = $.changesuperpwlosechangebutton.disabled === false;
    test = test && $.changesuperpwloseinput.value === "asdfgh";
    testMsg(test, "Change super password button with superpw", "Change super password button with superpw");
    // Change superpw without providing old superpw
    // await resetState();
    // sitepws = await changeSuperpwSetup("asdfgh");
    // await triggerEvent("mouseover", $.superpw3bluedots);
    // await triggerEvent("click", $.superpwmenuaccount);
    // await updateValue($.changesuperpwnewloseinput, "qwerty");
    // await triggerEvent("blur", $.changesuperpwnewloseinput);
    // test = !await checkSitepws(sitepws);
    // if (test) {
    //     console.log("Show change super password, account passwords changed");
    //     passed++;
    // } else {
    //     console.warn("Show change super password, account passwords not changed");
    //     failed++;
    // }
    // Change superpw providing old superpw with typo
    await resetState();
    restoreForTesting();
    sitepws = await changeSuperpwSetup("asdfgh");
    await triggerEvent("mouseover", $.superpw3bluedots);
    await triggerEvent("click", $.superpwmenuaccount);
    await updateValue($.changesuperpwloseinput, "qwertyTypo");
    await triggerEvent("blur", $.changesuperpwloseinput);
    test = $.changesuperpwlosetypo.classList.contains("nodisplay") === false; // Check if the typo warning is shown
    testMsg(test, "Show typo warning for old super password", "Show typo warning for old super password");
    // Make sure the typo warning goes away when you start typing a new value
    $.changesuperpwloseinput.value = "a";
    await triggerEvent("keyup", $.changesuperpwloseinput);
    test = $.changesuperpwlosetypo.classList.contains("nodisplay") === true; // Check if the typo warning is hidden
    testMsg(test, "Typo warning goes away when typing a new value", "Typo warning goes away when typing a new value");
    // Finish providing old super password
    await resetState();
    let passwords = await changeSuperpwSetup("qwerty");
    await triggerEvent("mouseover", $.superpw3bluedots);
    await triggerEvent("click", $.superpwmenuaccount);
    $.changesuperpwkeepoldinput.value = "qwerty";
    $.changesuperpwkeepnewinput.value = "asdfgh";
    await triggerEvent("click", $.changesuperpwkeepbutton);
    test = await checkSitepws(passwords.provideds);
    testMsg(test, "Change super password with old super password", "Change super password with old super password");
    // Test going back to old super password
    await triggerEvent("mouseover", $.superpw3bluedots);
    await triggerEvent("click", $.superpwmenuaccount);
    $.changesuperpwkeepoldinput.value = "asdfgh";
    $.changesuperpwkeepnewinput.value = "qwerty";
    await triggerEvent("click", $.changesuperpwkeepbutton);
    test = await checkSitepws(passwords.provideds);
    testMsg(test, "Change back to old super password", "Change back to old super password");
    async function changeSuperpwSetup(newSuperpw) {
        await fillForm(newSuperpw, "notprovided.example.com", "Guru", "Alan");
        await triggerEvent("mouseleave", $.mainpanel);
        let notprovided = $.sitepw.value;
        let unprovided1 = await providepwSetup(newSuperpw, "provided1", "provided1.example.com", "Provided1", "Alan");
        let unprovided2 = await providepwSetup(newSuperpw, "provided2", "provided2.example.com", "Provided2", "Alan");
        let unprovided3 = await providepwSetup(newSuperpw, "provided3", "provided3.example.com", "Provided3", "Alan");
        return {"unprovideds": [notprovided, unprovided1, unprovided2, unprovided3],
                "provideds": [notprovided, "provided1", "provided2", "provided3"]
        };
    }
    async function checkSitepws(sitepws) {
        await clearForm();
        $.domainname.value = "notprovided.example.com";
        await triggerEvent("blur", $.domainname);
        let test = $.sitepw.value === sitepws[0];
        await clearForm();
        $.domainname.value = "provided1.example.com";
        await triggerEvent("blur", $.domainname);
        test = test && $.sitepw.value === sitepws[1];
        await clearForm();
        $.domainname.value = "provided2.example.com";
        await triggerEvent("blur", $.domainname);
        test = test && $.sitepw.value === sitepws[2];
        await clearForm();
        $.domainname.value = "provided3.example.com";
        await triggerEvent("blur", $.domainname);
        test = test && $.sitepw.value === sitepws[3];
        return test;
    }
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
    $.superpw.onblur();
    await updateValue($.sitename, sitename);
    await triggerEvent("keyup", $.sitename);
    if (loggingFill) console.log("fillForm sitename");
    $.sitename.onblur();
    await updateValue($.username, username);
    await triggerEvent("keyup", $.username);
    if (loggingFill) console.log("fillForm username");
    $.username.onblur();
    if (loggingFill) console.log("fillForm", $.domainname.value, $.superpw.value, $.sitename.value, $.username.value);
}

async function forgetDomainname() {
    if (loggingForget) console.log("forgetDomainname");
    $.domainname3bluedots.onmouseover();
    $.domainnamemenuforget.click();
    await triggerEvent("click", $.forgetbutton);
    if (loggingForget) console.log("forgetDomainname done");
}

async function forgetSitename() {
    if (loggingForget) console.log("forgetSitename");
    $.sitename3bluedots.onmouseover();
    $.sitenamemenuforget.click();
    await triggerEvent("click", $.forgetbutton);
    if (loggingForget) console.log("forgetSitename done");
}

async function forgetUsername() {
    if (loggingForget) console.log("forgetUsername");
    $.username3bluedots.onmouseover();
    $.usernamemenuforget.click();
    if (loggingForget) console.log("forgetUsername click forgetbutton forgetclickResolver");
    await triggerEvent("click", $.forgetbutton);
    if (loggingForget) console.log("forgetUsername forgetclickResolver done");
}
async function phishingSetup() {
    if (loggingPhishing) console.log("phishingSetup");
    await resetState();
    if (loggingPhishing) console.log("phishingSetup state reset");
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "Alan");
    if (loggingPhishing) console.log("phishingSetup mouseleave", $.domainname.value, $.sitename.value, $.username.value);
    await triggerEvent("mouseleave", $.mainpanel);
    restoreForTesting();
    // if (loggingPhishing) console.log("phishingSetup domainname blur", $.sitename.value, $.username.value);
    // await triggerEvent("blur", $.domainname);
    if (loggingPhishing) console.log("phishingSetup allantheguru click", $.domainname.value, $.sitename.value, $.username.value);
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "guru", "");
    if (loggingPhishing) console.log("phishingSetup sitename blur", $.sitename.value, $.username.value);
    await triggerEvent("blur", $.sitename);
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
        console.log("", passMsg);
        passed++;
    } else {
        console.warn("", failMsg, ...details);
        failed++;
    }
}