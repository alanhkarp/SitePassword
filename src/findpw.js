// Content script for ssp
'use strict';
var clickSitePassword = "Click SitePassword";
var pastepwHere = "Paste your password here";
var pasteidHere = "Paste your userid here";
var pwfields = [];
var cpi;
console.log("findpw.js loaded");
window.onload = function () {
	console.log("findpw.js running");
	cpi = countpwid();
	if (cpi.pwfield) cpi.pwfield.placeholder = clickSitePassword;
	sendpageinfo(cpi, false, true);
	chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
		cpi = countpwid();
		switch (request.cmd) {
			case "fillfields":
				fillfields(request.u, request.p, request.readyForClick);
				break;
			case "gettabinfo":
				console.log("findpw 2: sending cpi", cpi);
				sendpageinfo(cpi, false, false);
				break;
			default:
		}
		return true;
	});
}
// Some sites change the page contents based on the fragment
window.addEventListener("hashchange", (_href) => {
	cpi = countpwid();
});
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
		let username = response.u;
		let password = response.p;
		let ready = response.readyForClick;
		fillfields(username, password, ready);
	});
}
function fillfields(username, password, ready) {
	navigator.clipboard.writeText(username);
	if (cpi.idfield) {
		document.body.onpaste = null;
		if (ready) {
			cpi.idfield.placeholder = pasteidHere;
			cpi.pwfield.placeholder = "";
			cpi.idfield.focus();
			cpi.idfield.onpaste = function () {
				paste(password);
				// Having an id field implies having a pw field
				cpi.pwfield.placeholder = pastepwHere;
			};
		} else {
			cpi.idfield.onpaste = function () { }
			cpi.idfield.placeholder = clickSitePassword;
			cpi.pwfield.placeholder = "";
		}
	} else {
		if (ready) {
			document.body.focus();
			document.body.onpaste = function () {
				// I'm assuming that the first paste anywhere in the body is in the userid field
				paste();
			};
		} else {
			document.body.onpaste = function () { }
		}
	}
}
function paste(password) {
	navigator.clipboard
		.writeText(password)
		.then((result) => {
			console.log("findpw clipboard result", result);
		})
		.catch((e) => {
			console.log("findpw clipboard error", e);
		});
}
function countpwid() {
	var passwordfield = null;
	var useridfield = null;
	var found = -1;
	var c = 0;
	var inputs = document.getElementsByTagName("input");
	pwfields = [];
	for (var i = 0; i < inputs.length; i++) {
		if ((inputs[i].type == "password")) {
			if (c === 0) found = i;
			c++;
			pwfields.push(inputs[i]);
		}
	}
	if (c > 0) {
		passwordfield = inputs[found];
		for (var i = found - 1; i >= 0; i--) {
			if (inputs[i].type == "text" || inputs[i].type == "email") {
				useridfield = inputs[i];
				useridfield.placeholder = pasteidHere;
				break;
			}
		}
	}
	console.log("findpw: countpwid", c, passwordfield, useridfield);
	return { count: c, pwfield: passwordfield, idfield: useridfield, };
}
