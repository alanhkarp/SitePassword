// Thanks, Copilot plus some help from me
// There are 2 reasons to hide the element
//     Because the page owner wants it hidden
//     For clickjacking
function isHidden(field) {
    if (!field) return true;
    // ------------------------------------------------
    // These tests look for when the owner wants it hidden

    const style = window.getComputedStyle(field);
    // Check if the element is hidden via CSS properties
    if (style.display === 'none' || style.visibility === 'hidden') {
        return true;
    }

    // Check if the element is within the viewport
    const rect = field.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    if (rect.top >= viewportHeight || rect.bottom <= 0 || rect.left >= viewportWidth || rect.right <= 0) {
        return true;
    }

    // Element is hidden if it or any ancestor has opacity less than 1 unless it has a visible border.
    // Some sites set opacity to 0 as a bot defense.  I assume there will
    // be a visible border so the user can see where to type.
    let el = field;
    while (el) {
        const style = window.getComputedStyle(el);
        if (Number(style.opacity) < 1) {
            return !hasVisibleBorder(field);
        }
        el = el.parentElement;
    }

    // Check if the element is hidden by its parent
    if (field.offsetParent === null && style.position !== 'fixed') {
        return true;
    }
    // Check if the element is covered by another element
    // Doesn't work for shadow DOM elements.
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(centerX, centerY);
    if (isInShadowRoot(field) && style.pointerEvents !== "none") return false;
    // I want to treat an element as visible even if its label is on top of it
    if (topElement && topElement.getAttribute("for") !== field.id && topElement !== field &&
            !field.contains(topElement) && !topElement.contains(field)) {
        return true;
    }

    // ------------------------------------------------
    // The following tests provide partial protection against clickjacking

    // Check size
    if (rect.width <= 10 || rect.height <= 10) {
        return true;
    }

    // Check color against background
    const bgColor = style.backgroundColor.trim();
    const fieldColor = style.color.trim();
    if (fieldColor === "transparent" || isColorSimilar(bgColor, fieldColor)) {
        // If field has a border, assume it's a different color
        let hasBorder = false;
        for (let i = 0; i < style.length; i++) {
            const prop = style[i];
            if (prop.includes('border')) {
                hasBorder = true;
            }
        }
        // The colors may match, but the label/placeholder will still be visible, assume
        if (!hasBorder && !hasLabel(field) && !field.placeholder) {
            return true;
        }
    }

    // Check transform
    const transform = style.transform;
    if (transform && transform !== 'none') {
        return true;
    }

    // Check if the element is clipped with clip or clip-path
    //getBoundingClientRect will still return the position and size of the un-clipped element, not its clipped area! 
    const clip = style.clip;
    const clipPath = style.clipPath;
    if ((clip && clip !== 'auto' && clip !== 'none') || (clipPath && clipPath !== 'none')) {
        return true;
    }
    // Check if the element overlaps a popover or dialog
    if (isObscuredByPopoverOrDialog(field.id)) {
        return true;
    }

    return false;
}
// Thank you, Copilot
function isColorSimilar(color1, color2) {
    // Simple color similarity check (you can improve this)
    // Parse rgb(a) or hex colors to compare similarity
    function parseColor(color) {
        if (!color) return [0, 0, 0];
        if (color.startsWith("#")) {
            // hex format
            let hex = color.replace("#", "");
            if (hex.length === 3) hex = hex.split("").map(x => x + x).join("");
            let num = parseInt(hex, 16);
            return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
        }
        // rgb or rgba format
        let match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        return [0, 0, 0];
    }
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    // Euclidean distance between colors
    const dist = Math.sqrt(
        Math.pow(c1[0] - c2[0], 2) +
        Math.pow(c1[1] - c2[1], 2) +
        Math.pow(c1[2] - c2[2], 2)
    );
    // Consider colors similar if distance is less than 40 (tweak as needed)
    return dist < 40;
}
// Thank you, perpexity.ai
function isObscuredByPopoverOrDialog(targetId = 'password') {
    const el = document.getElementById(targetId);
    if (!el || !(el instanceof Element)) return false;

    const elRect = el.getBoundingClientRect();
    if (elRect.width === 0 || elRect.height === 0) return false; // not visible at all

    // Check open popovers (Popover API)
    const popovers = document.querySelectorAll('[popover]:popover-open');
    // Check open modal dialogs
    const dialogs = Array.from(document.querySelectorAll('dialog[open]'))
        .filter(d => typeof d.showModal === "function" && d.open);

    // Combine popovers and dialogs into a single list
    const overlays = [...popovers, ...dialogs];

    for (const overlay of overlays) {
        // Only count overlays that are rendered (not display:none, etc)
        const style = window.getComputedStyle(overlay);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
        // Calculate effective zIndex
        const overlayZIndex = getEffectiveZIndex(overlay);
        const elZIndex = getEffectiveZIndex(el);

        if (overlayZIndex < elZIndex) {
            // Skip overlays that are behind the password element
            continue;
        }
        const overlayRect = overlay.getBoundingClientRect();

        // If overlay fully covers or covers enough of the element, consider it obscured
        // Calculate the intersection area
        const xOverlap = Math.max(0, Math.min(elRect.right, overlayRect.right) - Math.max(elRect.left, overlayRect.left));
        const yOverlap = Math.max(0, Math.min(elRect.bottom, overlayRect.bottom) - Math.max(elRect.top, overlayRect.top));
        const overlapArea = xOverlap * yOverlap;

        // Calculate the area of the password element
        const elArea = elRect.width * elRect.height;

        // Require at least 20% overlap to consider the element obscured (adjust as needed)
        const overlapThreshold = 0.2; // 20%
        if (overlapArea / elArea > overlapThreshold) {
            return true;
        }
        return false;
    }
}
// Helper function to calculate effective zIndex
function getEffectiveZIndex(element) {
    let currentElement = element;
    while (currentElement) {
        const style = window.getComputedStyle(currentElement);
        const zIndex = style.zIndex;
        if (zIndex !== '' && zIndex !== 'auto') {
            return parseInt(zIndex, 10);
        }
        currentElement = currentElement.parentElement; // Traverse up the DOM
    }
    return 0; // Default zIndex if none is set
}    // Thanks, Perplexity.ai
function hasVisibleBorder(el) {
    const s = window.getComputedStyle(el);

    const widths = [
        parseFloat(s.borderTopWidth),
        parseFloat(s.borderRightWidth),
        parseFloat(s.borderBottomWidth),
        parseFloat(s.borderLeftWidth),
    ];

    const styles = [
        s.borderTopStyle,
        s.borderRightStyle,
        s.borderBottomStyle,
        s.borderLeftStyle,
    ];

    const colors = [
        s.borderTopColor,
        s.borderRightColor,
        s.borderBottomColor,
        s.borderLeftColor,
    ];

    // At least one side has non‑zero width, non‑none/hidden style, and non‑transparent color
    return widths.some((w, i) =>
        w > 10 &&
        styles[i] !== "none" &&
        styles[i] !== "hidden" &&
        colors[i] !== "transparent"
    );
}
function overlaps(field, label) {
    // Only worry about labels above or to the left of the field
    let floc = field.getBoundingClientRect();
    let lloc = label.getBoundingClientRect();
    if (floc.top >= lloc.bottom) return false;
    if (floc.left >= lloc.right) return false;
    return true;
}
function isInShadowRoot(element) {
    return element && element.getRootNode() instanceof ShadowRoot;
}
function hasLabel(element) {
    if (!element) return false;
    if (element.closest('label')) return true;
    if (!element.id) return false;
    return !!document.querySelector(`label[for="${element.id}"]`);
}
// Expose functions to window for content scripts
if (typeof window !== 'undefined') {
    window.isHidden = isHidden;
}