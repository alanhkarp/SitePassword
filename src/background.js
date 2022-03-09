// Create the tab that holds SitePassword persistent state, namely the master password

// I need to do this because Manifest 3 no longer supports persistent background pages,
// just transient service workers.
makeAuxTab();
chrome.storage.session.get(["secret"], (secret) => {
    if (secret.secret) {
        console.log("background got secret", secret);
    } else {
        chrome.storage.session.set({"secret": Date.now()}, () => {
            console.log(Date.now(), "background set secret", {"secret": Date.now()});
        });
    }
});
function makeAuxTab() {
    console.log("Service worker checking for auxiliary tab");
    chrome.tabs.query({ "url": "chrome-extension://" + chrome.runtime.id + "/sspaux.html" }, (tab) => {
        console.log("background query result", tab);
        if (!tab[0] || !tab[0].id) {
            chrome.tabs.create({ "url": "sspaux.html", "active": false }, (tab) => {
                 console.log("background created ssptab", tab);
            });
        }
    });
}