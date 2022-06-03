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
        let chars = characters(settings, hpSPG);
        sitePassword = binl2b64(hswap, chars).substring(0, settings.length);
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
// The computation assumes there are 64 characters to choose from
export function characters(settings, hpSPG) {
    let chars = hpSPG.lower + hpSPG.upper + hpSPG.digits + hpSPG.lower.substr(0, 2);
    if (settings.allowspecial) {
        if (settings.legacy) {
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
            chars = chars + settings.specials.substr(0, 4);
        } else {
            chars = chars + hpSPG.digits.substr(0, 4);
        }
    }
    return chars;
}
/* 
Copyright 2011 Hewlett-Packard Company. This library is free software;
you can redistribute it and/or modify it under the terms of the GNU
Lesser General Public License (LGPL) as published by the Free Software
Foundation; either version 2.1 of the License, or (at your option) any
later version. This library is distributed in the hope that it will
be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
Lesser General Public License for more details. You should have
received a copy of the GNU Lesser General Public License (LGPL) along
with this library; if not, write to the Free Software Foundation,
Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
Please contact the Hewlett-Packard Company <www.hp.com> for
information regarding how to obtain the source code for this library.
*/