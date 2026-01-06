import { Point, Wall } from "@/types";
import Line2, { LineSegment } from "@/utils/line2d";
import Vec2 from "@/utils/vec2d";

type NormalizedSegment = {
    points: Wall["points"];
    thickness: number;
    floor: number;
    sourceWallIds: string[];
};

const EPS = 1e-6;

function canonicalDir(dir: Point): Point {
    // Make direction stable so +d and -d represent the same line
    if (dir.x < -EPS) return { x: -dir.x, y: -dir.y };
    if (Math.abs(dir.x) <= EPS && dir.y < -EPS) return { x: -dir.x, y: -dir.y };
    return dir;
}

function distPointToInfiniteLine(p: Point, linePoint: Point, unitDir: Point): number {
    const v = Vec2.sub(p, linePoint);
    // |cross(unitDir, v)| gives perpendicular distance when unitDir is normalized
    return Math.abs(Vec2.cross(unitDir, v));
}

function uniqSortedScalars(values: number[], tol: number): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const out: number[] = [];
    for (const v of sorted) {
        if (out.length === 0) {
            out.push(v);
            continue;
        }
        const last = out[out.length - 1]!;
        if (Math.abs(v - last) > tol) out.push(v);
    }
    return out;
}

function computeUnionIntervals(intervals: Array<[number, number]>, joinTol: number): Array<[number, number]> {
    const sorted = [...intervals]
        .map(([a, b]) => (a <= b ? ([a, b] as [number, number]) : ([b, a] as [number, number])))
        .sort((i1, i2) => i1[0] - i2[0]);

    const out: Array<[number, number]> = [];
    for (const [a, b] of sorted) {
        if (out.length === 0) {
            out.push([a, b]);
            continue;
        }
        const last = out[out.length - 1]!;
        if (a <= last[1] + joinTol) {
            last[1] = Math.max(last[1], b);
        } else {
            out.push([a, b]);
        }
    }
    return out;
}

function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
}

function computeTOnSegment(p: Point, a: Point, b: Point): number {
    const ab = Vec2.sub(b, a);
    const abLen2 = Vec2.dot(ab, ab);
    if (abLen2 <= 1e-9) return 0;
    const ap = Vec2.sub(p, a);
    return clamp01(Vec2.dot(ap, ab) / abLen2);
}

function uniqSortedTs(values: number[], tol: number): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const out: number[] = [];
    for (const v of sorted) {
        if (out.length === 0) {
            out.push(v);
            continue;
        }
        const last = out[out.length - 1]!;
        if (Math.abs(v - last) > tol) out.push(v);
    }
    return out;
}

function splitWallByTs(wall: Wall, ts: number[], createId: () => string): { walls: Wall[]; idMap: Record<string, string> } {
    const uniq = uniqSortedTs(ts, 1e-4).filter(t => t > 1e-6 && t < 1 - 1e-6);
    if (uniq.length === 0) return { walls: [wall], idMap: { [wall.id]: wall.id } };

    const breakpoints = [0, ...uniq, 1];
    const pieces: Array<{ points: LineSegment; t0: number; t1: number }> = [];

    for (let i = 0; i < breakpoints.length - 1; i++) {
        const t0 = breakpoints[i]!;
        const t1 = breakpoints[i + 1]!;
        const a = Vec2.lerp(wall.points[0], wall.points[1], t0);
        const b = Vec2.lerp(wall.points[0], wall.points[1], t1);
        if (Vec2.dist(a, b) <= 1e-6) continue;
        pieces.push({ points: [a, b], t0, t1 });
    }

    if (pieces.length === 0) return { walls: [wall], idMap: { [wall.id]: wall.id } };

    const midT = 0.5;
    let keepIndex = 0;
    for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i]!;
        if (midT >= p.t0 && midT <= p.t1) {
            keepIndex = i;
            break;
        }
    }

    const out: Wall[] = [];
    const idMap: Record<string, string> = { [wall.id]: wall.id };

    for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i]!;
        out.push({
            id: i === keepIndex ? wall.id : createId(),
            points: p.points,
            thickness: wall.thickness,
            floor: wall.floor,
        });
    }

    return { walls: out, idMap };
}

