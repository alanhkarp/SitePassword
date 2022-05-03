// Content script for ssp
'use strict';
var clickSitePassword = "Click SitePassword";
var clickHere = "Click here for password";
var pasteHere = "Paste your password here";
var pwfields = [];
var cpi = { count: 0, pwfield: null, idfield: null };
var readyForClick = false;
var changeRecorded = false;
var start = Date.now();
console.log(document.URL, "findpw loaded");
var mutationObserver = new MutationObserver(function (mutations) {
	console.log(document.URL, "findpw DOM changed", mutations);
	if (!changeRecorded && pwfields.length === 0) {
		cpi = countpwid();
		sendpageinfo(cpi, false, true);
	} else {
		changeRecorded = false;
	}
});
window.onload = function () {
	console.log(document.URL, "findpw running", Date.now() - start);
	mutationObserver.observe(document.body, {
		attributes: false,
		characterData: false,
		childList: true,
		subtree: true,
		attributeOldValue: false,
		characterDataOldValue: false
	});
	var userid = "";
	cpi = countpwid();
	sendpageinfo(cpi, false, true);
	chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
		cpi = countpwid();
		readyForClick = request.readyForClick;
		switch (request.cmd) {
			case "fillfields":
				userid = request.u;
				fillfield(cpi.idfield, userid);
				if (userid) {
					if (request.p && cpi.count !== 1) {
						putOnClipboard(pwfields[1], request.p);
					}
					fillfield(cpi.pwfield, request.p);
				}
				setPlaceholder(userid);
				break;
			default:
				console.log(document.URL, "findpw unexpected message", request);
		}
		return true;
	});
}
// Some sites change the page contents based on the fragment
window.addEventListener("hashchange", (_href) => {
	cpi = countpwid();
});
function fillfield(field, text) {
	// In case I figure out how to clear userid and password fields
	if (field && text) {
		field.value = text.trim();
		fixfield(field, text.trim());
	}
}
// Some pages don't know the field has been updated
function fixfield(field, text) {
	// Maybe I just need to tell the page that the field changed
	makeEvent(field, "change");
	makeEvent(field, "onchange");
	makeEvent(field, "input");
	makeEvent(field, "HTMLEvents");
	// Is there a better test for telling if the page knows the value has been set?
	let value = field.value;
	console.log(document.URL, "findpw focus test", field, value, text);
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
	console.log(document.URL, Date.now(), "findpw sending page info: pwcount = ", cpi.count);
	chrome.runtime.sendMessage({
		"count": cpi.count,
		"clicked": clicked,
		"onload": onload
	}, (response) => {
		if (chrome.runtime.lastError) console.log(document.URL, Date.now(), "findpw error", chrome.runtime.lastError);
		console.log(document.URL, Date.now(), "findpw response", response);
		changeRecorded = true;
		readyForClick = response.readyForClick;
		let userid = response.u;
		fillfield(cpi.idfield, userid);
		setPlaceholder(userid, response.p);
		if (cpi.count !== 1) {
			putOnClipboard(pwfields[1], response.p);
		} else {
			if (userid) {
				fillfield(cpi.pwfield, "");
			}
			cpi.idfield.focus();
		}
	});
}
function setPlaceholder(userid, pw) {
	if (cpi.pwfield && readyForClick && userid) {
		if (cpi.pwfield.isVisible()) {
			cpi.pwfield.placeholder = clickHere;
		} else {
			// In case isVisible() gets it wrong
			putOnClipboard(cpi.pwfield, pw);
		}
		console.log("findpw setPlaceholder 1 placeholder", cpi.pwfield.placeholder);
		cpi.pwfield.focus();
		if (cpi.count !== 1) {
			putOnClipboard(pwfields[1], pw);
			console.log("findpw setPlaceholder 2 placeholder", pwfields[1]);
		}
	} else {
		cpi.pwfield.placeholder = clickSitePassword;
	}
}
var pwfieldOnclick = function () {
	let pwfield = cpi.pwfield;
	console.log(document.URL, "findpw 3: get sitepass");
	if (pwfield.placeholder !== pasteHere || pwfield.placeholder !== clickSitePassword) {
		chrome.runtime.sendMessage({ "cmd": "getPassword" }, (response) => {
			fillfield(pwfield, response);
			console.log(document.URL, "findpw 4: got password", pwfield, response);
		});
	} else {
		// Because people don't always pay attention
		alert(pwfield.placeholder);
	}
}
function putOnClipboard(pwfield, password) {
	navigator.clipboard.writeText(password);
	if (pwfield) {
		if (readyForClick) {
			pwfield.placeholder = pasteHere;
		} else {
			pwfield.placeholder = clickSitePassword;
		}
		setTimeout(function () {
			navigator.clipboard.writeText("");
			pwfield.placeholder = clickSitePassword;
		}, 10000);
	}
}
function countpwid() {
	var passwordfield = null;
	var useridfield = null;
	var found = -1;
	var c = 0;
	let inputs = document.getElementsByTagName("input");
	pwfields = [];
	for (var i = 0; i < inputs.length; i++) {
		if ((inputs[i].type == "password")) {
			console.log(document.URL, "findpw found password field", inputs[i], inputs[i].isVisible());
			c++;
			pwfields.push(inputs[i]);
			if (c === 1) {
				found = i;
				if (inputs[i].isVisible()) inputs[i].onclick = pwfieldOnclick
			}
		}
	}
	if (c > 0) {
		passwordfield = inputs[found];
		for (var i = found - 1; i >= 0; i--) {
			// Skip over invisible input fields above the password field
			if (inputs[i].isVisible() && (inputs[i].type == "text" || inputs[i].type == "email")) {
				useridfield = inputs[i];
				break;
			}
		}
	}
	console.log(document.URL, "findpw: countpwid", c, passwordfield, useridfield);
	return { count: c, pwfield: passwordfield, idfield: useridfield, };
}
