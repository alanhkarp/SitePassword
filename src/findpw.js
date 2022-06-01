// Content script for ssp
'use strict';
var hideLabels = true; // Make it easy to turn off label hiding
var clickSitePassword = "Click SitePassword";
var clickHere = "Click here for password";
var pasteHere = "Paste your password here";
var pwfields = [];
var sitepw = "";
var userid = "";
var cpi = { count: 0, pwfield: null, idfield: null };
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
				fillfield(cpi.pwfield, sitepw);
				setPlaceholder(userid, sitepw);
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
	console.log(document.URL, Date.now() - start, "findpw setPlaceholder 1:", userid, readyForClick, cpi.pwfield);
	mutationObserver.disconnect(); // Don't trigger observer for these updates
	// Don't change to the same value to avoid mutationObserver cycling
	if (cpi.pwfield && readyForClick && userid && cpi.pwfield.placeholder !== clickHere) {
		cpi.pwfield.placeholder = clickHere;
		cpi.pwfield.ariaPlaceholder = clickHere;
		cpi.pwfield.title = clickHere;
		if (pwfields[1]) {
			pwfields[1].placeholder = clickHere;
			pwfields[1].ariaPlaceholder = clickHere;
			pwfields[1].title = clickHere;
			clearLabel(pwfields[1])
		}
		if (userid) clearLabel(cpi.idfield);
		clearLabel(cpi.pwfield);
	} else if (cpi.pwfield &&
		cpi.pwfield.placeholder !== clickHere &&
		cpi.pwfield.placeholder !== clickSitePassword) {
		cpi.pwfield.placeholder = clickSitePassword;
		cpi.pwfield.ariaPlaceholder = clickSitePassword;
		cpi.pwfield.title = clickSitePassword;
		if (userid) clearLabel(cpi.idfield);
		clearLabel(cpi.pwfield);
		clearLabel(pwfields[1])
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
	}
	console.log(document.URL, Date.now() - start, "findpw: countpwid", c, passwordfield, useridfield);
	return { count: c, pwfield: pwfields[0], idfield: useridfield, };
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