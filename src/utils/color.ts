function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
}

function toHex(n: number) {
    return Math.round(n).toString(16).padStart(2, '0');
}

// h in [0,360), s/l in [0,1]
export function hslToHex(h: number, s: number, l: number): string {
    const hh = ((h % 360) + 360) % 360;
    const ss = clamp01(s);
    const ll = clamp01(l);

    const c = (1 - Math.abs(2 * ll - 1)) * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = ll - c / 2;

    let r = 0, g = 0, b = 0;

    if (hh < 60) { r = c; g = x; b = 0; }
    else if (hh < 120) { r = x; g = c; b = 0; }
    else if (hh < 180) { r = 0; g = c; b = x; }
    else if (hh < 240) { r = 0; g = x; b = c; }
    else if (hh < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const R = (r + m) * 255;
    const G = (g + m) * 255;
    const B = (b + m) * 255;

    return `#${toHex(R)}${toHex(G)}${toHex(B)}`;
}

// Deterministic pseudo-random from a string (stable across sessions)
export function seededRoomColor(key: string): string {
    // FNV-1a 32-bit hash
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    // Use hash to pick a hue, keep saturation/lightness CAD-friendly
    const hue = (hash >>> 0) % 360;
    return hslToHex(hue, 0.70, 0.50);
}
