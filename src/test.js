// To run the tests, set testMode to true in bg.js and reload 
// the extension.  Then open any https page, e.g., https://alanhkarp.com. 
// Right click on the SitePassword icon and select "Inspect".  You will 
// see an alert "Starting tests".  Click OK and check the console for results.
import { getsettings } from "./ssp.js";

let logging = false;
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
        console.log("Restarting test " + restart);
    } else {
        alert("Starting tests");
    }
    const sleepTime = 300;
    if (!restart) {
        await testCalculation(); 
        await testRememberForm();
        await testProvidedpw();
        await testPhishing();
        await testForget();
        console.log("Tests complete: " + passed + " passed, " + failed + " failed");
        alert("Tests restart complete: " + passed + " passed, " + failed + " failed");
        await testSaveAsDefault();
    } else {
        if (restart === "testSaveAsDefault2") {
            testSaveAsDefault2();
            // Need to reset state because these defaults get read before the tests have a chance to reset the state.
            if (logging) console.log("Resetting state");
            await resetState();
            if (logging) console.log("State reset");
            localStorage.restart = "";
        } else {
            console.error("Unknown test", restart);
        }
    }
    // Test password calculation
    async function testCalculation() {
        await resetState();
        if (logging) console.log("testCalculation state reset");
        const expected = "UG1qIyn6mSuJ";
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        if (logging) console.log("testCalculation form filled", $sitename.value, $username.value);
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
        await triggerEvent("mouseleave", $mainpanel);  // $mainpanel.onmouseleave(); saves the settings
        if (logging) console.log("testRememberForm filled form", $sitename.value, $username.value);
        // See if it remembers
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        if (logging) console.log("testRememberForm filled form", $sitename.value, $username.value);
        await triggerEvent("blur", $domainname);
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
        const expected = "MyStrongPassword";
        await resetState();
        if (logging) console.log("testProvidedpw state reset");
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        get("settings").style.display = "block";
        if (logging) console.log("testProvidedpw providepw before", $providesitepw.disabled, $providesitepw.checked);
        $providesitepw.checked = true;
        await triggerEvent("click", $providesitepw);
        if (logging) console.log("testProvidedpw clicked", $providesitepw.disabled, $providesitepw.checked);
        $sitepw.value = expected;
        await triggerEvent("blur", $sitepw);
        await triggerEvent("mouseleave", $mainpanel);
        if (logging) console.log("testProvidedpw saved", $sitepw.value);
        // See if it remembers
        await clearForm();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname);
        if (logging) console.log("testProvidedpw superpw blur", $sitepw.value);
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
        // Does warning go away leaving form cleared?
        await triggerEvent("click", $cancelwarning);
        test = $phishing.style.display === "none" && $sitename.value === "";
        if (test) {
            console.log("Passed: Phishing warning not showing.");
            passed += 1;
        } else {
            console.warn("Failed: Phishing warning is showing.");
            failed += 1;
        }
        // Does setting new site name work?
        await phishingSetup();
        await triggerEvent("click", $nicknamebutton);
        test = $phishing.style.display === "none" && $sitename.value === "Guru" 
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
        await triggerEvent("click", $warningbutton);
        await triggerEvent("mouseleave", $mainpanel);
        test = $phishing.style.display === "none" && $sitename.value === "Guru";
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
        await triggerEvent("blur", $domainname);
        test = $sitename.value === "Guru" && $username.value === "alan";
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
        $mainpanel.onmouseleave();
        await forgetDomainname();
        // See if it forgot
        clearForm();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname);
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
        await triggerEvent("click", $warningbutton);
        await triggerEvent("mouseleave", $mainpanel);
        await forgetDomainname();
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname);
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
        await triggerEvent("click", $warningbutton); // Now I have two domain names pointing to the same site name
        await triggerEvent("mouseover", $sitename3bluedots);
        await triggerEvent("click", $sitenamemenuforget);
        await triggerEvent("click", $forgetbutton);
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname);
        test = $sitename.value === "" && $username.value === "";
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname);
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
        await triggerEvent("click", $warningbutton); // Now I have two domain names pointing to the same site name
        await triggerEvent("mouseover", $username3bluedots);
        await triggerEvent("click", $usernamemenuforget);
        await triggerEvent("click", $forgetbutton);
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname);
        test = $sitename.value === "" && $username.value === "";
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        await triggerEvent("blur", $domainname);
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
        if (logging) console.log("testSaveAsDefault");
        await resetState();
        localStorage.restart = "testSaveAsDefault2";
        $pwlength.value = 15;
        await triggerEvent("blur", $pwlength);
        $allowspecialcheckbox.checked = true;
        await triggerEvent("click", $allowspecialcheckbox);
        $specials.value = "%^&";
        if (logging) console.log("testSaveAsDefault |" + $specials.value + "|" + $allowspecialcheckbox.checked + "|");
        await triggerEvent("blur", $specials);
        await triggerEvent("click", $makedefaultbutton);
        alert("Inspect the extension again to see the results of testSaveAsDefault.");
    }
    async function testSaveAsDefault2() {
        if (logging) console.log("testSaveAsDefault2 |" + $specials.value + "|" + $allowspecialcheckbox.checked + "|");
        localStorage.restart = "";
        let tests = $pwlength.value === "15";
        if (logging) console.log("testSaveAsDefault2 |" + $allowspecialcheckbox.checked + "|");
        tests = tests && $allowspecialcheckbox.checked;
        if (logging) console.log("testSaveAsDefault2", tests, "|" + $allowspecialcheckbox.checked + "|");
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
        if (logging) console.log("resetState clear form");
        await clearForm();
        if (logging) console.log("resetState clear storage");
        await chrome.storage.sync.clear();
        if (logging) console.log("resetState storage cleared", await chrome.storage.sync.get());
        return new Promise((resolve, reject) => {
            if (logging) console.log("resetState send reset message");
            chrome.runtime.sendMessage({"cmd": "reset"}, async (response) => {
                if (chrome.runtime.lastError) {
                    if (logging) console.error("resetState reset message error", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    if (logging) console.log("resetState reset message response", response);
                    resolve(response);
                }
            });
        });
    }
    async function triggerEvent(event, element) {
        return new Promise((resolve, _) => {
            let oldHandler = element[event];
            element.addEventListener(event, async (e) => {
                setTimeout(() => {
                    if (logging && element === $providesitepw) console.log("triggerEvent triggered", element.id, event, element.checked);
                    resolve();
                }, sleepTime);
            }, { once: true });
            element[event] = oldHandler;
            let e = new Event(event);
            element.dispatchEvent(e);
            if (logging && element === $providesitepw) console.log("triggerEvent trigger", element.id, event, element.checked);
        });
    }
    async function clearForm() {
        $domainname.value = "";
        $superpw.value = "";
        $sitename.value = "";
        $username.value = "";
        $sitepw.value = "";
        $providesitepw.checked = false;
        $settings.style.display = "none";
        await getsettings("");
    }
    async function fillForm(superpw, domainname, sitename, username) {
        if (logging) console.log("fillForm", superpw, domainname, sitename, username);
        $domainname.value = domainname;
        await triggerEvent("blur", $domainname);
        $superpw.value = superpw;
        await triggerEvent("keyup", $superpw);
        $sitename.value = sitename;
        await triggerEvent("keyup", $sitename);
        $username.value = username;
        await triggerEvent("keyup", $username);
       if (logging) console.log("fillForm", $domainname.value, $superpw.value, $sitename.value, $username.value);
    }
    async function forgetDomainname() {
        await triggerEvent("mouseover", $domainname3bluedots);
        await triggerEvent("click", $domainnamemenuforget);
        await triggerEvent("click", $forgetbutton);
    }
    async function forgetSitename() {
        await triggerEvent("mouseover", $sitename3bluedots);
        await triggerEvent("click", $sitenamemenuforget);
        await triggerEvent("click", $forgetbutton);
    }
    async function forgetUsername() {
        await triggerEvent("mouseover", $username3bluedots);
        await triggerEvent("click", $usernamemenuforget);
        await triggerEvent("click", $forgetbutton);
    }
    async function phishingSetup() {
        await clearForm();
        await resetState();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        await triggerEvent("mouseleave", $mainpanel);
        $domainname.value = "allantheguru.alanhkarp.com";
        $sitename.value = "Guru";
        await triggerEvent("blur", $sitename);    
    }
    async function forgetDomain(domainname) {
        await fillForm("", domainname, "", "");
        await triggerEvent("mouseover", $domainname3bluedots);
        await triggerEvent("click", $domainnamemenuforget);
        await triggerEvent("click", $forgetbutton);
        await sleep(sleepTime);
    }
    function get(id) {
        return document.getElementById(id);
    }
}