// To run the tests, set testMode to true in bg.js and reload 
// the extension.  Then open any https page, e.g., https://alanhkarp.com. 
// Right click on the SitePassword icon and select "Inspect".  You will 
// see an alert "Starting tests".  Click OK and check the console for results.
import { baseDefaultSettings, getRootFolder } from "./bg.js";
import { normalize } from "./generate.js";
import { getsettings, restoreForTesting } from "./ssp.js";

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
if (logging) {
    loggingCalculation = loggingClear = loggingDefault = loggingFill = 
                         loggingForget = loggingPhishing = loggingProvide = 
                         loggingReset = loggingTrigger = loggingWrapHandler = true;
}
// #region Fields needed for tests
const $account = get("account");
const $accountnicknamecancelbutton = get("accountnicknamecancelbutton");
const $accountnicknameinput = get("accountnicknameinput");
const $accountnicknamenewbutton = get("accountnicknamenewbutton");
const $accountnicknamesavebutton = get("accountnicknamesavebutton");
const $allowlowercheckbox = get("allowlowercheckbox");
const $allownumbercheckbox = get("allownumbercheckbox");
const $allowspecialcheckbox = get("allowspecialcheckbox");
const $allowuppercheckbox = get("allowuppercheckbox");
const $clearsuperpw = get("clearsuperpw");
const $domainname = get("domainname");
const $domainname3bluedots = get("domainname3bluedots");
const $domainnamemenuforget = get("domainnamemenuforget");
const $forgetbutton = get("forgetbutton");
const $hidesitepw = get("hidesitepw");
const $makedefaultbutton = get("makedefaultbutton");
const $mainpanel = get("mainpanel");
const $minlower = get("minlower");
const $minnumber = get("minnumber");
const $minspecial = get("minspecial");
const $minupper = get("minupper");
const $nicknamebutton = get("nicknamebutton");
const $phishing = get("phishing");
const $providesitepw = get("providesitepw");
const $pwlength = get("pwlength");
const $sameacctbutton = get("sameacctbutton");
const $settings = get("settings");
const $settingsshow = get("settingsshow");
const $sitename = get("sitename");
const $sitename3bluedots = get("sitename3bluedots");
const $sitepw = get("sitepw");
const $sitepw3bluedots = get("sitepw3bluedots");
const $sitepwmenu = get("sitepwmenu");
const $sitepwmenuaccount = get("sitepwmenuaccount");
const $sitenamemenuforget = get("sitenamemenuforget");
const $specials = get("specials");
const $startwithletter = get("startwithletter");
const $suffix = get("suffix");
const $suffixacceptbutton = get("suffixacceptbutton");
const $suffixcancelbutton = get("suffixcancelbutton");
const $superpw = get("superpw");
const $username = get("username");
const $username3bluedots = get("username3bluedots");
const $usernamemenuforget = get("usernamemenuforget");
const $forget = get("forget");
// #endregion

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
    if (!restart) {
        await testCalculation(); 
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
        await testChangeAccount();
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
    await resetState();
    if (loggingCalculation) console.log("testCalculation state reset", $pwlength.value);
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
    if (loggingCalculation) console.log("testCalculation form filled", $sitename.value, $username.value);
    let actual = $sitepw.value;
    if (actual === expectedpw) {
        console.log("Passed: Calculation");
        passed++;
    } else {
        let inputs = {"expectedpw": expectedpw, "actual": actual, "superpw": $superpw.value, "sitename": $sitename.value, "username": $username.value};
        console.warn("Failed: Calculation", inputs);
        failed++;
    }
}
// Test change password
async function testChangePassword() {
    await phishingSetup();
    await triggerEvent("click", $sameacctbutton, "sameacctbuttonResolver");
    restoreForTesting();
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
    $sitename.value = "Guru2";
    await triggerEvent("blur", $sitename, "sitenameblurResolver");
    let actual = $sitepw.value;
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    restoreForTesting();
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $domainname, "domainnameblurResolver");
    let test = $sitename.value === "Guru2" && $username.value === "alan" && $sitepw.value === actual;
    if (test) {
        console.log("Passed: Change password");
        passed++;
    } else {
        console.warn("Failed: Change password", "Guru2", "alan", actual, $sitename.value, $username.value, $sitepw.value);
        failed++;
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
        passed++;
    } else {
        console.warn("Failed: Remember form", "Guru", "alan", "|" + $sitename.value + "|");
        failed++;
    }
}
async function testProvidedpw() {
    loggingProvide = false;
    const expectedpw = "MyStrongPassword";
    await resetState();
    if (loggingProvide) console.log("testProvidedpw state reset");
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
    get("settings").style.display = "block";
    if (loggingProvide) console.log("testProvidedpw providepw before", $providesitepw.disabled, $providesitepw.checked);
    await triggerEvent("click", $providesitepw, "providesitepwResolver");
    if (loggingProvide) console.log("testProvidedpw clicked", $providesitepw.disabled, $providesitepw.checked);
    $sitepw.value = expectedpw;
    await triggerEvent("blur", $sitepw, "sitepwblurResolver");
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    if (loggingProvide) console.log("testProvidedpw saved", $sitepw.value);
    // See if it remembers
    clearForm();
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    document.activeElement.blur(); // So sitepw field is not the active element
    await triggerEvent("blur", $domainname, "domainnameblurResolver");
    if (loggingProvide) console.log("testProvidedpw domainname blur", $sitepw.value, $providesitepw.checked);
    let test = $sitepw.value === expectedpw
    if (test) {
        console.log("Passed: Provide pw");
        passed++;
    } else {
        console.warn("Failed: Provide pw", expectedpw, "|" + $sitepw.value + "|");
        failed++;
    }
}
// Test phishing
async function testPhishing() {
    await phishingSetup();
    // Does warning appear?
    let test = $phishing.style.display === "block";
    if (test) {
        console.log("Passed: Phishing warning is showing.");
        passed++;
    } else {
        console.warn("Failed: Phishing warning not showing.");
        failed++;
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
        passed++;
    } else {
        console.warn("Failed: Phishing new site name");
        failed++;
    }
    // Does same account option work?
    await phishingSetup();
    await triggerEvent("click", $sameacctbutton, "sameacctbuttonResolver");
    restoreForTesting();
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    if (loggingPhishing) console.log("testPhishing same account", $phishing.style.display, $sitename.value, $username.value);
    test = $phishing.style.display === "none";
    test = test && $sitename.value === normalize("Guru");
    test = test && $username.value === "alan";
    if (test) {
        console.log("Passed: Phishing same account");
        passed++;
    } else {
        console.warn("Failed: Phishing same account");
        failed++;
    }
    clearForm();
    await fillForm("", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $domainname, "domainnameblurResolver");
    test = $sitename.value === normalize("Guru") && $username.value === "alan";
        if (test) {
        console.log("Passed: Phishing remembered same account");
        passed++;
    } else {    
        console.warn("Failed: Phishing remembered same account");
        failed++;
    }
}
// Test shared credentials
async function testSharedCredentials() {
    await resetState();
    await fillForm("qwerty", "disney.com", "Disney", "alan");
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");  // $mainpanel.onmouseleave(); saves the settings
    let expected = $sitepw.value;
    restoreForTesting();
    await fillForm("qwerty", "hulu.com", "Disney", "");
    await triggerEvent("blur", $sitename, "sitenameblurResolver");
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");  // $mainpanel.onmouseleave(); saves the settings
    restoreForTesting();
    await fillForm("qwerty", "hulu.com", "", "");
    await triggerEvent("blur", $domainname, "domainnameblurResolver");
    let test = $phishing.style.display === "none";
    test = test && $username.value === "alan";
    test = test && $sitepw.value === expected;
    if (test) {
        console.log("Passed: Shared credentials");
        passed++;
    }
    else {
        console.warn("Failed: Shared credentials");
        failed++;
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
        passed++;
    } else {
        console.warn("Failed: Forget by domain name");
        failed++;
    }
    // See if database still has site name if it should
    await phishingSetup();
    await triggerEvent("click", $sameacctbutton, "sameacctbuttonResolver"); // Now I have two domain names pointing to the same site name
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    await forgetDomainname();
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $domainname, "domainnameblurResolver");
    test = $sitename.value === "" && $username.value === "";
    if (test) {
        console.log("Passed: Forget site name when it should");
        passed++;
    } else {
        console.warn("Failed: Did not forget site name when it should");
        failed++;
    }
    // See if forget by site name works
    await phishingSetup();
    await triggerEvent("click", $sameacctbutton, "sameacctbuttonResolver"); // Now I have two domain names pointing to the same site name
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
        passed++;
    } else {
        console.warn("Failed: Forget by site name");
        failed++;
    }
    // See if forget by username works
    await phishingSetup();
    await triggerEvent("click", $sameacctbutton, "sameacctbuttonResolver"); // Now I have two domain names pointing to the same site name
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
        passed++;
    } else {
        console.warn("Failed: Forget by username");
        failed++;
    } 
    // See if forget works even if you don't leave the popup
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    await forgetDomainname();
    test = $forget.style.display === "none";
    if (test) {
        console.log("Passed: Forget without leaving popup no warning");
        passed++;
    } else {
        console.warn("Failed: Forget without leaving popup warning");
        failed++;
    }
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "");
    test = $username.value === "";
    if (test) {
        console.log("Passed: Forget without leaving popup no username");
        passed++;
    } else {
        console.warn("Failed: Forget without leaving popup username");
        failed++;
    }
}
// Test proper handling of duplicate bookmarks
async function testDuplicateBkmks() {
    let title = "duplicate.bkmk.com";
    let url = "https://sitepassword.info/?bkmk=ssp://%7B%22sitename%22%3A%22usps%22%2C%22username%22%3A%22fred%22%2C%22providesitepw%22%3Afalse%2C%22xor%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%2C%22domainname%22%3A%22reg.usps.com%22%2C%22pwdomainname%22%3A%22reg.usps.com%22%2C%22pwlength%22%3A%2212%22%2C%22startwithletter%22%3Atrue%2C%22allowlower%22%3Atrue%2C%22allowupper%22%3Atrue%2C%22allownumber%22%3Atrue%2C%22allowspecial%22%3Afalse%2C%22minlower%22%3A%221%22%2C%22minupper%22%3A%221%22%2C%22minnumber%22%3A%221%22%2C%22minspecial%22%3A%221%22%2C%22specials%22%3A%22%24%2F!%3D%40%3F._-%22%2C%22characters%22%3A%220123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%22%7D";
    await resetState();
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    // Create a duplicate bookmark
    let rootFolder = await getRootFolder();
    if (loggingDuplicateBkmks) console.log("testDuplicateBkmks creating identical duplicate bookmarks");
    await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": url });
    await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": url });
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    let children = await chrome.bookmarks.getChildren(rootFolder[0].id);
    // See if only one of the duplicats remains
    let test = children.length === 2; // because of the common settings bookmark
    if (test) {
        console.log("Passed: Identical duplicate bookmark handled");
        passed++;
    } else {
        console.warn("Failed: Identical duplicate bookmark not handled");
        failed++;
    }
    // Create a duplicate bookmark with different settings
    let newUrl = url.replace("fred", "barney");
    if (loggingDuplicateBkmks) console.log("testDuplicateBkmks creating different duplicate bookmark");
    await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": newUrl });
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    children = await chrome.bookmarks.getChildren(rootFolder[0].id);
    test = children.length === 3; // because of the common settings bookmark
    if (test) {
        console.log("Passed: Different duplicate bookmark handled");
        passed++;
    } else {
        console.warn("Failed: Different duplicate bookmark not handled");
        failed++;
    }
    // Test duplicate common settings bookmark
    await resetState();
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    rootFolder = await getRootFolder();
    // Create a duplicate common settings bookmark}
    if (loggingDuplicateBkmks) console.log("testDuplicateBkmks creating identical duplicate common settings bookmark");
    url = "ssp://%7B%22clearsuperpw%22%3Afalse%2C%22hidesitepw%22%3Afalse%2C%22safeSuffixes%22%3A%7B%7D%2C%22defaultSettings%22%3A%7B%22sitename%22%3A%22%22%2C%22username%22%3A%22%22%2C%22providesitepw%22%3Afalse%2C%22xor%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%2C%22pwlength%22%3A12%2C%22domainname%22%3A%22%22%2C%22pwdomainname%22%3A%22%22%2C%22startwithletter%22%3Atrue%2C%22allowlower%22%3Atrue%2C%22allowupper%22%3Atrue%2C%22allownumber%22%3Atrue%2C%22allowspecial%22%3Afalse%2C%22minlower%22%3A1%2C%22minupper%22%3A1%2C%22minnumber%22%3A1%2C%22minspecial%22%3A1%2C%22specials%22%3A%22%24%2F!%3D%40%3F._-%22%7D%7D";
    title = "CommonSettings";
    await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": url });
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    children = await chrome.bookmarks.getChildren(rootFolder[0].id);
    test = children.length === 1; 
    if (test) {
        console.log("Passed: Identical duplicate common settings bookmark handled");
        passed++;
    } else {
        console.warn("Failed: Identical duplicate common settings bookmark not handled");
        failed++;
    }
    newUrl = url.replace("12", "15");
    if (loggingDuplicateBkmks) console.log("testDuplicateBkmks creating different duplicate common settings bookmark");
    await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": newUrl });
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    children = await chrome.bookmarks.getChildren(rootFolder[0].id);
    test = children.length === 2;
    if (test) {
        console.log("Passed: Different duplicate common settings bookmark handled");
        passed++;
    } else {
        console.warn("Failed: Different duplicate common settings bookmark not handled");
        failed++;
    }
}
// Test clear superpw
async function testClearSuperpw() {
    if (loggingClearsuperpw) console.log("testClearSuperpw");
    await resetState();
    await triggerEvent("click", $settingsshow, "settingsshowResolver");
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
    await triggerEvent("click", $clearsuperpw, "clearsuperpwResolver");
    restoreForTesting();
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    let response = await chrome.runtime.sendMessage({"cmd": "getPassword", "domainname": "alantheguru.alanhkarp.com"});
    await triggerEvent("blur", $domainname, "domainnameblurResolver");
    if (loggingClearsuperpw || logging) console.log("testClearSuperpw getPassword", response);
    let test = $superpw.value === "" && response === expectedpw;
    if (test) {
        console.log("Passed: Clear superpw");
        passed++;
    } else {
        console.warn("Failed: Clear superpw");
        failed++;
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
        passed++;
    } else {
        console.warn("Failed: Hide sitepw");
        failed++;
    }
}
// Test updating legacy bookmarks
async function testLegacyBkmks() {
    // Create a legacy bookmark
    await resetState();
    let title = "legacy.bkmk.com";
    let url = "https://sitepassword.info/?bkmk=ssp://{%22sitename%22:%22usps%22,%22username%22:%22fred%22,%22providesitepw%22:false,%22xor%22:[0,0,0,0,0,0,0,0,0,0,0,0],%22pwlength%22:12,%22domainname%22:%22reg.usps.com%22,%22pwdomainname%22:%22reg.usps.com%22,%22startwithletter%22:true,%22allowlower%22:true,%22allowupper%22:true,%22allownumber%22:true,%22allowspecial%22:false,%22minlower%22:1,%22minupper%22:1,%22minnumber%22:1,%22minspecial%22:1,%22specials%22:%22$/!=@?._-%22,%22characters%22:%220123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz%22}";
    let rootFolder = await getRootFolder();
    await chrome.bookmarks.create({ "parentId": rootFolder[0].id, "title": title, "url": url });
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    let children = await chrome.bookmarks.getChildren(rootFolder[0].id);
    let test = children[0].url.indexOf("{") === -1;
    if (test) {
        console.log("Passed: Legacy bookmark updated");
        passed++;
    } else {
        console.warn("Failed: Legacy bookmark not updated");
        failed++;
    }
}
// Test safe suffixes
async function testSafeSuffixes() {
    // Test that you get the simple phishing warning with a safe suffix
    await resetState();
    await phishingSetup();
    await triggerEvent("click", $sameacctbutton, "sameacctbuttonResolver");
    restoreForTesting();
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    await fillForm("qwerty", "ahktheguru.alanhkarp.com", "Guru", "");
    await triggerEvent("blur", $sitename, "sitenameblurResolver");
    let test = $suffix.style.display === "block";
    await triggerEvent("click", $suffixacceptbutton, "suffixacceptbuttonResolver");
    test = test && $suffix.style.display === "none";
    test = test && $username.value === "alan" && $sitepw.value === expectedpw && $suffix.style.display === "none";
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    if (test) {
        console.log("Passed: Safe suffix");
        passed++;
    } else {
        console.warn("Failed: Safe suffix");
        failed++;
    }
    // Test that you do get a phishing warning with an unsafe suffix
    restoreForTesting();
    await fillForm("qwerty", "alantheguru.allanhkarp.com", "Guru", "");
    await triggerEvent("blur", $sitename, "sitenameblurResolver");
    test = $username.value === "" && $phishing.style.display === "block";
    if (test) {
        console.log("Passed: Unsafe suffixes");
        passed++;
    } else {
        console.warn("Failed: Unsafe suffixes");
        failed++;
    }
    // Test that you don't get an entry in the public suffix list in the safe suffixes
    restoreForTesting();
    await fillForm("qwerty", "alantheguru.allanhkarp.com", "Guru", "");
    await triggerEvent("blur", $sitename, "sitenameblurResolver");
    await triggerEvent("click", $sameacctbutton, "sameacctbuttonResolver");
    restoreForTesting();
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    await fillForm("qwerty", "alantheguru.alenhkarp.com", "Guru", "");
    await triggerEvent("blur", $sitename, "sitenameblurResolver");
    test = $phishing.style.display === "block";
    get("phishing").style.display = "none";
    if (test) {
        console.log("Passed: Not in safe suffixes");
        passed++;
    } else {
        console.warn("Failed: Not in safe suffixes");
        failed++;
    }
}
// Test reassign account
async function testChangeAccount() {
    await resetState();
    await phishingSetup();
    await triggerEvent("click", $sameacctbutton, "sameacctbuttonResolver");
    restoreForTesting();
    $sitepw3bluedots.style.display = "none"; // Can't use mouseout because call gets a null event
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    $sitepw3bluedots.onmouseover();
    $sitepwmenuaccount.onclick();
    let test = $account.style.display === "block";
    let elements = document.getElementsByName("hassuffix");
    for (let element of elements) {
        test = test && element.style.display !== "block";
    }
    if (test) {
        console.log("Passed: Change account open");
        passed++;
    } else {
        console.warn("Failed: Change account not open");
        failed++;
    }
    restoreForTesting();
    $sitepwmenu.style.display = "none";
    $accountnicknameinput.value = "newGuru";
    $accountnicknamecancelbutton.onclick();
    test = $account.style.display === "none";
    test = test && normalize($sitename.value) === "guru";
    if (test) {
        console.log("Passed: Change account cancel");
        passed++;
    } else {
        console.warn("Failed: Change account cancel");
        failed++;
    }
    restoreForTesting();
    $sitepwmenu.style.display = "none";
    $sitepw3bluedots.onmouseover();
    $sitepwmenuaccount.onclick();
    $accountnicknameinput.value = "newGuru";
    $accountnicknamesavebutton.onclick();
    test = $account.style.display === "none";
    test = test && normalize($sitename.value) === normalize("newGuru");
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $domainname, "domainnameblurResolver");
    test = test && normalize($sitename.value) === normalize("newGuru");
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $domainname, "domainnameblurResolver");
    test = test && normalize($sitename.value) === normalize("newGuru");
    if (test) {
        console.log("Passed: Change account save");
        passed++;
    } else {
        console.warn("Failed: Change account save");
        failed++;
    }
    restoreForTesting();
    $sitepwmenu.style.display = "none";
    $sitepw3bluedots.onmouseover();
    $sitepwmenuaccount.onclick();
    $accountnicknameinput.value = "Guru";
    $accountnicknamenewbutton.onclick(); 
    test = $account.style.display === "none";
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $domainname, "domainnameblurResolver");
    test = test && normalize($sitename.value) === normalize("newGuru");
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
    await triggerEvent("blur", $domainname, "domainnameblurResolver");
    test = test && normalize($sitename.value) === normalize("guru");
    if (test) {
        console.log("Passed: Change account new");
        passed++;
    } else {
        console.warn("Failed: Change account new");
        failed++;
    }
} 
// Test save as default
async function testSaveAsDefault() {
    if (loggingDefault) console.log("testSaveAsDefault");
    await resetState();
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    await triggerEvent("click", $settingsshow, "settingsshowResolver");
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
    localStorage.restart = "testSaveAsDefault2";
    alert("Inspect the extension again to see the results of testSaveAsDefault.");
}
async function testSaveAsDefault2() {
    if (loggingDefault) console.log("testSaveAsDefault2 |" + $pwlength.value + "|" + $specials.value + "|" + $allowspecialcheckbox.checked + "|");
    await triggerEvent("click", $settingsshow, "settingsshowResolver");
    localStorage.restart = "";
    let tests = $pwlength.value === "15";
    tests = tests && $allowspecialcheckbox.checked;
    tests = tests && $specials.value === "%^&";
    if (tests) {
        console.log("Passed: Save as default");
        passed++;
    } else {
        console.warn("Failed: Save as default |" + $pwlength.value + "|" + $specials.value + "|" + $allowspecialcheckbox.checked + "|");
        failed++;
    }
}
// Utility functions

