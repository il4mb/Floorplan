// src/utils/geometry.ts
import { Vert, BoundingBox } from '../types';

export const distance = (a: Vert, b: Vert): number => {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
};

export const midpoint = (a: Vert, b: Vert): Vert => {
    return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
    };
};

export const angle = (a: Vert, b: Vert): number => {
    return Math.atan2(b.y - a.y, b.x - a.x);
};


export function rotatePoint(point: Vert, center: Vert, angle: number) {

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos
    }
}

export const boundingBox = (points: Vert[]): BoundingBox => {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
};

export const pointInBoundingBox = (point: Vert, bbox: BoundingBox, tolerance: number = 0): boolean => {
    return (
        point.x >= bbox.x - tolerance &&
        point.x <= bbox.x + bbox.width + tolerance &&
        point.y >= bbox.y - tolerance &&
        point.y <= bbox.y + bbox.height + tolerance
    );
};

export const lineIntersection = (
    a1: Vert, a2: Vert,
    b1: Vert, b2: Vert
): Vert | null => {
    const denominator = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);

    if (denominator === 0) return null;

    const t = ((a1.x - b1.x) * (b1.y - b2.y) - (a1.y - b1.y) * (b1.x - b2.x)) / denominator;
    const u = -((a1.x - a2.x) * (a1.y - b1.y) - (a1.y - a2.y) * (a1.x - b1.x)) / denominator;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: a1.x + t * (a2.x - a1.x),
            y: a1.y + t * (a2.y - a1.y)
        };
    }

    return null;
};

export const closestPointOnLine = (point: Vert, lineStart: Vert, lineEnd: Vert): Vert => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
    } else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    } else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
    }

    return { x: xx, y: yy };
};

export function closestPointAndDistance(p: Vert, a: Vert, b: Vert) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;

    const abLenSq = abx * abx + aby * aby;
    let t = abLenSq === 0 ? 0 : (apx * abx + apy * aby) / abLenSq;

    t = Math.max(0, Math.min(1, t));

    const closestX = a.x + abx * t;
    const closestY = a.y + aby * t;

    const dist = Math.hypot(p.x - closestX, p.y - closestY);

    return {
        point: { x: closestX, y: closestY },
        dist,
        t // optional: posisi relatif di segmen
    };
}

export function getClosestEdgeFromVerts(
    p: Vert,
    verts: Vert[],
    threshold = 25
) {
    if (verts.length < 2) return null;

    let best: null | {
        index: number;        // index edge (i → i+1)
        a: Vert;
        b: Vert;
        point: Vert;
        dist: number;
        t: number;
    } = null;

    let bestDist = threshold;

    const n = verts.length;

    for (let i = 0; i < n; i++) {
        const a = verts[i]!;
        const b = verts[(i + 1) % n]!; // wrap ke 0

        const result = closestPointAndDistance(p, a, b);

        if (result.dist <= bestDist) {
            bestDist = result.dist;
            best = {
                index: i,
                a,
                b,
                point: result.point,
                dist: result.dist,
                t: result.t
            };
        }
    }

    return best;
}





export function getCenterPoints(points: Vert[]): Vert {
    const total = points.length;
    const sum = points.reduce(
        (acc, p) => {
            acc.x += p.x;
            acc.y += p.y;
            return acc;
        },
        { x: 0, y: 0 }
    );
    return {
        x: sum.x / total,
        y: sum.y / total,
    };
}

export function transformToLocal(points: Vert[], center: Vert) {
    return points.map(p => ({
        x: p.x - center.x,
        y: p.y - center.y,
    }));
}

export function pointInPolygon(pt: Vert, polygon: Vert[]) {
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i]!.x, yi = polygon[i]!.y;
        const xj = polygon[j]!.x, yj = polygon[j]!.y;

        const intersect =
            yi > pt.y !== yj > pt.y &&
            pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}