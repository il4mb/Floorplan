import { Point, Wall } from "@/types";
import Poly2 from "@/utils/polygon2d";
import { seededRoomColor } from "@/utils/color";

export type DetectedRoom = {
    id: string;
    key: string;
    defaultColor: string;
    polygon: Point[];
    area: number;
};

type Vertex = {
    id: number;
    p: Point;
};

type HalfEdge = {
    id: number;
    from: number;
    to: number;
    angle: number;
    rev: number;
};

function keyOfPoint(p: Point, eps: number) {
    const kx = Math.round(p.x / eps);
    const ky = Math.round(p.y / eps);
    return `${kx},${ky}`;
}

function polygonArea(poly: Point[]) {
    return Poly2.calculateArea(poly);
}

function quantKey(p: Point, eps: number) {
    const kx = Math.round(p.x / eps);
    const ky = Math.round(p.y / eps);
    return `${kx},${ky}`;
}

function canonicalCycle(keys: string[]): string {
    if (keys.length === 0) return "";
    const n = keys.length;
    const rotations: string[] = [];
    for (let i = 0; i < n; i++) {
        rotations.push(keys.slice(i).concat(keys.slice(0, i)).join("|") );
    }
    const rev = [...keys].reverse();
    for (let i = 0; i < n; i++) {
        rotations.push(rev.slice(i).concat(rev.slice(0, i)).join("|") );
    }
    rotations.sort();
    return rotations[0]!;
}

export function roomKeyFromPolygon(poly: Point[], epsilon: number): string {
    const keys = poly.map(p => quantKey(p, epsilon));
    return canonicalCycle(keys);
}

export function detectRoomsFromWalls(walls: Wall[], opts?: { epsilon?: number; minArea?: number }): DetectedRoom[] {
    const epsilon = opts?.epsilon ?? 1e-4;
    const minArea = opts?.minArea ?? 100; // world-units^2; filter noise

    if (!walls || walls.length === 0) return [];

    // 1) Build vertices (merge endpoints within epsilon using quantization)
    const vertices: Vertex[] = [];
    const vertexByKey = new Map<string, number>();

    const getVertexId = (p: Point) => {
        const key = keyOfPoint(p, epsilon);
        const existing = vertexByKey.get(key);
        if (existing !== undefined) return existing;
        const id = vertices.length;
        vertices.push({ id, p: { x: p.x, y: p.y } });
        vertexByKey.set(key, id);
        return id;
    };

    // 2) Build half-edges
    const edges: HalfEdge[] = [];
    const outgoing = new Map<number, number[]>();

    const addOutgoing = (from: number, edgeId: number) => {
        const arr = outgoing.get(from) ?? [];
        arr.push(edgeId);
        outgoing.set(from, arr);
    };

    for (const wall of walls) {
        const a = wall.points?.[0];
        const b = wall.points?.[1];
        if (!a || !b) continue;

        const va = getVertexId(a);
        const vb = getVertexId(b);
        if (va === vb) continue;

        const id0 = edges.length;
        const ang0 = Math.atan2(vertices[vb]!.p.y - vertices[va]!.p.y, vertices[vb]!.p.x - vertices[va]!.p.x);
        edges.push({ id: id0, from: va, to: vb, angle: ang0, rev: id0 + 1 });

        const id1 = edges.length;
        const ang1 = Math.atan2(vertices[va]!.p.y - vertices[vb]!.p.y, vertices[va]!.p.x - vertices[vb]!.p.x);
        edges.push({ id: id1, from: vb, to: va, angle: ang1, rev: id0 });

        // fix rev pointers
        edges[id0]!.rev = id1;
        edges[id1]!.rev = id0;

        addOutgoing(va, id0);
        addOutgoing(vb, id1);
    }

    if (edges.length === 0) return [];

    // 3) Sort outgoing edges CCW by angle at each vertex
    for (const [vId, list] of outgoing.entries()) {
        list.sort((eA, eB) => edges[eA]!.angle - edges[eB]!.angle);
        outgoing.set(vId, list);
    }

    // 4) Face-walk: for each directed edge, walk the face on its right
    const visited = new Array(edges.length).fill(false);
    const faces: Point[][] = [];

    const MAX_STEPS = edges.length + 5;

    const nextEdgeRightFace = (edgeId: number) => {
        const e = edges[edgeId]!;
        const v = e.to;
        const out = outgoing.get(v);
        if (!out || out.length === 0) return null;

        // incoming direction is the reverse edge at vertex v
        const revId = e.rev;
        const idx = out.indexOf(revId);
        if (idx === -1) {
            // Shouldn't happen, but be safe.
            return out[0]!;
        }
        // pick previous in CCW list => clockwise turn => right face
        const nextIdx = (idx - 1 + out.length) % out.length;
        return out[nextIdx]!;
    };

    for (let start = 0; start < edges.length; start++) {
        if (visited[start]) continue;

        const poly: Point[] = [];
        let current = start;
        let steps = 0;

        while (!visited[current] && steps < MAX_STEPS) {
            visited[current] = true;
            const e = edges[current]!;
            poly.push(vertices[e.from]!.p);

            const next = nextEdgeRightFace(current);
            if (next == null) break;
            current = next;

            steps++;
            if (current === start) break;
        }

        // Close polygon, dedupe last point if needed
        if (poly.length >= 3) {
            // remove consecutive duplicates
            const cleaned: Point[] = [];
            for (const p of poly) {
                const last = cleaned[cleaned.length - 1];
                if (!last || Math.hypot(p.x - last.x, p.y - last.y) > epsilon) cleaned.push(p);
            }
            if (cleaned.length >= 3) faces.push(cleaned);
        }
    }

    if (faces.length === 0) return [];

    // 5) Compute areas and filter small faces
    const rooms = faces
        .map((polygon, idx) => {
            const area = polygonArea(polygon);
            const key = roomKeyFromPolygon(polygon, epsilon);
            return {
                id: `room-${idx}`,
                key,
                defaultColor: seededRoomColor(key),
                polygon,
                area,
            };
        })
        .filter(r => r.polygon.length >= 3 && r.area >= minArea);

    if (rooms.length === 0) return [];

    // 6) Drop the outer face: typically the largest area
    const maxArea = Math.max(...rooms.map(r => r.area));
    const withoutOuter = rooms.filter(r => r.area < maxArea * 0.999);

    // In tiny plans, outer face might be the only face above minArea
    const finalRooms = withoutOuter.length > 0 ? withoutOuter : [];

    // 7) Stable sort by area desc
    finalRooms.sort((a, b) => b.area - a.area);

    // 8) Re-id as Room 1..N
    return finalRooms.map((r, i) => ({ ...r, id: `Room ${i + 1}` }));
}
