// Content script for ssp
'use strict';
var pwdmsg1 = "Click SitePassword";
var pwdmsg2 = "Click here for password";
console.log("findpw.js loaded");
window.onload = function () {
	console.log("findpw.js running");
	var userid = "";
	var cpi = countpwid();
	if (cpi.pwfield) cpi.pwfield.placeholder = pwdmsg1;
	console.log("findpw 1: sending cpi", cpi);
	sendpageinfo(cpi, false, true);
	chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
		var cpi = countpwid();
		switch (request.cmd) {
			case "fillfields":
				console.log("findpw filling fields");
				if (!userid) userid = request.u;
				fillfield(cpi.idfield, request.u);
				if (userid) {
					fillfield(cpi.pwfield, request.p);
					if (cpi.pwfield.onclick) cpi.pwfield.placeholder = pwdmsg2;
				}
				break;
			case "gettabinfo":
				console.log("findpw 2: sending cpi", cpi);
				sendpageinfo(cpi, false, false);
				break;
			default:
		}
		sendResponse({ cpi: cpi.count });
	});
	if (cpi.pwfield) {
		cpi.pwfield.onclick = function () {
			console.log("findpw 3: sending cpi", cpi);
			sendpageinfo(cpi, true, false);
		}
	}
}
function fillfield(field, text) {
	console.log("findpw: fillfield");
	// In case I figure out how to clear userid and password fields
	if (field && text) {
		field.value = text.trim();
	}
}
function sendpageinfo(cpi, clicked, onload) {
	chrome.runtime.sendMessage({
		domainname: location.hostname,
		protocol: location.protocol,
		count: cpi.count,
		clicked: clicked,
		onload: onload
	});
}
function countpwid() {
	var passwordfield = null;
	var useridfield = null;
	var found = -1;
	var c = 0;
	var inputs = document.getElementsByTagName("input");
	for (var i = 0; i < inputs.length; i++) {
		if ((inputs[i].type == "password") && inputs[i].isVisible()) {
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
	console.log("findpw: countpwid", c, passwordfield, useridfield);
	return { count: c, pwfield: passwordfield, idfield: useridfield, };
}
