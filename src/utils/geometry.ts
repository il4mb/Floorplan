// src/utils/geometry.ts
import { Point, BoundingBox } from '../types';

export const distance = (a: Point, b: Point): number => {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
};

export const midpoint = (a: Point, b: Point): Point => {
    return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
    };
};

export const angle = (a: Point, b: Point): number => {
    return Math.atan2(b.y - a.y, b.x - a.x);
};


export function rotatePoint(point: Point, center: Point, angle: number) {

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos
    }
}

export const boundingBox = (points: Point[]): BoundingBox => {
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

export const pointInBoundingBox = (point: Point, bbox: BoundingBox, tolerance: number = 0): boolean => {
    return (
        point.x >= bbox.x - tolerance &&
        point.x <= bbox.x + bbox.width + tolerance &&
        point.y >= bbox.y - tolerance &&
        point.y <= bbox.y + bbox.height + tolerance
    );
};

export const lineIntersection = (
    a1: Point, a2: Point,
    b1: Point, b2: Point
): Point | null => {
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

export const closestPointOnLine = (point: Point, lineStart: Point, lineEnd: Point): Point => {
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

export function getCenterPoints(points: Point[]): Point {
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

export function transformToLocal(points: Point[], center: Point) {
    return points.map(p => ({
        x: p.x - center.x,
        y: p.y - center.y,
    }));
}

export function pointInPolygon(pt: Point, polygon: Point[]) {
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