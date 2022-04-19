// Content script for ssp
'use strict';
var clickSitePassword = "Click SitePassword";
var clickHere = "Click here for password";
var pasteHere = "Paste your password here";
var pwfields = [];
var cpi;
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
	if (cpi.pwfield) cpi.pwfield.placeholder = clickSitePassword;
	sendpageinfo(cpi, false, true);
	chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
		cpi = countpwid();
		switch (request.cmd) {
			case "fillfields":
				userid = request.u;
				fillfield(cpi.idfield, userid);
				if (userid) {
					if (request.p && cpi.count !== 1) {
						navigator.clipboard.writeText(request.p);
					}
					fillfield(cpi.pwfield, request.p);
				}
				setPlaceholder(request.readyForClick, userid);
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
		field.addEventListener("change", (event) => {
			console.log(document.URL, "findpw event", event);
		});
		field.value = text.trim();
		let event = new Event("change");
		field.dispatchEvent(event);
		fixfield(field, text.trim());
	}
}
function fixfield(field, text) {
	// Sometimes setting the value of a field isn't enough; the value disappears
	// when focus changes to another field.  This function does the test to see
	// if that's happening and puts the text on the clipboard so it can be pasted
	// in by the user.
	let temp = document.createElement("input");
	document.body.appendChild(temp);
	temp.focus();
	document.body.removeChild(temp);
	field.focus();
	let value = field.value;
	console.log(document.URL, "findpw focus test", field, field.value, value);
	if (field.type === "password" && value !== text.trim()) {
		navigator.clipboard.writeText(text.trim());
		field.placeholder = pasteHere;
	}
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
		if (cpi.count === 0) {
			// Doesn't work when running dev tools
			navigator.clipboard.writeText(response.p);
		} else {
			setPlaceholder(response.readyForClick, userid);
			fillfield(cpi.idfield, response.u);
			if (userid) {
				fillfield(cpi.pwfield, "");
				cpi.pwfield.focus();
			} else {
				cpi.idfield.focus();
			}
		}
	});
}
function setPlaceholder(readyForClick, userid) {
	if (pwfields[0] && readyForClick && userid) {
		pwfields[0].placeholder = clickHere;
		pwfields[0].focus();
		for (let i = 1; i < pwfields.length; i++) {
			pwfields[i].placeholder = clickHere;
		}
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
			console.log(document.URL, "findpw find password field", inputs[i], inputs[i].isVisible());
			pwfields.push(inputs[i]);
			if (readyForClick) {
				inputs[i].placeholder = clickHere;
			} else {
				inputs[i].placeholder = clickSitePassword;
			}
			if (c == 0) {
				found = i;
			}
			let pwfield = inputs[i];
			pwfield.onclick = function () {
				console.log(document.URL, "findpw 3: get sitepass");
				if (pwfield.placeholder !== pasteHere || pwfield.placeholder !== clickSitePassword) {
					chrome.runtime.sendMessage({ "cmd": "getPassword" }, (response) => {
						if (cpi.count === 0) {
							navigator.clipboard.writeText(response);
						}
						fillfield(pwfield, response);
						console.log(document.URL, "findpw 4: got password", pwfield, response);
					});
				} else {
					// Because people don't always pay attention
					alert(pwfield.placeholder);
				}
			}
			c++;
		}
	}
	if (c > 0) {
		passwordfield = inputs[found];
		for (var i = found - 1; i >= 0; i--) {
			if (inputs[i].type == "text" || inputs[i].type == "email") {
				useridfield = inputs[i];
				break;
			}
		}
	}
	console.log(document.URL, "findpw: countpwid", c, passwordfield, useridfield);
	return { count: c, pwfield: passwordfield, idfield: useridfield, };
}
