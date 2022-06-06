// Content script for ssp
'use strict';
var hideLabels = true; // Make it easy to turn off label hiding
var clickSitePassword = "Click SitePassword";
var clickHere = "Click here for password";
var pasteHere = "Paste your password here";
var sitepw = "";
var userid = "";
var cpi = { count: 0, pwfields: [], idfield: null };
var readyForClick = false;
var mutationObserver;
var mutationMax = 10;
var setTimer = true;
var observerOptions = { // Start looking for updates again
	attrbutes: true,
	characterData: false,
	childList: true,
	subtree: true,
	attributeOldValue: true,
	characterDataOldValue: false
};
var start = Date.now();
console.log(document.URL, Date.now() - start, "findpw ready state", document.readyState);
if (document.readyState !== "loading") {
	startup();
} else {
	document.onload = startup();
}
function startup() {
	console.log(document.URL, Date.now() - start, "findpw running");
	mutationObserver = new MutationObserver(function (mutations) {
		// Find password field if added late or fill in again if userid and/or password fields were cleared
		console.log(document.URL, Date.now() - start, "findpw DOM changed", cpi, mutationMax, mutations);
		if (mutationMax === 0) { // Give up after a while
			if (setTimer) {
				setTimer = false;
				setTimeout(() => { // but try again after a while
					mutationMax = 10;
					setTimer = true;
				}, 500);
			}
		} else {
			mutationMax = mutationMax - 1;
			console.log(document.URL, Date.now() - start, "findpw calling countpwid from mutation observer");
			cpi = countpwid();
			sendpageinfo(cpi, false, true);
			if (userid) { // In case the mutations took away my changes
				fillfield(cpi.idfield, userid);
				fillfield(cpi.pwfields[0], sitepw);
				setPlaceholder(userid);
				// What about second password field?
			}
		}
	});
	mutationObserver.observe(document.body, observerOptions);
	console.log(document.URL, Date.now() - start, "findpw calling countpwid from onload");
	cpi = countpwid();
	sendpageinfo(cpi, false, true);
	chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
		console.log(document.URL, Date.now() - start, "findpw calling countpwid from listener"); 
		readyForClick = request.readyForClick;
		switch (request.cmd) {
			case "fillfields":
				userid = request.u;
				fillfield(cpi.idfield, userid);
				setPlaceholder(userid);
				break;
			case "forget":
				mutationObserver.disconnect();
				cpi.idfield.value = "";
				cpi.pwfields[0].value = "";
				cpi.pwfields[0].placeholder = clickSitePassword;
				if (cpi.pwfields[1]) {
					cpi.pwfields[1].value = "";
					cpi.pwfields[1].placeholder = "";
				}
				mutationObserver.observe(document.body, observerOptions);
				break;
			default:
				console.log(document.URL, Date.now() - start, "findpw unexpected message", request);
		}
		return true;
	});
}
let observeMutation =
	// Some sites change the page contents based on the fragment
	window.addEventListener("hashchange", (_href) => {
		console.log(document.URL, Date.now() - start, "findpw calling countpwid from hash change listener");
		cpi = countpwid();
	});