export function splitWallsAtIntersections(
    walls: Wall[],
    createId: () => string,
    opts?: {
        floorOnly?: boolean;
        intersectionTol?: number;
        endpointTol?: number;
    }
): { walls: Wall[]; idMap: Record<string, string> } {
    const floorOnly = opts?.floorOnly ?? true;
    const intersectionTol = opts?.intersectionTol ?? 1e-3;
    const endpointTol = opts?.endpointTol ?? 0.5;

    if (walls.length <= 1) return { walls, idMap: {} };

    const splits = new Map<string, number[]>();
    for (const w of walls) splits.set(w.id, [0, 1]);

    for (let i = 0; i < walls.length; i++) {
        const wi = walls[i]!;
        const segI = wi.points;
        for (let j = i + 1; j < walls.length; j++) {
            const wj = walls[j]!;
            if (floorOnly && wi.floor !== wj.floor) continue;

            const segJ = wj.points;

            const inter = Line2.segmentIntersect(segI, segJ);
            if (inter && !inter.parallel && inter.t >= 0 && inter.t <= 1 && inter.u >= 0 && inter.u <= 1) {
                // Avoid splitting right at endpoints
                if (inter.t > 1e-5 && inter.t < 1 - 1e-5) splits.get(wi.id)!.push(inter.t);
                if (inter.u > 1e-5 && inter.u < 1 - 1e-5) splits.get(wj.id)!.push(inter.u);
            }

            // T-junction: endpoint of one wall lies on the other segment
            for (const end of segI) {
                const d = Line2.getDistanceToSegment(end, segJ);
                if (d <= endpointTol) {
                    const tOnJ = computeTOnSegment(end, segJ[0], segJ[1]);
                    if (tOnJ > 1e-5 && tOnJ < 1 - 1e-5) splits.get(wj.id)!.push(tOnJ);
                }
            }
            for (const end of segJ) {
                const d = Line2.getDistanceToSegment(end, segI);
                if (d <= endpointTol) {
                    const tOnI = computeTOnSegment(end, segI[0], segI[1]);
                    if (tOnI > 1e-5 && tOnI < 1 - 1e-5) splits.get(wi.id)!.push(tOnI);
                }
            }
        }
    }

    const out: Wall[] = [];
    const idMap: Record<string, string> = {};

    for (const w of walls) {
        const ts = splits.get(w.id) ?? [0, 1];
        // If we picked up any intersection numeric noise, filter close duplicates
        const filtered = uniqSortedTs(ts, intersectionTol);
        const res = splitWallByTs(w, filtered, createId);
        out.push(...res.walls);
        idMap[w.id] = res.idMap[w.id] ?? w.id;
    }

    return { walls: out, idMap };
}

/**
 * Normalizes collinear overlapping walls:
 * - merges overlaps into non-overlapping segments
 * - removes fully hidden/duplicate wall coverage
 * - keeps vertices at existing endpoints along the line (so T-junction endpoints remain)
 */
