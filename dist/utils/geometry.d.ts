import { Point, BoundingBox } from '../types';
export declare const distance: (a: Point, b: Point) => number;
export declare const midpoint: (a: Point, b: Point) => Point;
export declare const angle: (a: Point, b: Point) => number;
export declare const rotatePoint: (point: Point, center: Point, angle: number) => Point;
export declare const boundingBox: (points: Point[]) => BoundingBox;
export declare const pointInBoundingBox: (point: Point, bbox: BoundingBox, tolerance?: number) => boolean;
export declare const lineIntersection: (a1: Point, a2: Point, b1: Point, b2: Point) => Point | null;
export declare const closestPointOnLine: (point: Point, lineStart: Point, lineEnd: Point) => Point;
//# sourceMappingURL=geometry.d.ts.map