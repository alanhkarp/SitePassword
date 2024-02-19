// To run the tests, set testMode to true in bg.js and reload 
// the extension.  Then open any https page, e.g., https://alanhkarp.com. 
// Right click on the SitePassword icon and select "Inspect".  You will 
// see an alert "Starting tests".  Click OK and check the console for results.
import { normalize } from "./generate.js";
import { getsettings, superpwblurPromise, sitenamekeyupPromise, usernamekeyupPromise, 
    superpwkeyupPromise, mouseleavePromise, domainnameblurPromise, providesitepwclickPromise,
    sitepwblurPromise, sitenameblurPromise, warningclickPromise, forgetclickPromise,
    pwlengthblurPromise, pwlengthmouseoutPromise, allowspecialchecboxPromise, specialsblurPromise,
    makedefaultPromise } from "./ssp.js";

let logging = false;
let loggingReset = false;
let loggingFill = false;
let loggingTrigger = false;
let loggingPhishing = false;
let loggingForget = false;
let loggingDefault = false;
let loggingProvide = false;
let loggingCalculation = false;

export async function runTests() {
    // Fields needed for tests
    const $mainpanel = get("mainpanel");
    const $domainname = get("domainname");
    const $bookmark = get("bookmark");
    const $sitename = get("sitename");
    const $username = get("username");
    const $superpw = get("superpw");
    const $sitepw = get("sitepw");
    const $providesitepw = get("providesitepw");
    const $pwlength = get("pwlength");
    const $allowspecialcheckbox = get("allowspecialcheckbox");
    const $specials = get("specials");
    const $makedefaultbutton = get("makedefaultbutton");
    const $cancelbutton = get("cancelbutton");
    const $warningbutton = get("warningbutton");
    const $cancelwarning = get("cancelwarning");
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

    let passed = 0;
    let failed = 0;
    let restart = localStorage.restart;
    if (restart) {
        alert("Restarting test");
        console.log("Restarting test " + restart);
    } else {
        alert("Starting tests. Set testMode in bg.js to false to stop tests.");
    }
    const sleepTime = 500;
    if (!restart) {
        await testCalculation(); 
        await testRememberForm();
        await testProvidedpw();
        await testPhishing();
        await testForget();
        console.log("Tests complete: " + passed + " passed, " + failed + " failed");
        // alert("Tests restart complete: " + passed + " passed, " + failed + " failed");
        // await testSaveAsDefault();
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
        if (loggingCalculation) console.log("testCalculation state reset");
        const expected = "UG1qIyn6mSuJ";
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
        await triggerEvent("mouseleave", $mainpanel, mouseleavePromise);  // $mainpanel.onmouseleave(); saves the settings
        if (logging) console.log("testRememberForm filled form", $sitename.value, $username.value);
        // See if it remembers
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        if (logging) console.log("testRememberForm filled form", $sitename.value, $username.value);
        await triggerEvent("blur", $domainname, domainnameblurPromise);
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
        await triggerEvent("click", $providesitepw, providesitepwclickPromise);
        if (loggingProvide) console.log("testProvidedpw clicked", $providesitepw.disabled, $providesitepw.checked);
        loggingTrigger = false;
        $sitepw.value = expected;
        await triggerEvent("blur", $sitepw, sitepwblurPromise);
        await triggerEvent("mouseleave", $mainpanel, mouseleavePromise);
        if (loggingProvide) console.log("testProvidedpw saved", $sitepw.value);
        // See if it remembers
        await clearForm();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, domainnameblurPromise);
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
        await triggerEvent("click", $warningbutton, warningclickPromise);
        await triggerEvent("mouseleave", $mainpanel, mouseleavePromise);
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
        await clearForm();
        await fillForm("", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, domainnameblurPromise);
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
        await resetState();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        await triggerEvent("mouseleave", $mainpanel, mouseleavePromise);
        await forgetDomainname();
        // See if it forgot
        clearForm();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, domainnameblurPromise);
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
        await triggerEvent("click", $warningbutton, warningclickPromise); // Now I have two domain names pointing to the same site name
        await triggerEvent("mouseleave", $mainpanel, mouseleavePromise);
        await forgetDomainname();
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, domainnameblurPromise);
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
        await triggerEvent("click", $warningbutton, warningclickPromise); // Now I have two domain names pointing to the same site name
        await forgetSitename();
        await triggerEvent("click", $forgetbutton, forgetclickPromise);
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, domainnameblurPromise);
        test = $sitename.value === "" && $username.value === "";
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, domainnameblurPromise);
        test = test && $sitename.value === "" && $username.value === "";
        if (test) {
            console.log("Passed: Forget by site name");
            passed += 1;
        } else {
            console.warn("Failed: Forget by site name");
            failed += 1;
        }
        // See if forget by username works
        if (loggingForget) console.log("testForget forget by username");
        await phishingSetup();
        await triggerEvent("click", $warningbutton, warningclickPromise); // Now I have two domain names pointing to the same site name
        if (loggingForget) console.log("testForget forget by username");
        await forgetUsername();
        await triggerEvent("click", $forgetbutton, forgetclickPromise);
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, domainnameblurPromise);
        if (loggingForget) console.log("testForget forgot by username", $sitename.value, $username.value);
        test = $sitename.value === "" && $username.value === "";
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname, domainnameblurPromise);
        test = test && $sitename.value === "" && $username.value === "";
        if (test) {
            console.log("Passed: Forget by username");
            passed += 1;
        } else {
            console.warn("Failed: Forget by username");
            failed += 1;
        } 
    }
    // Test save as default
    async function testSaveAsDefault() {
        if (loggingDefault) console.log("testSaveAsDefault");
        await resetState();
        localStorage.restart = "testSaveAsDefault2";
        $pwlength.value = 15;
        await triggerEvent("blur", $pwlength, pwlengthblurPromise);
        await triggerEvent("click", $allowspecialcheckbox, allowspecialchecboxPromise);
        $specials.value = "%^&";
        if (loggingDefault) console.log("testSaveAsDefault |" + $specials.value + "|" + $allowspecialcheckbox.checked + "|");
        await triggerEvent("blur", $specials, specialsblurPromise);
        await triggerEvent("click", $makedefaultbutton, makedefaultPromise);
        alert("Inspect the extension again to see the results of testSaveAsDefault.");
    }
    async function testSaveAsDefault2() {
        if (loggingDefault) console.log("testSaveAsDefault2 |" + $specials.value + "|" + $allowspecialcheckbox.checked + "|");
        localStorage.restart = "";
        let tests = $pwlength.value === "15";
        if (loggingDefault) console.log("testSaveAsDefault2 |" + $allowspecialcheckbox.checked + "|");
        tests = tests && $allowspecialcheckbox.checked;
        if (loggingDefault) console.log("testSaveAsDefault2", tests, "|" + $allowspecialcheckbox.checked + "|");
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
        if (loggingReset) console.log("resetState clear form");
        await clearForm();
        if (loggingReset) console.log("resetState clear storage");
        await chrome.storage.sync.clear();
        if (loggingReset) console.log("resetState storage cleared", await chrome.storage.sync.get());
        return new Promise((resolve, reject) => {
            if (loggingReset) console.log("resetState send reset message");
            chrome.runtime.sendMessage({"cmd": "reset"}, async (response) => {
                if (chrome.runtime.lastError) {
                    if (loggingReset) console.error("resetState reset message error", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    if (loggingReset) console.log("resetState reset message response", response);
                    resolve(response);
                }
            });
        });
    }
    async function triggerEvent(event, element, promiseCreator) {
        let promise = promiseCreator();
        if (event === "click") element.checked = !element.checked;
        if (loggingTrigger) console.log("triggerEvent", element.id, event, promise);
        let e = new Event(event);
        element.dispatchEvent(e);
        await promise;
        if (loggingTrigger) console.log("triggerEvent promise resolved", element.id, event, promise);
    }
    async function clearForm() {
        if (logging) console.log("clearForm");
        $domainname.value = "";
        $superpw.value = "";
        $sitename.value = "";
        $username.value = "";
        $sitepw.value = "";
        $providesitepw.checked = false;
        $settings.style.display = "none";
        if (logging) console.log("clearForm done");
        await getsettings("");
        if (logging) console.log("clearForm getsettings done");
    }
    async function fillForm(superpw, domainname, sitename, username) {
        if (loggingFill) console.log("fillForm", superpw, domainname, sitename, username);
        $domainname.value = domainname;
        $superpw.value = superpw;
        await triggerEvent("keyup", $superpw, superpwkeyupPromise);
        if (loggingFill) console.log("fillForm superpw");
        $sitename.value = sitename;
        await triggerEvent("keyup", $sitename, sitenamekeyupPromise);
        if (loggingFill) console.log("fillForm sitename");
        $username.value = username;
        await triggerEvent("keyup", $username, usernamekeyupPromise);
        if (loggingFill) console.log("fillForm username");
        if (loggingFill) console.log("fillForm", $domainname.value, $superpw.value, $sitename.value, $username.value);
    }
    async function forgetDomainname() {
        $domainname3bluedots.onmouseover();
        $domainnamemenuforget.click();
        await triggerEvent("click", $forgetbutton, forgetclickPromise);
    }
    async function forgetSitename() {
        $sitename3bluedots.onmouseover();
        $sitenamemenuforget.click();
        await triggerEvent("click", $forgetbutton, forgetclickPromise);
    }
    async function forgetUsername() {
        $username3bluedots.onmouseover();
        $usernamemenuforget.click();
        await triggerEvent("click", $forgetbutton, forgetclickPromise);
    }
    async function phishingSetup() {
        if (loggingPhishing) console.log("phishingSetup");
        await resetState();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        if (loggingPhishing) console.log("phishingSetup mouseleave", $sitename.value, $username.value);
        await triggerEvent("mouseleave", $mainpanel, mouseleavePromise);
        if (loggingPhishing) console.log("phishingSetup domainname blur", $sitename.value, $username.value);
        await triggerEvent("blur", $domainname, domainnameblurPromise);
        if (loggingPhishing) console.log("phishingSetup allantheguru click", $sitename.value, $username.value);
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "guru", "");
        if (loggingPhishing) console.log("phishingSetup sitename blur", $sitename.value, $username.value);
        await triggerEvent("blur", $sitename, sitenameblurPromise);    
    }
    function get(id) {
        return document.getElementById(id);
    }
}