// To run the tests, set testMode to true in bg.js and reload 
// the extension.  Then open any https page, e.g., https://alanhkarp.com. 
// Right click on the SitePassword icon and select "Inspect".  You will 
// see an alert "Starting tests".  Click OK and check the console for results.

import { reset as resetssp } from "./ssp.js";
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
    const sleepTime = 200;
    let delay = 0;
    if (!restart) {
        testCalculation(); 
        setTimeout(() => {
            console.log("main slept", delay + sleepTime);
            testRememberForm();
            setTimeout(() => {
            //     console.log("main slept", delay + sleepTime);
            //     testProvidedpw();
            //         setTimeout(() => {
            //             console.log("main slept", delay + sleepTime);
            //             //         testPhishing().then(() => {
            //             //             testForget().then(() => {
            //             //                 //testSaveAsDefault();
            //             //                   console.log("Tests complete: " + passed + " passed, " + failed + " failed");
            //             //             });
                console.log("Tests complete: " + passed + " passed, " + failed + " failed");
            //         }, delay + sleepTime);
            }, delay + sleepTime);
        }, delay + sleepTime);
    } else {
        if (restart === "testSaveAsDefault2") {
            testSaveAsDefault2();
        } else {
            console.error("Unknown test", restart);
        }
    }
    // Test password calculation
    function testCalculation() {
        delay = 3*sleepTime;
        //console.log("testCalculation", delay);
        resetState();
        //console.log("testCalculation state reset");
        setTimeout(() => {
            //console.log("testCalculation slept", sleepTime);
            const expected = "UG1qIyn6mSuJ";
            fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
            $superpw.onblur();
            //console.log("testCalculation form filled", $sitename.value, $username.value);
            setTimeout(() => {
                //console.log("testCalculation filled form slept", sleepTime, $sitename.value, $username.value);
                let actual = $sitepw.value;
                if (actual === expected) {
                    console.log("Passed: Calculation", delay);
                    passed += 1;
                } else {
                    let inputs = {"expected": expected, "actual": actual, "superpw": $superpw.value, "sitename": $sitename.value, "username": $username.value};
                    console.warn("Failed: Calculation", delay, inputs);
                    failed += 1;
                }
            }, 2*sleepTime);
        }, sleepTime);
    }
    async function testRememberForm() {
        delay = 4*sleepTime;
        console.log("testRememberForm", delay);
        resetState();
        setTimeout(() => {
            //console.log("testRememberForm state reset slept", sleepTime);
            fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
            $mainpanel.onmouseleave();
            //console.log("testRememberForm filled form", $sitename.value, $username.value);
            setTimeout(() => {
                //console.log("testRememberForm slept", $sitename.value, $username.value, sleepTime);
                // See if it remembers
                resetState();
                setTimeout(() => {  
                    //console.log("testRememberForm reset state slept", sleepTime, $sitename.value, $username.value);                  
                    // See if it remembers
                    fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
                    $domainname.onblur();
                    setTimeout(() => {
                        //console.log("testRememberForm filled form slept", sleepTime, $sitename.value, $username.value);
                        let tests = $sitename.value === "Guru";
                        tests = tests && $username.value === "alan";
                        if (tests) {
                            console.log("Passed: Remember form");
                            passed += 1;
                        } else {
                            console.warn("Failed: Remember form", "Guru", "alan", "|" + $sitename.value + "|");
                            failed += 1;
                        }
                    }, sleepTime);
                }, sleepTime);
            }, sleepTime);
        }, sleepTime);
    }
    async function testProvidedpw() {
        delay = 8*sleepTime;
        console.log("testProvidedpw", delay);
        const expected = "MyStrongPassword";
        resetState();
        console.log("testProvidedpw state reset");
        setTimeout(() => {
            console.log("testProvidedpw state reset slept", sleepTime);
            fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
            get("settings").style.display = "block";
            if ($providesitepw.disabled) {
                console.warn("Failed: Provide pw disabled");
                failed += 1;
                return;
            }
            $providesitepw.click();
            $sitepw.value = expected;
            $sitepw.onblur();
            setTimeout(() => {
                console.log("testProvidedpw pw set slept", sleepTime);
                $mainpanel.onmouseleave();
                setTimeout(() => {
                    // See if it remembers
                    clearForm();
                    fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
                    $domainname.onblur();
                    setTimeout(() => {
                        console.log("testProvidedpw filled form slept", sleepTime);
                        let test = $sitepw.value === expected
                        if (test) {
                            console.log("Passed: Provide pw");
                            passed += 1;
                        } else {
                            console.warn("Failed: Provide pw", expected, "|" + $sitepw.value + "|");
                            failed += 1;
                        }
                    }, 2*sleepTime);
                }, 2*sleepTime);
            }, 2*sleepTime);
        }, 2*sleepTime);
    }
    // Test phishing
    async function testPhishing() {
        await resetState();
        await phishingSetup();
        await sleep(sleepTime);
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
        $cancelwarning.onclick();
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
        await phishingSetup();
        await sleep(sleepTime);
        $warningbutton.onclick();
        await sleep(sleepTime);
        $mainpanel.onmouseleave();
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
        await phishingSetup();
        await sleep(sleepTime);
        $warningbutton.onclick();
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        await forgetDomainname();
        await fillForm("qwerty", "allantheguru.alanhkarp.com", "", "");
        $domainname.onblur();
        await sleep(sleepTime);
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
        await phishingSetup();
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

    // Event handlers always return "undefined" immediately, which means
    // I can't "awati" them.  Instead, I sleep long enough that the funtion 
    // should have completed.  Change the value of sleepTime if I guessed wrong.
    async function sleep(ms) {
        return new Promise((resolve) => 
            setTimeout(resolve, ms),
        (reject) => console.error("sleep rejected", reject));
    }
    // I want to start with a clean slate for each set of tests.
    async function resetState() {
        // console.log("resetState");
        clearForm();
        setTimeout(() => {
            chrome.runtime.sendMessage("reset", response => {
                if (chrome.runtime.lastError) {
                    console.log("test send reset msg", chrome.runtime.lastError);
                }
            });
            setTimeout(() => {
                resetssp();
            }, sleepTime);
        }, sleepTime);        
    }
    function clearForm() {
        $domainname.value = "";
        $superpw.value = "";
        $sitename.value = "";
        $username.value = "";
        $sitepw.value = "";
        $providesitepw.checked = false;
        $settings.style.display = "none";
    }
    async function fillForm(superpw, domainname, sitename, username) {
        //console.log("fillForm", superpw, domainname, sitename, username);
        clearForm();
        $superpw.value = superpw;
        $superpw.onblur();
        $domainname.value = domainname;
        $sitename.value = sitename;
        $sitename.onblur();
        $username.value = username;
        $username.onblur();
        //console.log("fillForm done", $sitename.value, $username.value);
       // For some reason testprovidesitepw does not work without this line
        // await sleep(sleepTime);
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
        await resetState();
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
    function get(id) {
        return document.getElementById(id);
    }
}