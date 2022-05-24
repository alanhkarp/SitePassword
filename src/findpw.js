// Content script for ssp
'use strict';
var clickSitePassword = "Click SitePassword";
var clickHere = "Click here for password";
var pasteHere = "Paste your password here";
var pwfields = [];
var sitepw = "";
var userid = "";
var cpi = { count: 0, pwfield: null, idfield: null };
var readyForClick = false;
var mutationObserver;
var mutationMax = 30;
var observerOptions = { // Start looking for updates again
	attrbutes: true,
	characterData: false,
	childList: true,
	subtree: true,
	attributeOldValue: true,
	characterDataOldValue: false
};
var start = Date.now();
console.log(document.URL, Date.now() - start, "findpw loaded");
window.onload = function () {
	console.log(document.URL, Date.now() - start, "findpw running");
	mutationObserver = new MutationObserver(function (mutations) {
		// Find password field if added late or fill in again if userid and/or password fields were cleared
		console.log(document.URL, Date.now() - start, "findpw DOM changed", cpi, mutationMax, mutations);
		if (mutationMax === 0) return; // Give up after a while
		mutationMax = mutationMax - 1;
		cpi = countpwid();
		sendpageinfo(cpi, false, true);
		if (userid) {
			fillfield(cpi.idfield, userid);
			fillfield(cpi.pwfield, sitepw);
			setPlaceholder(userid, sitepw);
		}
	});
	mutationObserver.observe(document.body, observerOptions);
	cpi = countpwid();
	sendpageinfo(cpi, false, true);
	chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
		cpi = countpwid();
		readyForClick = request.readyForClick;
		switch (request.cmd) {
			case "fillfields":
				userid = request.u;
				fillfield(cpi.idfield, userid);
				if (userid) fillfield(cpi.pwfield, request.p);
				setPlaceholder(userid);
				break;
			default:
				console.log(document.URL, "findpw unexpected message", request);
		}
		return true;
	});
}
let observeMutation =
	// Some sites change the page contents based on the fragment
	window.addEventListener("hashchange", (_href) => {
		cpi = countpwid();
	});
function fillfield(field, text) {
	// Clear label if there's a userid for this page
	if (userid) clearLabel(field);
	// In case I figure out how to clear userid and password fields
	if (field && text) {
		mutationObserver.disconnect(); // Don't trigger observer for these updates
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
	let value = field.value;
	console.log(document.URL, "findpw focus test", field.value, text);
	// If none of the above worked, put the password on the clipboard so the user can paste it.
	if (field.type === "password" && value !== text.trim()) {
		putOnClipboard(text.trim());
	}
}
// Sometimes the page doesn't know that the value is set until an event is triggered
function makeEvent(field, type) {
	let event = new Event(type, { bubbles: true, view: window, cancelable: true });
	field.dispatchEvent(event);
}
function sendpageinfo(cpi, clicked, onload) {
	// No need to send page info if no password fields found.  User will have to open
	// the popup, which will supply the needed data
	if (cpi.count === 0) return;
	console.log(document.URL, Date.now() - start, "findpw sending page info: pwcount = ", cpi.count);
	chrome.runtime.sendMessage({
		"count": cpi.count,
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
	console.log("findpw setPlaceholder 1:", Date.now() - start, userid, readyForClick, cpi.pwfield);
	mutationObserver.disconnect(); // Don't trigger observer for these updates
	if (cpi.pwfield && readyForClick && userid) {
		cpi.pwfield.placeholder = clickHere;
		cpi.pwfield.ariaPlaceholder = clickHere;
		cpi.pwfield.title = clickHere;
		if (pwfields[1]) {
			pwfields[1].placeholder = clickHere;
			pwfields[1].ariaPlaceholder = clickHere;
			pwfields[1].title = clickHere;
		}
	} else if (cpi.pwfield) {
		cpi.pwfield.placeholder = clickSitePassword;
		cpi.pwfield.ariaPlaceholder = clickSitePassword;
		cpi.pwfield.title = clickSitePassword;
	}
	mutationObserver.observe(document.body, observerOptions);
}
var pwfieldOnclick = function () {
	console.log(document.URL, "findpw 3: get sitepass");
	mutationObserver.disconnect();
	if ((!this.placeholder) || this.placeholder === clickHere) {
		chrome.runtime.sendMessage({ "cmd": "getPassword" }, (response) => {
			sitepw = response;
			fillfield(this, response);
			console.log(document.URL, "findpw 4: got password", this, response);
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
	var passwordfield = null;
	var useridfield = null;
	var visible = true;
	var found = -1;
	var c = 0;
	let inputs = document.getElementsByTagName("input");
	pwfields = [];
	for (var i = 0; i < inputs.length; i++) {
		if (inputs[i].type && (inputs[i].type.toLowerCase() == "password")) {
			visible = !isHidden(inputs[i]);
			console.log(document.URL, Date.now() - start, "findpw found password field", i, inputs[i], visible);
			if (visible) {
				pwfields.push(inputs[i]);
				c++;
				mutationObserver.disconnect(); // Don't trigger observer for these updates
				if (c === 1) {
					found = i;
					pwfields[0].onclick = pwfieldOnclick;
				} else if (c === 2) {
					pwfields[1].onclick = pwfieldOnclick;
				}
				mutationObserver.observe(document.body, observerOptions);
			}
			if (c > 2) break; // Use only the first two password fields
		}
	}
	if (c > 0) {
		passwordfield = inputs[found];
		for (var i = found - 1; i >= 0; i--) {
			// Skip over invisible input fields above the password field
			visible = !isHidden(inputs[i]);
			if (visible && (inputs[i].type == "text" || inputs[i].type == "email")) {
				useridfield = inputs[i];
				break;
			}
		}
		passwordfield.style.visibility = "visible";
		if (useridfield) useridfield.style.visibility = "visible";
	}
	console.log(document.URL, Date.now() - start, "findpw: countpwid", c, passwordfield, useridfield);
	return { count: c, pwfield: pwfields[0], idfield: useridfield, };
}
function clearLabel(field) {
	mutationObserver.disconnect(); // Don't trigger observer for these updates
	let labels = document.getElementsByTagName("label");
	for (let i = 0; i < labels.length; i++) {
		// Some labels have the id/pw field as a descendent, so don't hide them
//		if (labels[i].getElementsByTagName("input").length !== 0) { continue; }
		let target = labels[i].getAttribute("for");
		if (target && field && (target === field.id || target === field.name)) {
			labels[i].style.visibility = "hidden";
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
