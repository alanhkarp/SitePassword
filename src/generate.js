'use strict';
import { core_sha256, swap32, chrsz } from "./sha256.js";
import { Utf8Encode, str2binb, binl2b64 } from "./sha256.js";
export function generate(bg, hpSPG) {
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
    let p = compute(s, settings, hpSPG);
    return { p: p, r: pwcount };
}
function compute(s, settings, hpSPG) {
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
        if (verify(sitePassword, settings, hpSPG)) break;
        iter++;
        if (iter >= hpSPG.maxiter) {
            sitePassword = "";
        }
    }
    return sitePassword;
}
function verify(p, settings, hpSPG) {
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
export function characters(settings, hpSPG) {
    let chars = hpSPG.lower + hpSPG.upper + hpSPG.digits + hpSPG.lower.substr(0, 2);
    if (settings.allowspecial) {
        if (bg.legacy) {
            // Use for AntiPhishing Toolbar passwords
            chars = chars.substr(0, 32) + settings.specials.substr(1) + chars.substr(31 + settings.specials.length);
        } else {
            // Use for SitePassword passwords
            chars = settings.specials + hpSPG.lower.substr(settings.specials.length - 2) + hpSPG.upper + hpSPG.digits;
        }
    }
    if (!settings.allowlower) chars = chars.toUpperCase();
    if (!settings.allowupper) chars = chars.toLowerCase();
    if (!(settings.allowlower || settings.allowupper)) {
        chars = hpSPG.digits + hpSPG.digits + hpSPG.digits +
            hpSPG.digits + hpSPG.digits + hpSPG.digits;
        if (settings.allowspecials) {
            chars = chars + persona.specials.substr(0, 4);
        } else {
            chars = chars + hpSPG.digits.substr(0, 4);
        }
    }
    return chars;
}