import { reset as resetssp } from "./ssp.js";
export async function runTests() {
    const sleepTime = 100;
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
    if (!restart) {
        testCalculation().then(() => {
            testRememberForm().then(() => {
                testProvidedpw().then(() => {
                    testPhishing().then(() => {
                        testForget().then(() => {
                            //testSaveAsDefault();
                            console.log("Tests complete: " + passed + " passed, " + failed + " failed");
                        });
                    });
                });

            });
        });
    } else {
        if (restart === "testSaveAsDefault2") {
            testSaveAsDefault2();
        } else {
            console.error("Unknown test", restart);
        }
        debugger;
    }
    // Test password calculation
    async function testCalculation() {
        await resetState();
        let test = !$providesitepw.checked;
        if (test) {
            console.log("Passed: Calculation provide site pw correct");
            passed += 1;
        } else {
            console.warn("Failed: Calculation rovide site pw incorrect, should not be checked");
            failed += 1;
        }
        const expected = "to3X9g55EK8C";
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        await sleep(sleepTime);
        let actual = $sitepw.value;
        test = actual === expected;
        if (test) {
            console.log("Passed: Calculation")
            passed += 1;
        } else {
            console.warn("Failed: Calculation", expected, "|" + actual + "|");
            failed += 1;
        }
    }
    async function testRememberForm() {
        await resetState();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        clearForm();
        // See if it remembers
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        $domainname.onblur();
        await sleep(sleepTime);
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
        const sitepw = "MyStrongPassword";
        await resetState();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        get("settings").style.display = "block";
        $providesitepw.click();
        $sitepw.value = sitepw;
        $sitepw.onkeyup();
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        // See if it remembers
        clearForm();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        $domainname.onblur();
        await sleep(sleepTime);
        let test = $sitepw.value === sitepw
        if (test) {
            console.log("Passed: Provide pw");
            passed += 1;
        } else {
            console.warn("Failed: Provide pw", sitepw, "|" + $sitepw.value + "|");
            failed += 1;
        }
    }
    // Test forget
    async function testForget() {
        await resetState();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        await forgetDomainname();
        // See if it forgot
        clearForm();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        $domainname.onblur();
        await sleep(sleepTime);
        let test = $sitename.value === "" && $username.value === "";
        if (test) {
            console.log("Passed: Forget by domain name");
            passed += 1;
        } else {
            console.warn("Failed: Forget by domain name");
            failed += 1;
        }
        // See if database still has site name if it should
        phishingSetup();
        await sleep(sleepTime);
        $warningbutton.onclick();
        await sleep(sleepTime);
        await forgetDomainname();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        $domainname.onblur();
        await sleep(sleepTime);
        test = $sitename.value === "" && $username.value === "";
        if (test) {
            console.log("Passed: Forget site name when it should");
            passed += 1;
        } else {
            console.warn("Failed: Forget site name when it should");
            failed += 1;
        }
        // See if forget by site name works
        phishingSetup();
        await sleep(sleepTime);
        $warningbutton.onclick(); // Now I have two domain names pointing to the same site name
        $sitename3bluedots.onmouseover();
        $sitenamemenuforget.onclick();
        $forgetbutton.onclick();
        await sleep(sleepTime);
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        $domainname.onblur();
        await sleep(sleepTime);
        test = $sitename.value === "" && $username.value === "";
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        $domainname.onblur();
        await sleep(sleepTime);
        test = test && $sitename.value === "" && $username.value === "";
        if (test) {
            console.log("Passed: Forget by site name");
            passed += 1;
        } else {
            console.warn("Failed: Forget by site name");
            failed += 1;
        }
        // See if forget by username works
        phishingSetup();
        await sleep(sleepTime);
        $warningbutton.onclick(); // Now I have two domain names pointing to the same site name
        $username3bluedots.onmouseover();
        $usernamemenuforget.onclick();
        $forgetbutton.onclick();
        await sleep(sleepTime);
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        $domainname.onblur();
        await sleep(sleepTime);
        test = $sitename.value === "" && $username.value === "";
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        $domainname.onblur();
        await sleep(sleepTime);
        test = test && $sitename.value === "" && $username.value === "";
        if (test) {
            console.log("Passed: Forget by username");
            passed += 1;
        } else {
            console.warn("Failed: Forget by username");
            failed += 1;
        } 
    }
    // Test phishing
    async function testPhishing() {
        await resetState();
        phishingSetup();
        await sleep(sleepTime);
        // Does warning appear?
        let test = $phishing.style.display === "block";
        if (test) {
            console.log("Passed: Phishing warning showing.");
            passed += 1;
        } else {
            console.warn("Failed: Phishing warning not showing.");
            failed += 1;
        }
        // Does warning go away leaving form cleared?
        $cancelwarning.onclick();
        test = $phishing.style.display === "none" && $sitename.value === "";
        if (test) {
            console.log("Passed: Phishing warning not showing.");
            passed += 1;
        } else {
            console.warn("Failed: Phishing warning not showing.");
            failed += 1;
        }
        // Does setting new site name work?
        phishingSetup();
        await sleep(sleepTime);
        $nicknamebutton.onclick();
        await sleep(sleepTime);
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
        phishingSetup();
        await sleep(sleepTime);
        $warningbutton.onclick();
        await sleep(sleepTime);
        test = $phishing.style.display === "none" && $sitename.value === "Guru";
        test = test && $username.value === "alan";
        if (test) {
            console.log("Passed: Phishing same account");
            passed += 1;
        } else {
            console.warn("Failed: Phishing same account");
            failed += 1;
        }
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        clearForm();
        await fillForm("", "allantheguru.alanhkarp.com", "", "");
        $domainname.onblur();
        await sleep(sleepTime);
        test = $sitename.value === "Guru" && $username.value === "alan";
            if (test) {
            console.log("Passed: Phishing remmbered same account");
            passed += 1;
        } else {    
            console.warn("Failed: Phishing remmbered same account");
            failed += 1;
        }
    }
    // Test save as default
    function testSaveAsDefault() {
        localStorage.restart = "testSaveAsDefault2";
        $pwlength.value = 15;
        $pwlength.onkeyup();
        $allowspecialcheckbox.click();
        $specials.value = "%^&";
        $specials.onkeyup();
        $makedefaultbutton.click();
        //chrome.runtime.reload();
    }
    function testSaveAsDefault2() {
        localStorage.restart = "";
        let tests = $pwlength.value === "15";
        tests = tests && $allowspecialcheckbox.checked;
        tests = tests && $specials.value === "%^&";
        if (tests) {
            console.log("Passed: Save as default");
            passed += 1;
        } else {
            console.warn("Failed: Save as default", "15", "|" + $pwlength.value + "|");
            failed += 1;
        }
        $pwlength.value = 12;
        $specials.value = "/!=@?._-";
        $specials.onkeyup();
        $allowspecialcheckbox.click();
        // Put things back the way they were
        $allowspecialcheckbox.click();
        $specials.value = "/!=@?._-";
        $pwlength.value = 12;
        $makedefaultbutton.click();
    }
    // Utility functions
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async function resetState() {
        clearForm();
        let reset = await chrome.runtime.sendMessage({"cmd": "reset"});
        if (chrome.runtime.lastError) console.log("test lastError", chrome.runtime.lastError);
        resetssp();
        await sleep(sleepTime);
    }
    async function fillForm(superpw, domainname, sitename, username) {
        clearForm();
        $domainname.value = domainname;
        $superpw.value = superpw;
        $superpw.onkeyup();
        $sitename.value = sitename;
        $sitename.onkeyup();
        $username.value = username;
        $username.onkeyup();
    }
    async function forgetDomainname() {
        $domainname3bluedots.onmouseover();
        $domainnamemenuforget.onclick();
        $forgetbutton.onclick();
        await sleep(sleepTime);
    }
    async function forgetSitename() {
        $sitename3bluedots.onmouseover();
        $sitenamemenuforget.onclick();
        $forgetbutton.onclick();
        await sleep(sleepTime);
    }
    async function forgetUsername() {
        $username3bluedots.onmouseover();
        $usernamemenuforget.onclick();
        $forgetbutton.onclick();
        await sleep(sleepTime);
    }
    async function phishingSetup() {
        clearForm();
        await fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        clearForm();
        $domainname.value = "allantheguru.alanhkarp.com";
        $sitename.value = "Guru";
        $sitename.onblur();    
    }
    async function forgetDomain(domainname) {
        await fillForm("", domainname, "", "");
        $domainname3bluedots.onmouseover();
        $domainnamemenuforget.onclick();
        $forgetbutton.onclick();
        await sleep(sleepTime);
    }
    function clearForm() {
        $domainname.value = "";
        $superpw.value = "";
        $sitename.value = "";
        $username.value = "";
        $sitepw.value = "";
        $superpw.onkeyup();
        $providesitepw.checked = false;
    }
    function get(id) {
        return document.getElementById(id);
    }
}