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
    
    let restart = localStorage.restart;
    if (restart) {
        console.log("Restarting test " + restart);
    } else {
        alert("Starting tests");
    }
    if (!restart) {
        await testCalculation();
        await testRememberForm();
        await testProvidedpw();
        await testForget();
        await testPhishing();
        //testSaveAsDefault();
        console.log("Tests complete");
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
        if ($providesitepw.checked) debugger;
        const expected = "to3X9g55EK8C";
        fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        let actual = $sitepw.value;
        if (actual === expected) {
            console.log("Passed: Test calculation")
        } else {
            console.warn("Failed: Test calculation", expected, "|" + actual + "|");
            debugger;
        }
    }
    async function testRememberForm() {
        await resetState();
        fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        clearForm();
        // See if it remembers
        $domainname.value = "alantheguru.alanhkarp.com";
        $domainname.onblur();
        await sleep(sleepTime);
        let tests = $sitename.value.trim().toLowerCase() === "guru";
        tests = tests && $username.value === "alan";
        if (tests) {
            console.log("Passed: Test remember form");
        } else {
            console.warn("Failed: Test remember form", "Guru", "alan", "|" + $sitename.value + "|");
            debugger;
        }
    }
    async function testProvidedpw() {
        const sitepw = "MyStrongPassword";
        await resetState();
        fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        get("settings").style.display = "block";
        $providesitepw.click();
        $sitepw.value = sitepw;
        $sitepw.onblur();
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        // See if it remembers
        clearForm();
        $superpw.value = "qwerty";
        $superpw.onkeyup();
        $domainname.value = "alantheguru.alanhkarp.com";
        $domainname.onblur();
        await sleep(sleepTime);
        if ($sitepw.value === sitepw) {
            console.log("Passed: Test provided pw");
        } else {
            console.warn("Failed: Test provided pw", sitepw, "|" + $sitepw.value + "|");
            debugger;
        }
        await sleep(sleepTime);
    }
    // Test forget
    async function testForget() {
        await resetState();
        fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        $domainname3bluedots.onmouseover();
        $domainnamemenuforget.onclick();
        $forgetbutton.onclick();
        // See if it forgot
        clearForm();
        fillForm("qwerty", "alantheguru.alanhkarp.com", "", "");
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        let test = $sitename.value === "" && $username.value === "";
        if (!test) {
            console.warn("Failed: Test forget when site name is supposed to be empty");
        }
        // See if database still has site name if it should
        // fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        // $mainpanel.onmouseleave();
        // await sleep(sleepTime);
        // phishingSetup();
        // await sleep(sleepTime);
        // $warningbutton.onclick();
        // $domainname3bluedots.onmouseover();
        // $domainnamemenuforget.onclick();
        // $forgetbutton.onclick();
        // await sleep(sleepTime);
        // db = JSON.parse(localStorage.SitePasswordDataTest);
        // test = test && !db.domains["allantheguru.alanhkarp.com"] && db.sites["guru"];
        // // See if forget by site name works
        // phishingSetup();
        // await sleep(sleepTime);
        // $warningbutton.onclick(); // Now I have two domain names pointing to the same site name
        // $sitename3bluedots.onmouseover();
        // $sitenamemenuforget.onclick();
        // $forgetbutton.onclick();
        // await sleep(sleepTime);
        // db = JSON.parse(localStorage.SitePasswordDataTest);
        // test = test && !db.domains["alantheguru.alanhkarp.com"] && !db.sites["guru"];
        // test = test && !db.domains["allantheguru.alanhkarp.com"];
        // // See if forget by username works
        // phishingSetup();
        // await sleep(sleepTime);
        // $warningbutton.onclick(); // Now I have two domain names pointing to the same site name
        // $username3bluedots.onmouseover();
        // $usernamemenuforget.onclick();
        // $forgetbutton.onclick();
        // await sleep(sleepTime);
        // db = JSON.parse(localStorage.SitePasswordDataTest);
        // test = test && !db.domains["alantheguru.alanhkarp.com"] && !db.sites["guru"];
        // test = test && !db.domains["allantheguru.alanhkarp.com"];
        if (test) {
            console.log("Passed: Test forget");
        } else {
            console.warn("Failed: Test forget");
            debugger;
        } 
    }
    // Test phishing
    async function testPhishing() {
        await resetState();
        phishingSetup();
        await sleep(sleepTime);
        // Does warning appear?
        let test = $phishing.style.display === "block";
        // Does warning go away leaving form cleared?
        $cancelwarning.onclick();
        test = test && $phishing.style.display === "none" && $sitename.value === "";
        if (!test) {
            console.warn("Failed: Test phishing: Warning not showing.");
            return;
        }
        // Does setting new site name work?
        phishingSetup();
        await sleep(sleepTime);
        $nicknamebutton.onclick();
        await sleep(sleepTime);
        test = test && $phishing.style.display === "none" && $sitename.value === "Guru" 
            && document.activeElement === $sitename;
        // Does same account option work?
        phishingSetup();
        await sleep(sleepTime);
        $warningbutton.onclick();
        test = test && $phishing.style.display === "none" && $sitename.value === "Guru";
        test = test && $username.value === "alan";
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        clearForm();
        fillForm("", "allantheguru.alanhkarp.com", "", "");
        $domainname.onblur();
        await sleep(sleepTime);
        test = test && $sitename.value === "Guru" && $username.value === "alan";
            if (test) {
            console.log("Passed: Test phishing");
        } else {    
            console.warn("Failed: Test phishing");
            debugger;
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
            console.log("Passed: Test save as default");
        } else {
            console.warn("Failed: Test save as default", "15", "|" + $pwlength.value + "|");
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
        $providesitepw.checked = false;
        forgetDomain("alantheguru.alanhkarp.com");
        await sleep(sleepTime);
        forgetDomain("allantheguru.alanhkarp.com");
        await sleep(sleepTime);
    }
    function fillForm(superpw, domainname, sitename, username) {
        clearForm();
        $domainname.value = domainname;
        $superpw.value = superpw;
        $superpw.onkeyup();
        $sitename.value = sitename;
        $sitename.onkeyup();
        $username.value = username;
        $username.onkeyup();
    }
    async function phishingSetup() {
        clearForm();
        fillForm("qwerty", "alantheguru.alanhkarp.com", "Guru", "alan");
        $mainpanel.onmouseleave();
        await sleep(sleepTime);
        clearForm();
        $domainname.value = "allantheguru.alanhkarp.com";
        $sitename.value = "Guru";
        $sitename.onblur();    
    }
    async function forgetDomain(domainname) {
        fillForm("", domainname, "", "");
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