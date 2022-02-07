// Content script for ssp
'use strict';
var pwdmsg1 = "Click SitePassword";
var pwdmsg2 = "Click here for password";
var extensionid = "";
console.log("findpw.js loaded");
window.onload = function () {
	console.log("findpw.js running");
	var userid = "";
	var cpi = countpwid();
	if (cpi.pwfield) cpi.pwfield.placeholder = pwdmsg1;
	sendpageinfo(cpi, false, true);
	chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
		console.log("findpw got", request);
		var cpi = countpwid();
		switch (request.cmd) {
			case "fillfields":
				console.log("findpw filling fields");
				extensionid = request.extensionid;
				userid = request.u;
				fillfield(cpi.idfield, request.u);
				if (userid) {
					fillfield(cpi.pwfield, request.p);
				}
				if (request.hasMasterpw && userid) {
					cpi.pwfield.placeholder = pwdmsg2;
				} else {
					cpi.pwfield.placeholder = pwdmsg1;
				}
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
		cpi.pwfield.onclick = function () {
			console.log("findpw 3: get sitepass");
			chrome.runtime.sendMessage({"cmd": "getPassword"}, (response) => {
				console.log("findpw 4: got password", response);
				cpi.pwfield.value = response;
			});
			return true;
		}
	}
}
function fillfield(field, text) {
	console.log("findpw: fillfield", field, text);
	// In case I figure out how to clear userid and password fields
	if (field && text) {
		field.value = text.trim();
	}
}
function sendpageinfo(cpi, clicked, onload) {
	console.log("findpw sending page info: pwcount = ", cpi.count);
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
