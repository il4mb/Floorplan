import { Point, Wall } from "@/types";

export type WallAttachment = {
    wallId: string;
    t: number; // 0..1 along wall segment
    point: Point;
    angleDeg: number;
    distance: number;
};

function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
}

function projectPointToSegment(p: Point, a: Point, b: Point) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;

    const abLen2 = abx * abx + aby * aby;
    if (abLen2 <= 1e-9) {
        const dx = p.x - a.x;
        const dy = p.y - a.y;
        return { t: 0, point: { ...a }, dist2: dx * dx + dy * dy };
    }

    const t = clamp01((apx * abx + apy * aby) / abLen2);
    const proj = { x: a.x + abx * t, y: a.y + aby * t };
    const dx = p.x - proj.x;
    const dy = p.y - proj.y;
    return { t, point: proj, dist2: dx * dx + dy * dy };
}

export function getWallAngleDeg(wall: Wall): number {
    const a = wall.points?.[0];
    const b = wall.points?.[1];
    if (!a || !b) return 0;
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export function pointOnWall(wall: Wall, t: number): Point {
    const a = wall.points?.[0];
    const b = wall.points?.[1];
    if (!a || !b) return { x: 0, y: 0 };
    const tt = clamp01(t);
    return {
        x: a.x + (b.x - a.x) * tt,
        y: a.y + (b.y - a.y) * tt,
    };
}

export function findNearestWallAttachment(point: Point, walls: Wall[]): WallAttachment | null {
    let best: WallAttachment | null = null;

    for (const wall of walls) {
        const a = wall.points?.[0];
        const b = wall.points?.[1];
        if (!a || !b) continue;

        const proj = projectPointToSegment(point, a, b);
        const dist = Math.sqrt(proj.dist2);
        if (!best || dist < best.distance) {
            best = {
                wallId: wall.id,
                t: proj.t,
                point: proj.point,
                angleDeg: getWallAngleDeg(wall),
                distance: dist,
            };
        }
    }

    return best;
}