// I want to start with a clean slate for each set of tests.
async function resetState() {
    if (loggingReset) console.log("resetState");
    if (loggingReset) console.log("resetState send reset message");
    let response = await chrome.runtime.sendMessage({"cmd": "reset"}, );
    if (chrome.runtime.lastError) console.error("resetState reset message error", chrome.runtime.lastError);
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
    clearForm();
    $domainname.value = domainname;
    if (superpw) {
        $superpw.value = superpw;
        await triggerEvent("keyup", $superpw, "superpwkeyupResolver");
        if (loggingFill) console.log("fillForm superpw");
    }
    if (sitename) {
        $sitename.value = sitename;
        await triggerEvent("keyup", $sitename, "sitenamekeyupResolver");
        if (loggingFill) console.log("fillForm sitename");
    }
    if (username) {
        $username.value = username;
        await triggerEvent("keyup", $username, "usernamekeyupResolver");
        if (loggingFill) console.log("fillForm username");
    }
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
    await triggerEvent("mouseleave", $mainpanel, "mouseleaveResolver");
    restoreForTesting();
    // if (loggingPhishing) console.log("phishingSetup domainname blur", $sitename.value, $username.value);
    // await triggerEvent("blur", $domainname, "domainnameblurResolver");
    if (loggingPhishing) console.log("phishingSetup allantheguru click", $domainname.value, $sitename.value, $username.value);
    await fillForm("qwerty", "allantheguru.alanhkarp.com", "guru", "");
    if (loggingPhishing) console.log("phishingSetup sitename blur", $sitename.value, $username.value);
    await triggerEvent("blur", $sitename, "sitenameblurResolver");    
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