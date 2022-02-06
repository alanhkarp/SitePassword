function foo() { return 42; }
try {
    ///console.log("No background script");
    importScripts("bg.js", "sha256.js");
} catch (e) {
    console.error(e);
}
