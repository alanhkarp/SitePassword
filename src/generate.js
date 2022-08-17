'use strict';
import { core_sha256, swap32, chrsz } from "./sha256.js";
import { Utf8Encode, str2binb, binl2b64 } from "./sha256.js";
import { config } from "./bg.js";
export function generate(bg) {
    let settings = bg.settings;
    var n = settings.sitename.toLowerCase().trim();
    var u = settings.username.toLowerCase().trim();
    let m = bg.masterpw;
    if (!m) {
        return "";
    }
    let s = n.toString() + '\t' + u.toString() + '\t' + m.toString();
    let p = compute(s, settings);
    return p;
}
export function isMasterPw(masterpw) {
    if (masterpw) return "MasterPW";
    else return "No MasterPW";
}
function compute(s, settings) {
    s = Utf8Encode(s);
    let h = core_sha256(str2binb(s), s.length * chrsz);
    let iter;
    for (iter = 1; iter < config.miniter; iter++) {
        h = core_sha256(h, 16 * chrsz);
    }
    // let ok = false;
    let sitePassword;
    while (iter < config.maxiter) {
        h = core_sha256(h, 16 * chrsz);
        let hswap = Array(h.length);
        for (let i = 0; i < h.length; i++) {
            hswap[i] = swap32(h[i]);
        }
        let chars = characters(settings);
        sitePassword = binl2b64(hswap, chars).substring(0, settings.length);
        if (verify(sitePassword, settings)) break;
        iter++;
        if (iter >= config.maxiter) {
            sitePassword = "";
        }
    }
    return sitePassword;
}
function verify(p, settings) {
    let counts = { lower: 0, upper: 0, number: 0, special: 0 };
    for (let i = 0; i < p.length; i++) {
        let c = p.substring(i, i+1);
        if (-1 < config.lower.indexOf(c)) counts.lower++;
        if (-1 < config.upper.indexOf(c)) counts.upper++;
        if (-1 < config.digits.indexOf(c)) counts.number++;
        if (-1 < settings.specials.indexOf(c)) counts.special++;
    }
    let valOK = true;
    if (settings.startwithletter) {
        let start = p.substring(0, 1).toLowerCase();
        valOK = valOK && -1 < config.lower.indexOf(start);
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
export function characters(settings) {
    // generate a set of 64 characters for encoding
    let chars = "";
    if (settings.allowspecial) {
        chars += settings.specials;
    }
    if (settings.allownumber) {
        chars += config.digits;
    }
    if (settings.allowupper) {
        chars += config.upper;
    }
    if (settings.allowlower) {
        chars += config.lower;
    }
    while ((chars.length > 0) && (chars.length < 64)) {
        chars += chars;
    }
    return chars;
}
/* 
This code is a major modification of the code released with the
following licence.  Neither Hewlett-Packard Company nor Hewlett-Packard
Enterprise were involved in the modification.  This source code is
available at https://github.com/alanhkarp/SitePassword.

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