function fillfield(field, text) {
	// Don't change to the same value to avoid mutationObserver cycling
	if (field && text && (field.value !== text)) {
		// Don't trigger observer for these updates since observer.disconnect()
		// doesn't work inside the observer callback
		console.log(document.URL, Date.now() - start, "findpw fillfield value text", field.value, text);
		mutationObserver.disconnect();
		field.value = text.trim();
		fixfield(field, text.trim());
		mutationObserver.observe(document.body, observerOptions);
	}
}
// Some pages don't know the field has been updated
function fixfield(field, text) {
	// Maybe I just need to tell the page that the field changed
	makeEvent(field, "change");
	makeEvent(field, "onchange");
	makeEvent(field, "input");
	makeEvent(field, "HTMLEvents");
	makeEvent(field, "keydown");
	makeEvent(field, "keypress");
	makeEvent(field, "keyup");
	// Is there a better test for telling if the page knows the value has been set?
	console.log(document.URL, Date.now() - start, "findpw focus test", field.value, text);
}
// Sometimes the page doesn't know that the value is set until an event is triggered
function makeEvent(field, type) {
	let event = new Event(type, { bubbles: true, view: window, cancelable: true });
	field.dispatchEvent(event);
}
function sendpageinfo(cpi, clicked, onload) {
	// No need to send page info if no password fields found.  User will have to open
	// the popup, which will supply the needed data
	if (cpi.pwfields.length === 0) return;
	console.log(document.URL, Date.now() - start, "findpw sending page info: pwcount = ", cpi.pwfields.length);
	chrome.runtime.sendMessage({
		"count": cpi.pwfields.length,
		"clicked": clicked,
		"onload": onload
	}, (response) => {
		if (chrome.runtime.lastError) console.log(document.URL, Date.now() - start, "findpw error", chrome.runtime.lastError);
		console.log(document.URL, Date.now() - start, "findpw response", response);
		readyForClick = response.readyForClick;
		userid = response.u;
		fillfield(cpi.idfield, userid);
		setPlaceholder(userid, response.p);
		if (userid) fillfield(cpi.pwfield, "");
	});
}
function setPlaceholder(userid) {
	console.log(document.URL, Date.now() - start, "findpw setPlaceholder 1:", userid, readyForClick, cpi.pwfields);
	mutationObserver.disconnect(); // Don't trigger observer for these updates
	// Don't change to the same value to avoid mutationObserver cycling
	if (cpi.pwfields[0] && readyForClick && userid && cpi.pwfields[0].placeholder !== clickHere) {
		cpi.pwfields[0].placeholder = clickHere;
		cpi.pwfields[0].ariaPlaceholder = clickHere;
		cpi.pwfields[0].title = clickHere;
		if (cpi.pwfields[1]) {
			cpi.pwfields[1].placeholder = clickHere;
			cpi.pwfields[1].ariaPlaceholder = clickHere;
			cpi.pwfields[1].title = clickHere;
			clearLabel(cpi.pwfields[1])
		}
		if (userid) clearLabel(cpi.idfield);
		clearLabel(cpi.pwfields[0]);
		clearLabel(cpi.pwfields[1]);
	} else if (cpi.pwfields[0] &&
		cpi.pwfields[0].placeholder !== clickHere &&
		cpi.pwfields[0].placeholder !== clickSitePassword) {
		cpi.pwfields[0].placeholder = clickSitePassword;
		cpi.pwfields[0].ariaPlaceholder = clickSitePassword;
		cpi.pwfields[0].title = clickSitePassword;
		if (userid) clearLabel(cpi.idfield);
		clearLabel(cpi.pwfields[0]);
		clearLabel(cpi.pwfields[1])
	}
	mutationObserver.observe(document.body, observerOptions);
}
function pwfieldOnclick() {
	console.log(document.URL, Date.now() - start, "findpw 3: get sitepass");
	mutationObserver.disconnect();
	if ((!this.placeholder) || this.placeholder === clickHere) {
		chrome.runtime.sendMessage({ "cmd": "getPassword" }, (response) => {
			sitepw = response;
			fillfield(this, response);
			console.log(document.URL, Date.now() - start, "findpw 4: got password", this, response);
		});
	} else {
		// Because people don't always pay attention
		if (!this.placeholder || this.placeholder === clickSitePassword) alert(clickSitePassword);
	}
	mutationObserver.observe(document.body, observerOptions);
}
function putOnClipboard(pwfield, password) {
	mutationObserver.disconnect(); // Don't trigger observer for these updates
	navigator.clipboard.writeText(password);
	if (pwfield) {
		if (readyForClick) {
			pwfield.placeholder = pasteHere;
			pwfield.ariaPlaceholder = pasteHere;
		} else {
			pwfield.placeholder = clickSitePassword;
			pwfield.ariaPlaceholder = clickSitePassword
		}
		setTimeout(function () {
			navigator.clipboard.writeText("");
			pwfield.placeholder = clickSitePassword;
			pwfield.ariaPlaceholder = clickSitePassword
		}, 30000);
	}
	mutationObserver.observe(document.body, observerOptions);
}
function countpwid() {
	var useridfield = null;
	var visible = true;
	var pwfields = [];
	var found = -1;
	var c = 0;
	let inputs = document.getElementsByTagName("input");
	if (cpi.pwfields.length === 0 && inputs.length === 0) inputs = searchShadowRoots(document.body);
	for (var i = 0; i < inputs.length; i++) {
		if (inputs[i].type && (inputs[i].type.toLowerCase() == "password")) {
			visible = !isHidden(inputs[i]);
			console.log(document.URL, Date.now() - start, "findpw found password field", i, inputs[i], visible);
			if (visible) {
				pwfields.push(inputs[i]);
				c++;
				if (c === 1) found = i;
				mutationObserver.disconnect(); // Don't trigger observer for this update
				inputs[i].onclick = pwfieldOnclick;
				mutationObserver.observe(document.body, observerOptions);
			}
			if (c > 2) break; // Use only the first two password fields
		}
	}
	if (c > 0) {
		for (var i = found - 1; i >= 0; i--) {
			// Skip over invisible input fields above the password field
			visible = !isHidden(inputs[i]);
			if (visible && (inputs[i].type == "text" || inputs[i].type == "email")) {
				useridfield = inputs[i];
				break;
			}
		}
	}
	console.log(document.URL, Date.now() - start, "findpw: countpwid", c, pwfields, useridfield);
	return { pwfields: pwfields, idfield: useridfield, };
}
// From Domi at https://stackoverflow.com/questions/38701803/how-to-get-element-in-user-agent-shadow-root-with-javascript
function searchShadowRoots(element) {
	return;
	let shadows = Array.from(element.querySelectorAll('*'))
		.map(el => el.shadowRoot).filter(Boolean);	
	let childResults = shadows.map(child => searchShadowRoots(child));
	let result = Array.from(element.querySelectorAll("input"));
	return result.concat(childResults).flat();
}
function clearLabel(field) {
	if (!field || !hideLabels) return;
	mutationObserver.disconnect(); // Don't trigger observer for these updates
	let labels = Array.from(document.querySelectorAll("label, [for]"));
	for (let i = 0; i < labels.length; i++) {
		let target = labels[i].getAttribute("for");
		if (target && field && (target === field.id || target === field.name || target === field.ariaLabel)) {
			if (overlaps(field, labels[i]) && field.style.visibility !== "visible") {
				field.style.visibility = "visible";
				labels[i].style.visibility = "hidden";
				if (isHidden(field)) labels[i].style.visibility = "visible";
				// Could break here if performance becomes a problem
			}
		}
	}
	mutationObserver.observe(document.body, observerOptions);
}
function isHidden(field) {
	let hidden =
		(window.getComputedStyle(field).display === 'none') ||
		(field.offsetParent === null) ||
		(field.ariaHidden === "true");
	return hidden;
}
function overlaps(field, label) {
	// Only worry about labels above or to the left of the field
	let floc = field.getBoundingClientRect();
	let lloc = label.getBoundingClientRect();
	if (floc.top >= lloc.bottom) return false;
	if (floc.left >= lloc.right) return false;
	return true;
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