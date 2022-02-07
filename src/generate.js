'use strict';
import {core_sha256, swap32, chrsz} from "./sha256.js";
import {Utf8Encode, str2binb, binl2b64} from "./sha256.js";
export function generate(bg) {
    let settings = bg.settings;
    let pwcount = bg.pwcount;
    if (bg.legacy) {
        var n = settings.sitename;
        var u = settings.username;
    } else {
        var n = settings.sitename.toLowerCase().trim();
        var u = settings.username.toLowerCase().trim();
    }
    let m = bg.masterpw;
    if (!m) {
        return { p: "", r: pwcount };
    }
    let s = n.toString() + u.toString() + m.toString();
    let p = compute(s, settings, bg);
    console.log("generate p", p);
    if ((pwcount == 1) && u && n && m) {
        console.log("ssp sending blank password to tab");
        chrome.tabs.sendMessage(bg.activetab.id, { cmd: "fillfields", "u": u, "p": "" });
    }
    return { p: p, r: pwcount };
}
function compute(s, settings, bg) {
    let hpSPG = bg.hpSPG;
    s = Utf8Encode(s);
    let h = core_sha256(str2binb(s), s.length * chrsz);
    let iter;
    for (iter = 1; iter < hpSPG.miniter; iter++) {
        h = core_sha256(h, 16 * chrsz);
    }
    // let ok = false;
    let sitePassword;
    while (iter < hpSPG.maxiter) {
        h = core_sha256(h, 16 * chrsz);
        let hswap = Array(h.length);
        for (let i = 0; i < h.length; i++) {
            hswap[i] = swap32(h[i]);
        }
        sitePassword = binl2b64(hswap, settings.characters).substring(0, settings.length);
        if (verify(sitePassword, settings, bg)) break;
        iter++;
        if (iter >= hpSPG.maxiter) {
            sitePassword = "";
        }
    }
    return sitePassword;
}
function verify(p, settings, bg) {
    let hpSPG = bg.hpSPG;
    let counts = { lower: 0, upper: 0, number: 0, special: 0 };
    for (let i = 0; i < p.length; i++) {
        let c = p.substr(i, 1);
        if (-1 < hpSPG.lower.indexOf(c)) counts.lower++;
        if (-1 < hpSPG.upper.indexOf(c)) counts.upper++;
        if (-1 < hpSPG.digits.indexOf(c)) counts.number++;
        if (-1 < settings.specials.indexOf(c)) counts.special++;
    }
    let valOK = true;
    if (settings.startwithletter) {
        let start = p.substr(0, 1).toLowerCase();
        valOK = valOK && -1 < hpSPG.lower.indexOf(start);
    }
    if (settings.allowlower) valOK = valOK && (counts.lower >= settings.minlower)
    if (settings.allowupper) {
        valOK = valOK && (counts.upper >= settings.minupper)
    } else {
        valOK = valOK && (counts.upper == 0);
    }
    if (settings.allownumber) {
        valOK = valOK && (counts.number >= settings.minnumber);
    } else {
        valOK = valOK && (counts.number == 0);
    }
    if (settings.allowspecial) {
        valOK = valOK && (counts.special >= settings.minspecial);
    } else {
        valOK = valOK && (counts.special == 0);
    }
    return valOK;
}
