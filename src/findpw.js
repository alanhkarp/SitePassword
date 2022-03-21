// Content script for ssp
'use strict';
var clickSitePassword = "Click SitePassword";
var clickHere = "Click here for password";
var pasteHere = "Paste your password here";
var pwfields = [];
var cpi;
console.log("findpw.js loaded");
window.onload = function () {
	console.log("findpw.js running");
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
function fillfield(field, text) {
	// In case I figure out how to clear userid and password fields
	if (field && text) {
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
	let value = document.getElementById(field.id).value;
	console.log("findpw focus test", field, field.value, value);
	if (value !== text.trim()) {
		navigator.clipboard.writeText(text.trim());
		field.placeholder = pasteHere;
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
	if (pwfields[0] && readyForClick && userid) {
		pwfields[0].placeholder = clickHere;
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
	var inputs = document.getElementsByTagName("input");
	pwfields = [];
	for (var i = 0; i < inputs.length; i++) {
		if (inputs[i].type == "password") console.log("findpw find password field", inputs[i], inputs[i].isVisible());
		if ((inputs[i].type == "password") && inputs[i].isVisible()) {
			pwfields.push(inputs[i]);
			if (c == 0) {
				inputs[i].placeholder = clickSitePassword;
				found = i;
			} else {
				inputs[i].placeholder = clickSitePassword;
			}
			let pwfield = inputs[i];
			pwfield.onclick = function () {
					console.log("findpw 3: get sitepass");
					if (pwfield.placeholder === clickHere) {
						chrome.runtime.sendMessage({ "cmd": "getPassword" }, (response) => {
							if (c === 0) {
								navigator.clipboard.writeText(response);
							}
							fillfield(pwfield, response);
							console.log("findpw 4: got password", pwfield, response);
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
