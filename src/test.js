// To run the tests, set testMode to true in bg.js and reload 
// the extension.  Then open any https page, e.g., https://alanhkarp.com. 
// Right click on the SitePassword icon and select "Inspect".  You will 
// see an alert "Starting tests".  Click OK and check the console for results.
import { baseDefaultSettings, getRootFolder, isSafari } from "./bg.js";
import { normalize } from "./generate.js";
import { getsettings, restoreForTesting } from "./ssp.js";

export let resolvers = {};

let logging = false;
let loggingCalculation = false;
let loggingClear = false;
let loggingClearsuperpw = false;
let loggingDefault = false;
let loggingFill = false;
let loggingForget = false;
let loggingPhishing = false;
let loggingProvide = false;
let loggingReset = false;
let loggingTrigger = false;
let loggingWrapHandler = false;
if (logging) {
    loggingCalculation = loggingClear = loggingDefault = loggingFill = 
                         loggingForget = loggingPhishing = loggingProvide = 
                         loggingReset = loggingTrigger = loggingWrapHandler = true;
}
 
export async function runTests() {
    // #region Fields needed for tests
    const $mainpanel = get("mainpanel");
    const $settingsshow = get("settingsshow");
    const $settingssave = get("settingssave");
    const $domainname = get("domainname");
    const $sitename = get("sitename");
    const $username = get("username");
    const $superpw = get("superpw");
    const $sitepw = get("sitepw");
    const $providesitepw = get("providesitepw");
    const $clearsuperpw = get("clearsuperpw");
    const $hidesitepw = get("hidesitepw");
    const $pwlength = get("pwlength");
    const $allowlowercheckbox = get("allowlowercheckbox");
    const $allowuppercheckbox = get("allowuppercheckbox");
    const $allownumbercheckbox = get("allownumbercheckbox");
    const $allowspecialcheckbox = get("allowspecialcheckbox");
    const $minlower = get("minlower");
    const $minupper = get("minupper");
    const $minnumber = get("minnumber");
    const $minspecial = get("minspecial");
    const $startwithletter = get("startwithletter");
    const $specials = get("specials");
    const $makedefaultbutton = get("makedefaultbutton");
    const $warningbutton = get("warningbutton");
    const $forgetbutton = get("forgetbutton");
    const $domainname3bluedots = get("domainname3bluedots");
    const $domainnamemenuforget = get("domainnamemenuforget");
    const $nicknamebutton = get("nicknamebutton");
    const $phishing = get("phishing");
    const $settings = get("settings");
    const $sitename3bluedots = get("sitename3bluedots");
    const $sitenamemenuforget = get("sitenamemenuforget");
    const $username3bluedots = get("username3bluedots");
    const $usernamemenuforget = get("usernamemenuforget");
    const $forget = get("forget");
    // #endregion
    let passed = 0;
    let failed = 0;
    let restart = localStorage.restart;
    if (restart) {
        alert("Restarting test");
        console.log("Restarting test " + restart);
    } else {
        alert("Starting tests. Set testMode in bg.js to false to stop tests.");
    }
    if (!restart) {
        await testCalculation(); 
        await testRememberForm();
        await testProvidedpw();
        await testPhishing();
        await testForget();
        await testClearSuperpw();
        await testHideSitepw();
        await testLegacyBkmks();
        await testDuplicateBkmks();
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
    // Test password calculation
    async function testCalculation() {
        await resetState();
        if (loggingCalculation) console.log("testCalculation state reset", $pwlength.value);
        const expected = "c3EEm4qRFSfk";
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        if (loggingCalculation) console.log("testCalculation form filled", $sitename.value, $username.value);
        let actual = $sitepw.value;
        if (actual === expected) {
            console.log("Passed: Calculation");
            passed += 1;
        } else {
            let inputs = {"expected": expected, "actual": actual, "superpw": $superpw.value, "sitename": $sitename.value, "username": $username.value};
            console.warn("Failed: Calculation", inputs);
            failed += 1;
        }
    }
    async function testRememberForm() {
        await resetState();
        if (logging) console.log("testRememberForm state reset");
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");  // $mainpanel.onmouseleave(); saves the settings
        if (logging) console.log("testRememberForm filled form", $sitename.value, $username.value);
        // See if it remembers
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        if (logging) console.log("testRememberForm filled form", $sitename.value, $username.value);
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        let tests = $sitename.value === "Guru";
        tests = tests && $username.value === "alan";
        if (tests) {
            console.log("Passed: Remember form");
            passed += 1;
        } else {
            console.warn("Failed: Remember form", "Guru", "alan", "|" + $sitename.value + "|");
            failed += 1;
        }
    }
    async function testProvidedpw() {
        loggingProvide = false;
        const expected = "MyStrongPassword";
        await resetState();
        if (loggingProvide) console.log("testProvidedpw state reset");
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        get("settings").style.display = "block";
        if (loggingProvide) console.log("testProvidedpw providepw before", $providesitepw.disabled, $providesitepw.checked);
        await triggerEvent("click", $providesitepw, "providesitepwResolver");
        if (loggingProvide) console.log("testProvidedpw clicked", $providesitepw.disabled, $providesitepw.checked);
        $sitepw.value = expected;
        await triggerEvent("blur", $sitepw, "sitepwblurResolver");
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        if (loggingProvide) console.log("testProvidedpw saved", $sitepw.value);
        // See if it remembers
        clearForm();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        if (loggingProvide) console.log("testProvidedpw domainname blur", $sitepw.value, $providesitepw.checked);
        let test = $sitepw.value === expected
        if (test) {
            console.log("Passed: Provide pw");
            passed += 1;
        } else {
            console.warn("Failed: Provide pw", expected, "|" + $sitepw.value + "|");
            failed += 1;
        }
    }
    // Test phishing
    async function testPhishing() {
        await phishingSetup();
        // Does warning appear?
        let test = $phishing.style.display === "block";
        if (test) {
            console.log("Passed: Phishing warning is showing.");
            passed += 1;
        } else {
            console.warn("Failed: Phishing warning not showing.");
            failed += 1;
        }
        // There's a test on the web page for clicking the cancelwarning button that
        // makes no sense for the extension because the extension loads the home page.
        // Does setting new site name work?
        await phishingSetup();
        if (loggingPhishing) console.log("testPhishing phishingSetup done");
        $nicknamebutton.click();
        test = $phishing.style.display === "none" && $sitename.value === normalize("Guru") 
            && document.activeElement === $sitename;
        if (test) {
            console.log("Passed: Phishing new site name");
            passed += 1;
        } else {
            console.warn("Failed: Phishing new site name");
            failed += 1;
        }
        // Does same account option work?
        await phishingSetup();
        await triggerEvent("click", $warningbutton, "warningbuttonResolver");
        restoreForTesting();
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        if (loggingPhishing) console.log("testPhishing same account", $phishing.style.display, $sitename.value, $username.value);
        test = $phishing.style.display === "none";
        test = test && $sitename.value === normalize("Guru");
        test = test && $username.value === "alan";
        if (test) {
            console.log("Passed: Phishing same account");
            passed += 1;
        } else {
            console.warn("Failed: Phishing same account");
            failed += 1;
        }
        clearForm();
        await fillForm("", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        test = $sitename.value === normalize("Guru") && $username.value === "alan";
            if (test) {
            console.log("Passed: Phishing remembered same account");
            passed += 1;
        } else {    
            console.warn("Failed: Phishing remembered same account");
            failed += 1;
        }
    }
    // Test forget
    async function testForget() {
        if (loggingForget) console.log("testForget");
        await resetState();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        await forgetDomainname();
        // See if it forgot
        clearForm();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        let test = $sitename.value === "" && $username.value === "";
        if (test) {
            console.log("Passed: Forget by domain name");
            passed += 1;
        } else {
            console.warn("Failed: Forget by domain name");
            failed += 1;
        }
        // See if database still has site name if it should
        await phishingSetup();
        await triggerEvent("click", $warningbutton, "warningbuttonResolver"); // Now I have two domain names pointing to the same site name
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        await forgetDomainname();
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        test = $sitename.value === "" && $username.value === "";
        if (test) {
            console.log("Passed: Forget site name when it should");
            passed += 1;
        } else {
            console.warn("Failed: Did not forget site name when it should");
            failed += 1;
        }
        // See if forget by site name works
        await phishingSetup();
        await triggerEvent("click", $warningbutton, "warningbuttonResolver"); // Now I have two domain names pointing to the same site name
        await forgetSitename();
        await triggerEvent("click", $forgetbutton, "forgetclickResolver");
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        test = $sitename.value === "" && $username.value === "";
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        test = test && $sitename.value === "" && $username.value === "";
        if (test) {
            console.log("Passed: Forget by site name");
            passed += 1;
        } else {
            console.warn("Failed: Forget by site name");
            failed += 1;
        }
        // See if forget by username works
        await phishingSetup();
        await triggerEvent("click", $warningbutton, "warningbuttonResolver"); // Now I have two domain names pointing to the same site name
        if (loggingForget) console.log("testForget forget by username");
        await forgetUsername();
        await triggerEvent("click", $forgetbutton, "forgetclickResolver");
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        if (loggingForget) console.log("testForget forgot by username", $sitename.value, $username.value);
        test = $sitename.value === "" && $username.value === "";
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        test = test && $sitename.value === "" && $username.value === "";
        if (test) {
            console.log("Passed: Forget by username");
            passed += 1;
        } else {
            console.warn("Failed: Forget by username");
            failed += 1;
        }
        // See if forget works even if you don't leave the popup
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        await forgetDomainname();
        test = $forget.style.display === "none";
        if (test) {
            console.log("Passed: Forget without leaving popup no warning");
            passed += 1;
        } else {
            console.warn("Failed: Forget without leaving popup warning");
            failed += 1;
        }
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "");
        test = $username.value === "";
        if (test) {
            console.log("Passed: Forget without leaving popup no username");
            passed += 1;
        } else {
            console.warn("Failed: Forget without leaving popup username");
            failed += 1;
        }
    }
    // Test clear superpw
    async function testClearSuperpw() {
        const expected = "c3EEm4qRFSfk";
        await resetState();
        await triggerEvent("click", $settingsshow, "settingsshowResolver");
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        await triggerEvent("click", $clearsuperpw, "clearsuperpwResolver");
        restoreForTesting();
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        let response = await chrome.runtime.sendMessage({"cmd": "getPassword"});
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        if (loggingClearsuperpw || logging) console.log("testClearSuperpw getPassword", response, foo);
        let test = $superpw.value === "" && response === expected;
        if (test) {
            console.log("Passed: Clear superpw");
            passed += 1;
        } else {
            console.warn("Failed: Clear superpw");
            failed += 1;
        }
    }
    // Test hide sitepw
    async function testHideSitepw() {
        await resetState();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        await triggerEvent("click", $hidesitepw, "hidesitepwResolver");
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        await triggerEvent("blur", $domainname, "domainnameblurResolver");
        let test = $sitepw.type === "password";
        if (test) {
            console.log("Passed: Hide sitepw");
            passed += 1;
        } else {
            console.warn("Failed: Hide sitepw");
            failed += 1;
        }
    }
    // Test updating legacy bookmarks
    async function testLegacyBkmks() {
        // Create a legacy bookmark
        let title = "legacy.bkmk.com";
        let url = "https://sitepassword.info/?bkmk=ssp://{%22sitename%22:%22usps%22,%22username%22:%22fred%22,%22providesitepw%22:false,%22xor%22:[0,0,0,0,0,0,0,0,0,0,0,0],%22pwlength%22:12,%22domainname%22:%22reg.usps.com%22,%22pwdomainname%22:%22reg.usps.com%22,%22startwithletter%22:true,%22allowlower%22:true,%22allowupper%22:true,%22allownumber%22:true,%22allowspecial%22:false,%22minlower%22:1,%22minupper%22:1,%22minnumber%22:1,%22minspecial%22:1,%22specials%22:%22$/!=@?._-%22,%22characters%22:%220123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%22}";
        await resetState();
        let rootFolder = await getRootFolder();
        await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": url });
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        let children = await chrome.bookmarks.getChildren(rootFolder[0].id);
        let test = children[0].url.indexOf("{") === -1;
        if (test) {
            console.log("Passed: Legacy bookmark updated");
            passed += 1;
        } else {
            console.warn("Failed: Legacy bookmark not updated");
            failed += 1;
        }
    }
    // Test proper handling of duplicate bookmarks
// For testing duplicate bookmarks
    async function testDuplicateBkmks() {
        let title = "duplicate.bkmk.com";
        let url = "https://sitepassword.info/?bkmk=ssp://%7B%22sitename%22%3A%22usps%22%2C%22username%22%3A%22fred%22%2C%22providesitepw%22%3Afalse%2C%22xor%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%2C%22domainname%22%3A%22reg.usps.com%22%2C%22pwdomainname%22%3A%22reg.usps.com%22%2C%22pwlength%22%3A%2212%22%2C%22startwithletter%22%3Atrue%2C%22allowlower%22%3Atrue%2C%22allowupper%22%3Atrue%2C%22allownumber%22%3Atrue%2C%22allowspecial%22%3Afalse%2C%22minlower%22%3A%221%22%2C%22minupper%22%3A%221%22%2C%22minnumber%22%3A%221%22%2C%22minspecial%22%3A%221%22%2C%22specials%22%3A%22%24%2F!%3D%40%3F._-%22%2C%22characters%22%3A%220123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%22%7D";
        await resetState();
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        // Create a duplicate bookmark
       let rootFolder = await getRootFolder();
        await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": url });
        await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": url });
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        let children = await chrome.bookmarks.getChildren(rootFolder[0].id);
        // See if only one of the duplicats remains
        let test = children.length === 2; // because of the common settings bookmark
        if (test) {
            console.log("Passed: Identical duplicate bookmark handled");
            passed += 1;
        } else {
            console.warn("Failed: Identical duplicate bookmark not handled");
            failed += 1;
        }
        // Create a duplicate bookmark with different settings
        let newUrl = url.replace("fred", "barney");
        await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": newUrl });
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        children = await chrome.bookmarks.getChildren(rootFolder[0].id);
        test = children.length === 3; // because of the common settings bookmark
        if (test) {
            console.log("Passed: Different duplicate bookmark handled");
            passed += 1;
        } else {
            console.warn("Failed: Different duplicate bookmark not handled");
            failed += 1;
        }
        // Test duplicate common settings bookmark
        await resetState(); // Don't leave duplicate bookmarks
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        rootFolder = await getRootFolder();
        await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": url });
        url = "ssp://%7B%22clearsuperpw%22%3Afalse%2C%22hidesitepw%22%3Afalse%2C%22defaultSettings%22%3A%7B%22sitename%22%3A%22%22%2C%22username%22%3A%22%22%2C%22providesitepw%22%3Afalse%2C%22xor%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%2C%22pwlength%22%3A12%2C%22domainname%22%3A%22%22%2C%22pwdomainname%22%3A%22%22%2C%22startwithletter%22%3Atrue%2C%22allowlower%22%3Atrue%2C%22allowupper%22%3Atrue%2C%22allownumber%22%3Atrue%2C%22allowspecial%22%3Afalse%2C%22minlower%22%3A1%2C%22minupper%22%3A1%2C%22minnumber%22%3A1%2C%22minspecial%22%3A1%2C%22specials%22%3A%22%24%2F!%3D%40%3F._-%22%7D%7D";
        title = "CommonSettings";
        // Create a duplicate common settings bookmark}
        await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": url });
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        children = await chrome.bookmarks.getChildren(rootFolder[0].id);
        test = children.length === 2; 
        if (test) {
            console.log("Passed: Identical duplicate common settings bookmark handled");
            passed += 1;
        } else {
            console.warn("Failed: Identical duplicate common settings bookmark not handled");
            failed += 1;
        }
        newUrl = url.replace("12", "15");
        await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": newUrl });
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        children = await chrome.bookmarks.getChildren(rootFolder[0].id);
        test = children.length === 3; // because of the common settings bookmark
        if (test) {
            console.log("Passed: Different duplicate common settomgs bookmark handled");
            passed += 1;
        } else {
            console.warn("Failed: Different duplicate common settings bookmark not handled");
            failed += 1;
        }
    }
    // Test save as default
    async function testSaveAsDefault() {
        if (loggingDefault) console.log("testSaveAsDefault");
        await resetState();
        if (loggingDefault) console.log("testSaveAsDefault state reset");
        $pwlength.value = 15;
        await triggerEvent("blur", $pwlength, "pwlengthblurResolver");
        if (loggingDefault) console.log("testSaveAsDefault blur pwlength");
        await triggerEvent("click", $allowspecialcheckbox, "allowspecialclickResolver");
        if (loggingDefault) console.log("testSaveAsDefault click allowspecialcheckbox");
        $specials.value = "%^&";
        if (loggingDefault) console.log("testSaveAsDefault blur |" + $pwlength.value + "|" + $specials.value + "|" + $allowspecialcheckbox.checked + "|");
        await triggerEvent("blur", $specials, "specialsblurResolver");
        if (loggingDefault) console.log("testSaveAsDefault click |" + $pwlength.value + "|" + $specials.value + "|" + $allowspecialcheckbox.checked + "|");
        await triggerEvent("click", $makedefaultbutton, "makedefaultResolver");
        if (loggingDefault) console.log("testSaveAsDefault clicked makedefaultbutton");
        localStorage.restart = "testSaveAsDefault2";
        alert("Inspect the extension again to see the results of testSaveAsDefault.");
    }
    async function testSaveAsDefault2() {
        if (loggingDefault) console.log("testSaveAsDefault2 |" + $pwlength.value + "|" + $specials.value + "|" + $allowspecialcheckbox.checked + "|");
        localStorage.restart = "";
        let tests = $pwlength.value === "15";
        tests = tests && $allowspecialcheckbox.checked;
        tests = tests && $specials.value === "%^&";
        if (tests) {
            console.log("Passed: Save as default");
            passed += 1;
        } else {
            console.warn("Failed: Save as default |" + $pwlength.value + "|" + $specials.value + "|" + $allowspecialcheckbox.checked + "|");
            failed += 1;
        }
    }
    // Utility functions

    // I want to start with a clean slate for each set of tests.
    async function resetState() {
        if (loggingReset) console.log("resetState");
        if (isSafari) await chrome.storage.sync.clear();
        if (loggingReset) console.log("resetState send reset message");
        try {
            let response = await chrome.runtime.sendMessage({"cmd": "reset"});
            if (loggingReset) console.log("resetState reset message response", response);
            clearForm();
            restoreForTesting();
            await getsettings("");
            if (loggingClear) console.log("resetState done", $pwlength.value);
        } catch (error) {
            console.error("Error resetting state:", error);
        }
        if (loggingReset) console.log("resetState reset message response", response);
        clearForm();
        restoreForTesting();
        await getsettings("");
        if (loggingClear) console.log("resetState done", $pwlength.value);
    }
    function clearForm() {
        if (loggingClear) console.log("clearForm", baseDefaultSettings.pwlength);
        $domainname.value = "";
        $superpw.value = "";
        $sitename.value = "";
        $username.value = "";
        $sitepw.value = "";
        $providesitepw.checked = baseDefaultSettings.providesitepw;
        $clearsuperpw.checked = baseDefaultSettings.clearsuperpw;
        $hidesitepw.checked = baseDefaultSettings.hidesitepw;
        $pwlength.value = baseDefaultSettings.pwlength;
        $startwithletter.checked = baseDefaultSettings.startwithletter;
        $allowlowercheckbox.checked = baseDefaultSettings.allowlower;
        $allowuppercheckbox.checked = baseDefaultSettings.allowupper;
        $allownumbercheckbox.checked = baseDefaultSettings.allownumber;
        $allowspecialcheckbox.checked = baseDefaultSettings.allowspecial;
        $minlower.value = baseDefaultSettings.minlower;
        $minupper.value = baseDefaultSettings.minupper;
        $minnumber.value = baseDefaultSettings.minnumber;
        $minspecial.value = baseDefaultSettings.minspecial;
        $specials.value = baseDefaultSettings.specials;
        $settings.style.display = "none";
        if (loggingClear) console.log("clearForm done", $pwlength.value);
    }
    async function fillForm(superpw, domainname, sitename, username) {
        if (loggingFill) console.log("fillForm", superpw, domainname, sitename, username);
        $domainname.value = domainname;
        $superpw.value = superpw;
        await triggerEvent("keyup", $superpw, "superpwkeyupResolver");
        if (loggingFill) console.log("fillForm superpw");
        $sitename.value = sitename;
        await triggerEvent("keyup", $sitename, "sitenamekeyupResolver");
        if (loggingFill) console.log("fillForm sitename");
        $username.value = username;
        await triggerEvent("keyup", $username, "usernamekeyupResolver");
        if (loggingFill) console.log("fillForm username");
        if (loggingFill) console.log("fillForm", $domainname.value, $superpw.value, $sitename.value, $username.value);
    }
    async function forgetDomainname() {
        if (loggingForget) console.log("forgetDomainname");
        $domainname3bluedots.onmouseover();
        $domainnamemenuforget.click();
        await triggerEvent("click", $forgetbutton, "forgetclickResolver");
        if (loggingForget) console.log("forgetDomainname done");
    }
    async function forgetSitename() {
        if (loggingForget) console.log("forgetSitename");
        $sitename3bluedots.onmouseover();
        $sitenamemenuforget.click();
        await triggerEvent("click", $forgetbutton, "forgetclickResolver");
        if (loggingForget) console.log("forgetSitename done");
    }
    async function forgetUsername() {
        if (loggingForget) console.log("forgetUsername");
        $username3bluedots.onmouseover();
        $usernamemenuforget.click();
        if (loggingForget) console.log("forgetUsername click forgetbutton forgetclickResolver");
        await triggerEvent("click", $forgetbutton, "forgetclickResolver");
        if (loggingForget) console.log("forgetUsername forgetclickResolver done");
    }
    async function phishingSetup() {
        if (loggingPhishing) console.log("phishingSetup");
        await resetState();
        if (loggingPhishing) console.log("phishingSetup state reset");
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        if (loggingPhishing) console.log("phishingSetup mouseleave", $domainname.value, $sitename.value, $username.value);
        if (isSafari) await chrome.storage.sync.clear();
        await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
        restoreForTesting();
        // if (loggingPhishing) console.log("phishingSetup domainname blur", $sitename.value, $username.value);
        // await triggerEvent("blur", $domainname, "domainnameblurResolver");
        if (loggingPhishing) console.log("phishingSetup allantheguru click", $domainname.value, $sitename.value, $username.value);
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "guru", "");
        if (loggingPhishing) console.log("phishingSetup sitename blur", $sitename.value, $username.value);
        await triggerEvent("blur", $sitename, "sitenameblurResolver");    
    }
}
async function triggerEvent(event, element, resolverName) {
    let promise = wrapHandler(resolverName);
    if (event === "click") element.checked = !element.checked;
    if (loggingTrigger) console.log("triggerEvent", element.id, event, resolverName, promise);
    let e = new Event(event);
    element.dispatchEvent(e);
    await promise;
    if (loggingTrigger) console.log("triggerEvent promise resolved", element.id, event, promise, resolvers);
}
function wrapHandler(resolverName) {
    if (loggingWrapHandler) console.log("wrapHandler create promise", resolverName, resolvers);
    let promise = new Promise((resolve, reject) => {
        resolvers[resolverName] = resolve;
        if (loggingWrapHandler) console.log("wrapHandler promise created", resolverName, resolvers);
    });
    if (loggingWrapHandler) console.log("wrapHandler return promise", resolverName, promise);
    return promise;
}
function get(id) {
    return document.getElementById(id);
}