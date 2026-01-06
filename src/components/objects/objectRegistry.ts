export type ObjectDefinition = {
    kind: string;
    label: string;
    size: {
        // World-space size in millimeters (world units are mm)
        width: number;
        height: number;
    };
};

export const OBJECT_DEFINITIONS: ObjectDefinition[] = [
    // These were previously authored in "cm-like" values.
    // Convert to mm so objects match real measurement readouts.
    { kind: "chair", label: "Chair", size: { width: 600, height: 600 } },
    { kind: "table", label: "Table", size: { width: 1000, height: 600 } },
    { kind: "sofa", label: "Sofa", size: { width: 1400, height: 600 } },
    { kind: "bed", label: "Bed", size: { width: 1600, height: 1200 } },
    { kind: "door", label: "Door", size: { width: 900, height: 100 } },
];

const DEFAULT_DEFINITION: ObjectDefinition = {
    kind: "generic",
    label: "Object",
    size: { width: 800, height: 800 },
};

export function getObjectDefinition(kind: string | undefined): ObjectDefinition {
    if (!kind) return DEFAULT_DEFINITION;
    return OBJECT_DEFINITIONS.find(d => d.kind === kind) ?? DEFAULT_DEFINITION;
}

export const OBJECT_DRAG_MIME = "application/x-homerough-object";

export type ObjectDragPayload = {
    kind: string;
};

export function serializeObjectDragPayload(payload: ObjectDragPayload): string {
    return JSON.stringify(payload);
}

export function parseObjectDragPayload(raw: string): ObjectDragPayload | null {
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        if (typeof (parsed as any).kind !== "string") return null;
        return { kind: (parsed as any).kind };
    } catch {
        return null;
    }
}
