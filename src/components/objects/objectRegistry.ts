export type ObjectDefinition = {
    kind: string;
    label: string;
    size: {
        width: number;
        height: number;
    };
};

export const OBJECT_DEFINITIONS: ObjectDefinition[] = [
    { kind: "chair", label: "Chair", size: { width: 60, height: 60 } },
    { kind: "table", label: "Table", size: { width: 100, height: 60 } },
    { kind: "sofa", label: "Sofa", size: { width: 140, height: 60 } },
    { kind: "bed", label: "Bed", size: { width: 160, height: 120 } },
    { kind: "door", label: "Door", size: { width: 90, height: 18 } },
];

const DEFAULT_DEFINITION: ObjectDefinition = {
    kind: "generic",
    label: "Object",
    size: { width: 80, height: 80 },
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
