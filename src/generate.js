'use strict';
import { zxcvbnExport as zxcvbn } from "./zxcvbn.js";
import { Utf8Encode } from "./sha256.js";
import { config } from "./bg.js";

const logging = false;

export async function generatePassword(bg) {
    let settings = bg.settings;
    var n = normalize(settings.sitename || "");
    var u = normalize(settings.username || "");
    let m = bg.superpw;
    if (!m || !isConsistent(settings)) {
        return "";
    }
    let salt = n.toString() + '\t' + u.toString();
    let p = await computePassword(m, salt, settings);
    if (!settings.providesitepw) {
        settings.xor = xorStrings(p, p); // set to 0s
    }
    return p;
    function isConsistent(settings) {
        let total = 0
        if (settings.allowupper) total += settings.minupper - 0;
        if (settings.allowlower) total += settings.minlower - 0;
        if (settings.allownumber) total += settings.minnumber - 0;
        if (settings.allowspecial) total += settings.minspecial - 0;
        return total <= settings.pwlength;
    }
}
export function isSuperPw(superpw) {
    if (superpw) return "SuperPW";
    else return "No SuperPW";
}
async function computePassword(superpw, salt, settings) {
    if (!(settings.allowupper || settings.allowlower || settings.allownumber)) {
        return Promise.resolve("");
    }
    let args = {"pw": superpw, "salt": salt, "settings": settings, "iters": 200_000, "keysize": settings.pwlength * 8};
    let pw = await candidatePassword(args);
    // Find a valid password
    let iter = 0;
    let startIter = Date.now();
    while (iter < 200) {
        if (verifyPassword(pw, settings)) {
            if (logging) console.log("bg succeeded in", iter, "iterations and took", Date.now() - startIter, "ms");
            return pw;
        }
        iter++;
        args = {"pw": pw, "salt": salt, "settings": settings, "iters": 1, "keysize": settings.pwlength * 8};
        pw = await candidatePassword(args);
    }
    // Construct a legal password since hashing failed to produce one
    console.log("bg failed after", iter, "extra iteration and took", Date.now() - startIter, "ms, founds", pw);
    pw = uint2chars();
    return pw;
    function uint2chars() {
        let byteArray = new TextEncoder().encode(pw);
        let digits = config.digits;
        let upper = config.upper;
        let lower = config.lower;
        let specials = settings.specials;
        let cset = digits + upper + lower + specials;
        let chars = "";
        if (settings.startwithletter) {
            let alphabet = "";
            if (settings.allowupper) alphabet += upper;
            if (settings.allowlower) alphabet += lower;
            pickChars(1, byteArray, alphabet);
        }
        let firstIsUpper = settings.startwithletter && upper.includes(chars[0]) ? 1 : 0;
        let firstIsLower = settings.startwithletter && lower.includes(chars[0]) ? 1 : 0;
        if (settings.allowupper) pickChars(settings.minupper - firstIsUpper, byteArray.slice(chars.length), upper);
        if (settings.allowlower) pickChars(settings.minlower - firstIsLower, byteArray.slice(chars.length), lower);
        if (settings.allownumber) pickChars(settings.minnumber, byteArray.slice(chars.length), digits);
        if (settings.allowspecial) pickChars(settings.minspecial, byteArray.slice(chars.length), specials);
        let len = byteArray.length - chars.length;
        pickChars(len, byteArray.slice(chars.length), cset);
        // In case password must start with a letter
        if (settings.startwithletter) {
            chars = chars[0] + shuffle(chars.slice(1));
        } else {
            chars = shuffle(chars);
        }
        return chars;
        function pickChars(nchars, byteArray, cset) {
            for (let i = 0; i < nchars; i++) {
                chars += cset[byteArray[i] % cset.length];
            }
        }
        function shuffle(chars) {
            let currentIndex = chars.length, temporaryValue, randomIndex;
            let charsArray = chars.split("");
            // While there remain elements to shuffle...
            while (0 !== currentIndex) {                      
              // Pick a remaining element...
              randomIndex = byteArray[currentIndex] % charsArray.length;
              currentIndex -= 1;                      
              // And swap it with the current element.
              temporaryValue = charsArray[currentIndex];
              charsArray[currentIndex] = charsArray[randomIndex];
              charsArray[randomIndex] = temporaryValue;
            }
            chars = charsArray.join("");
            return chars;
          }                      
    }            
}
async function candidatePassword(args) {
    let superpw = args.pw;
    let salt = args.salt;
    let settings = args.settings;
    let iters = args.iters;
    let keysize = args.keysize;
    let payload = Utf8Encode(superpw);
    let passphrase = new TextEncoder().encode(payload);
    // Use Password Based Key Derivation Function because repeated iterations
    // don't weaken the result as much as repeated SHA-256 hashing.
    return crypto.subtle.importKey("raw", passphrase, { name: "PBKDF2" }, false, ["deriveBits"])
    .then(async (passphraseImported) => {
        let start = Date.now();
        return crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                hash: 'SHA-256',
                salt: new TextEncoder().encode(salt),
                iterations: iters
            },
            passphraseImported,
            keysize 
        )  
        .then((bits) => {
            const cset = characters(settings);
            if (logging && Date.now() - start > 2) console.log("deriveBits did", iters, "iterations in", Date.now() - start, "ms");
            let bytes = new Uint8Array(bits);
            // Convert the Uint32Array to a string using a custom algorithm               
            let pw = uint2chars(bytes.slice(0, settings.pwlength*8), cset).substring(0, settings.pwlength);
            return pw;
            function uint2chars(array) {
                let chars = "";
                let len = array.length;
                for (let i = 0; i < len; i++) {
                    chars += cset[array[i] % cset.length];
                }
                return chars;
            }            
    }); 
    });
}
function verifyPassword(pw, settings) {
    let report = zxcvbn(pw);
    if ((pw.length >= 12 && report.score < 4) ||
        (pw.length >= 10 && pw.length < 12 && report.score < 3) ||
        (pw.length >= 8 && pw.length < 10 && report.score < 2) ||
        (pw.length < 8 && report.score < 1)) return false;
    let counts = { lower: 0, upper: 0, number: 0, special: 0 };
    for (let i = 0; i < pw.length; i++) {
        let c = pw.substring(i, i + 1);
        if (-1 < config.lower.indexOf(c)) counts.lower++;
        if (-1 < config.upper.indexOf(c)) counts.upper++;
        if (-1 < config.digits.indexOf(c)) counts.number++;
        if (-1 < settings.specials.indexOf(c)) counts.special++;
    }
    let valOK = true;
    if (settings.startwithletter) {
        let start = pw.substring(0, 1).toLowerCase();
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
export function characters(settings) {
    // generate a set of no more than 256 characters for encoding
    let chars = "";
    if (settings.allownumber) {
        chars += config.digits;
    }
    if (settings.allowupper) {
        chars += config.upper;
    }
    if (settings.allowlower) {
        chars += config.lower;
    }
    if (settings.allowspecial) {
        chars += settings.specials;
        while (chars.length < 5) {
            chars += settings.specials;
        }
    }
    return chars.substring(0, 256); // substring just in case...
}
export function normalize(name) {
    if (name) {
        try {
            return name.trim().toLowerCase();
        } catch (e) {
            console.log(e);
        }
    }
    return "";
}
export function xorStrings(provided, sitepw) {
    let b = sitepw;
    // Make the strings equal length
    while (sitepw.length > 0 && provided.length > b.length) {
        b += sitepw;
    } // b.length >= a.length
    b = b.substring(0, provided.length); // b.length === provided.length
    let result = [];
    for (let i = 0; i < provided.length; i++) {
      result.push(provided.charCodeAt(i) ^ b.charCodeAt(i));
    }
    return result;
}
export function stringXorArray(sitepw, array) {
    if (!sitepw) return "";
    let b = sitepw;
    while (array.length > b.length) {
        b += sitepw;
    }
    b = b.substring(0, array.length);
    let a = string2array(b);
    for (let i = 0; i < array.length; i++) {
        a[i] = a[i] ^ array[i];
    }
    let result = array2string(a);
    return result;
}
export function string2array(str) {
    if (typeof str !== "string") return str;
    let array = [];
    for (let i = 0; i < str.length; i++) {
        array.push(str[i].charCodeAt());
    }
    return array;
}
export function array2string(array) {
    if (typeof array !== "string") return array;
    let str = "";
    for (let i = 0; i < array.length; i++) {
        str += String.fromCharCode(array[i]);
    }
    return str;
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