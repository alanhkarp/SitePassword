// Content script for ssp
'use strict';
var clickSitePassword = "Click SitePassword";
var clickHere = "Click here for password";
var pasteHere = "Paste your password here";
var pwfields = [];
console.log("findpw.js loaded");
window.onload = function () {
	console.log("findpw.js running");
	var userid = "";
	var cpi = countpwid();
	if (cpi.pwfield) cpi.pwfield.placeholder = clickSitePassword;
	sendpageinfo(cpi, false, true);
	chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
		var cpi = countpwid();
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
			case "gettabinfo":
				console.log("findpw 2: sending cpi", cpi);
				sendpageinfo(cpi, false, false);
				break;
			default:
		}
		return true;
	});
	if (cpi.pwfield) {
		// Usability hint:  I could add onclick to each found password field.
		// The problem is that the web page doesn't know it's there until there
		// is some other UI event.  If you're on page that asks you to confirm your
		// password, it won't detect the result of the click on the second field
		// until you do something else.  That's confusing if you expect to see
		// a notification that the two passwords match.  That doesn't happen
		// when pasting the second password.
		cpi.pwfield.onclick = function () {
			console.log("findpw 3: get sitepass");
			chrome.runtime.sendMessage({ "cmd": "getPassword" }, (response) => {
				console.log("findpw 4: got password", cpi.pwfield, response);
				if (cpi.count !== 1) {
					navigator.clipboard.writeText(response);
				}
				cpi.pwfield.value = response;
			});
		}
	}
}
function fillfield(field, text) {
	// In case I figure out how to clear userid and password fields
	if (field && text) {
		field.value = text.trim();
	}
}
function sendpageinfo(cpi, clicked, onload) {
	console.log(Date.now(), "findpw sending page info: pwcount = ", cpi.count);
	chrome.runtime.sendMessage({
		"domainname": location.hostname,
		"protocol": location.protocol,
		"count": cpi.count,
		"clicked": clicked,
		"onload": onload
	}, (response) => {
		if (chrome.runtime.lastError) console.log(Date.now(), "findpw error", chrome.runtime.lastError);
		console.log(Date.now(), "findpw response", response);
		let userid = response.u;
		setPlaceholder(response.readyForClick, userid);
		fillfield(cpi.idfield, response.u);
		if (userid) {
			fillfield(cpi.pwfield, response.p);
		}
	});
}
function setPlaceholder(readyForClick, userid) {
	if (readyForClick && userid) {
		pwfields[0].placeholder = clickHere;
		for (let i = 1; i < pwfields.length; i++) {
			pwfields[i].placeholder = pasteHere;
		}
	}
}
function countpwid() {
	var passwordfield = null;
	var useridfield = null;
	var found = -1;
	var c = 0;
	var inputs = document.getElementsByTagName("input");
	pwfields = [];
	for (var i = 0; i < inputs.length; i++) {
		if ((inputs[i].type == "password") && inputs[i].isVisible()) {
			pwfields.push(inputs[i]);
			inputs[i].placeholder = clickSitePassword;
			if (c == 0) found = i;
			c++;
		}
	}
	if (c > 0) {
		passwordfield = inputs[found];
		for (var i = found - 1; i >= 0; i--) {
			if ((inputs[i].type == "text" || inputs[i].type == "email") &&
				inputs[i].isVisible()) {
				useridfield = inputs[i];
				break;
			}
		}
	}
	//	console.log("findpw: countpwid", c, passwordfield, useridfield);
	return { count: c, pwfield: passwordfield, idfield: useridfield, };
}
