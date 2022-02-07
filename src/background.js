function foo() { return 42; }
try {
    ///console.log("No background script");
    importScripts("bg.js");
} catch (e) {
    console.error(e);
}
