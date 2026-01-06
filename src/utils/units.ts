import { Engine } from "@/types";

// Assumption: editor world coordinates are in millimeters.
// This matches the existing UI labels ("mm") and typical floorplan workflows.

const MM_PER_METER = 1000;
const MM_PER_FOOT = 304.8;

export function lengthFromMm(mm: number, unit: Engine["unit"]) {
    if (unit === "meters") return mm / MM_PER_METER;
    if (unit === "feet") return mm / MM_PER_FOOT;
    return mm;
}

export function areaFromMm2(mm2: number, unit: Engine["unit"]) {
    if (unit === "meters") return mm2 / (MM_PER_METER * MM_PER_METER);
    if (unit === "feet") return mm2 / (MM_PER_FOOT * MM_PER_FOOT);
    return mm2;
}

export function unitSuffix(unit: Engine["unit"], kind: "length" | "area") {
    if (unit === "meters") return kind === "area" ? "m²" : "m";
    if (unit === "feet") return kind === "area" ? "ft²" : "ft";
    return kind === "area" ? "px²" : "px";
}

export function formatLength(mm: number, unit: Engine["unit"]) {
    const v = lengthFromMm(mm, unit);
    if (unit === "pixels") return `${Math.round(v)} ${unitSuffix(unit, "length")}`;

    // meters/feet: keep small precision but avoid noise
    const abs = Math.abs(v);
    const decimals = abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
    return `${v.toFixed(decimals)} ${unitSuffix(unit, "length")}`;
}

export function formatArea(mm2: number, unit: Engine["unit"]) {
    const v = areaFromMm2(mm2, unit);
    if (unit === "pixels") return `${Math.round(v)} ${unitSuffix(unit, "area")}`;

    const abs = Math.abs(v);
    const decimals = abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
    return `${v.toFixed(decimals)} ${unitSuffix(unit, "area")}`;
}