export function normalizeWallOverlaps(
    walls: Wall[],
    createId: () => string,
    opts?: {
        collinearDistTol?: number; // in world units
        joinTol?: number; // treat tiny gaps as connected
        scalarTol?: number; // dedupe scalar breakpoints
    }
): {
    walls: Wall[];
    idMap: Record<string, string>;
} {
    const collinearDistTol = opts?.collinearDistTol ?? 0.5;
    const joinTol = opts?.joinTol ?? 0.5;
    const scalarTol = opts?.scalarTol ?? 0.5;

    if (walls.length <= 1) return { walls, idMap: {} };

    // Union-find for clustering walls by (floor, thickness, infinite line)
    const parent = walls.map((_, i) => i);
    const find = (i: number): number => {
        while (parent[i] !== i) {
            parent[i] = parent[parent[i]!]!;
            i = parent[i]!;
        }
        return i;
    };
    const union = (a: number, b: number) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent[rb] = ra;
    };

    for (let i = 0; i < walls.length; i++) {
        const wi = walls[i]!;
        const dirIraw = Vec2.sub(wi.points[1], wi.points[0]);
        const dirI = canonicalDir(Vec2.normalize(dirIraw));
        if (Vec2.magSq(dirIraw) < EPS) continue;

        for (let j = i + 1; j < walls.length; j++) {
            const wj = walls[j]!;
            if (wi.floor !== wj.floor) continue;
            if (wi.thickness !== wj.thickness) continue;

            const dirJraw = Vec2.sub(wj.points[1], wj.points[0]);
            if (Vec2.magSq(dirJraw) < EPS) continue;
            const dirJ = canonicalDir(Vec2.normalize(dirJraw));

            // parallel?
            if (Math.abs(Vec2.cross(dirI, dirJ)) > 1e-6) continue;

            // same infinite line?
            const dist = distPointToInfiniteLine(wj.points[0], wi.points[0], dirI);
            if (dist > collinearDistTol) continue;

            union(i, j);
        }
    }

    const clusters = new Map<number, number[]>();
    for (let i = 0; i < walls.length; i++) {
        const r = find(i);
        const list = clusters.get(r) ?? [];
        list.push(i);
        clusters.set(r, list);
    }

    const idMap: Record<string, string> = {};
    const out: Wall[] = [];

    for (const indices of clusters.values()) {
        if (indices.length === 1) {
            out.push(walls[indices[0]!]!);
            continue;
        }

        const first = walls[indices[0]!]!;
        const dirRaw = Vec2.sub(first.points[1], first.points[0]);
        if (Vec2.magSq(dirRaw) < EPS) {
            // degenerate; just keep originals
            for (const idx of indices) out.push(walls[idx]!);
            continue;
        }

        const unitDir = canonicalDir(Vec2.normalize(dirRaw));
        const origin = first.points[0];
        const originS = Vec2.dot(origin, unitDir);
        const sOf = (p: Point) => Vec2.dot(p, unitDir);
        const pointAt = (s: number): Point => {
            const t = s - originS;
            return Vec2.add(origin, Vec2.mul(unitDir, t));
        };

        const groupWalls = indices.map(i => walls[i]!);

        const intervals = groupWalls.map(w => {
            const s0 = sOf(w.points[0]);
            const s1 = sOf(w.points[1]);
            return [Math.min(s0, s1), Math.max(s0, s1)] as [number, number];
        });

        const unions = computeUnionIntervals(intervals, joinTol);

        const produced: NormalizedSegment[] = [];

        for (const [u0, u1] of unions) {
            // Collect all existing endpoints on this union span to preserve vertices
            const scalars: number[] = [u0, u1];
            for (const w of groupWalls) {
                const a = sOf(w.points[0]);
                const b = sOf(w.points[1]);
                const min = Math.min(a, b);
                const max = Math.max(a, b);
                if (min >= u0 - scalarTol && min <= u1 + scalarTol) scalars.push(min);
                if (max >= u0 - scalarTol && max <= u1 + scalarTol) scalars.push(max);
            }

            const breakpoints = uniqSortedScalars(scalars, scalarTol);
            for (let k = 0; k < breakpoints.length - 1; k++) {
                const aS = breakpoints[k]!;
                const bS = breakpoints[k + 1]!;
                if (Math.abs(bS - aS) < EPS) continue;

                const midS = (aS + bS) / 2;
                const sourceWallIds: string[] = [];

                for (let idx = 0; idx < groupWalls.length; idx++) {
                    const w = groupWalls[idx]!;
                    const [i0, i1] = intervals[idx]!;
                    if (midS >= i0 - joinTol && midS <= i1 + joinTol) {
                        sourceWallIds.push(w.id);
                    }
                }

                if (sourceWallIds.length === 0) continue;

                const segPoints: Wall["points"] = [pointAt(aS), pointAt(bS)];
                produced.push({
                    points: segPoints,
                    thickness: first.thickness,
                    floor: (first as Wall).floor,
                    sourceWallIds,
                });
            }
        }

        // Assign ids to produced segments.
        // Rule: each original wall keeps its id for the segment that contains its midpoint (if available).
        const assigned: Array<{ id: string; seg: NormalizedSegment }> = produced.map(seg => ({ id: "", seg }));

        const taken = new Set<string>();
        for (let idx = 0; idx < groupWalls.length; idx++) {
            const w = groupWalls[idx]!;
            const [i0, i1] = intervals[idx]!;
            const midS = (i0 + i1) / 2;

            let bestIndex = -1;
            let bestDist = Infinity;

            for (let k = 0; k < assigned.length; k++) {
                const seg = assigned[k]!.seg.points;
                const a = sOf(seg[0]);
                const b = sOf(seg[1]);
                const min = Math.min(a, b);
                const max = Math.max(a, b);
                if (midS >= min - joinTol && midS <= max + joinTol) {
                    const dist = Math.abs(((min + max) / 2) - midS);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIndex = k;
                    }
                }
            }

            if (bestIndex !== -1 && !taken.has(w.id)) {
                // Only assign if not already assigned
                if (!assigned[bestIndex]!.id) {
                    assigned[bestIndex]!.id = w.id;
                    taken.add(w.id);
                    idMap[w.id] = w.id;
                }
            }
        }

        for (const item of assigned) {
            const id = item.id || createId();
            out.push({ id, points: item.seg.points, thickness: item.seg.thickness, floor: item.seg.floor });
        }
    }

    return { walls: out, idMap };
}

export function normalizeWalls(
    walls: Wall[],
    createId: () => string
): { walls: Wall[]; idMap: Record<string, string> } {
    const split = splitWallsAtIntersections(walls, createId);
    const merged = normalizeWallOverlaps(split.walls, createId);
    // merge id maps (split first then merged)
    const idMap: Record<string, string> = { ...split.idMap };
    for (const [k, v] of Object.entries(merged.idMap)) idMap[k] = v;
    return { walls: merged.walls, idMap };
}
