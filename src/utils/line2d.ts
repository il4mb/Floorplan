import { Point, LineSegment } from "@/types";
import Vec2 from "./vec2d";

export type { LineSegment };

export interface LineIntersectionResult {
    point: Point;
    t: number;
    u: number;
    parallel: boolean;
    coincident: boolean;
}

const EPSILON = 1e-9;

const Line2 = {

    /**
     * Calculate the angle between two lines in radians
     */
    angleBetween(lineA: Point[], lineB: Point[]): number {
        if (lineA.length < 2 || lineB.length < 2) return 0;

        const [a1, a2] = lineA;
        const [b1, b2] = lineB;

        const vecA = Vec2.sub(a2!, a1!);
        const vecB = Vec2.sub(b2!, b1!);

        const cross = Vec2.cross(vecA, vecB);
        const dot = Vec2.dot(vecA, vecB);

        return Math.atan2(cross, dot);
    },

    /**
     * Calculate the angle between two vectors in radians
     */
    angleBetweenVectors(vecA: Point, vecB: Point): number {
        const cross = Vec2.cross(vecA, vecB);
        const dot = Vec2.dot(vecA, vecB);
        return Math.atan2(cross, dot);
    },

    /**
     * Intersection of two infinite lines defined by point and direction
     */
    lineIntersect(p1: Point, d1: Point, p2: Point, d2: Point): Point | null {
        const denom = Vec2.cross(d1, d2);
        if (Math.abs(denom) < 1e-9) return null;
        const t = Vec2.cross(Vec2.sub(p2, p1), d2) / denom;
        return Vec2.add(p1, Vec2.mul(d1, t));
    },

    /**
     * Detailed intersection check between two line segments
     */
    segmentIntersect(seg1: LineSegment, seg2: LineSegment): LineIntersectionResult | null {

        if (!Array.isArray(seg1) || !Array.isArray(seg2) || seg1.length < 2 || seg2.length < 2) return null;

        const [a1, a2] = seg1;
        const [b1, b2] = seg2;

        const dA = Vec2.sub(a2, a1);
        const dB = Vec2.sub(b2, b1);
        const diff = Vec2.sub(a1, b1);

        const denom = Vec2.cross(dA, dB);
        const crossDiffA = Vec2.cross(diff, dA);
        const crossDiffB = Vec2.cross(diff, dB);

        // Check if lines are parallel
        if (Math.abs(denom) < 1e-9) {
            // Check if lines are coincident
            if (Math.abs(crossDiffA) < 1e-9 && Math.abs(crossDiffB) < 1e-9) {
                return {
                    point: a1, // Return first point as arbitrary intersection
                    t: 0,
                    u: 0,
                    parallel: true,
                    coincident: true
                };
            }
            return null;
        }

        const t = -crossDiffB / denom;
        const u = -crossDiffA / denom;

        const intersectionPoint = Vec2.add(a1, Vec2.mul(dA, t));

        return {
            point: intersectionPoint,
            t,
            u,
            parallel: false,
            coincident: false
        };
    },

    /**
     * Check if two line segments intersect (boolean only)
     */
    isIntersect(seg1: LineSegment, seg2: LineSegment): boolean {
        const result = this.segmentIntersect(seg1, seg2);
        if (!result || result.parallel) return false;

        return result.t >= 0 && result.t <= 1 && result.u >= 0 && result.u <= 1;
    },

    /**
     * Get intersection point between two line segments (simple version)
     */
    getLineIntersection(line1: LineSegment, line2: LineSegment): Point | null {
        if (!Array.isArray(line1) || !Array.isArray(line2) || line1.length < 2 || line2.length < 2) {
            console.warn("Invalid lines at getLineIntersection");
            return null;
        }
        const result = this.segmentIntersect(line1, line2);
        if (!result || result.parallel || result.t < 0 || result.t > 1 || result.u < 0 || result.u > 1) {
            return null;
        }

        return result.point;
    },

    /**
     * Calculate the length of a line segment
     */
    length(segment: LineSegment): number {
        return Vec2.dist(segment[0], segment[1]);
    },

    /**
     * Calculate the midpoint of a line segment
     */
    midpoint(segment: LineSegment): Point {
        return {
            x: (segment[0].x + segment[1].x) / 2,
            y: (segment[0].y + segment[1].y) / 2
        };
    },

    /**
     * Get the direction vector of a line segment (normalized)
     */
    direction(segment: LineSegment): Point {
        const vec = Vec2.sub(segment[1], segment[0]);
        return Vec2.normalize(vec);
    },

    /**
     * Get the normal vector (perpendicular) to a line segment
     */
    normal(segment: LineSegment): Point {
        const dir = this.direction(segment);
        return { x: -dir.y, y: dir.x };
    },

    /**
     * Calculate the distance from a point to a line segment
     */
    getDistanceToSegment(point: Point, segment: LineSegment): number {
        const [a, b] = segment;
        const ab = Vec2.sub(b, a);
        const ap = Vec2.sub(point, a);

        const dot = Vec2.dot(ap, ab);
        const lenSq = Vec2.dot(ab, ab);

        if (lenSq === 0) return Vec2.dist(point, a);

        let t = Math.max(0, Math.min(1, dot / lenSq));
        const projection = Vec2.add(a, Vec2.mul(ab, t));

        return Vec2.dist(point, projection);
    },
    getSignedDistanceToSegment(point: Point, segment: LineSegment): number {
        const [a, b] = segment;
        const ab = Vec2.sub(b, a);
        const ap = Vec2.sub(point, a);
        const cross = Vec2.cross(ab, ap);
        return cross / Vec2.len(ab); // positive = left side, negative = right side
    },
    /**
     * Find the closest point on a line segment to a given point
     */
    getNearestPointOnSegment(point: Point, segment: LineSegment): Point {
        const [a, b] = segment;
        const ab = Vec2.sub(b, a);
        const ap = Vec2.sub(point, a);

        const dot = Vec2.dot(ap, ab);
        const lenSq = Vec2.dot(ab, ab);

        if (lenSq === 0) return a;

        let t = Math.max(0, Math.min(1, dot / lenSq));
        return Vec2.add(a, Vec2.mul(ab, t));
    },

    /**
     * Check if a point is on a line segment (within tolerance)
     */
    isPointOnSegment(point: Point, segment: LineSegment, tolerance: number = 1e-9): boolean {
        return this.getDistanceToSegment(point, segment) <= tolerance;
    },

    /**
     * Extend a line segment by a certain distance from both ends
     */
    extendSegment(segment: LineSegment, distance: number): LineSegment {
        const dir = this.direction(segment);
        const startExtend = Vec2.sub(segment[0], Vec2.mul(dir, distance));
        const endExtend = Vec2.add(segment[1], Vec2.mul(dir, distance));

        return [startExtend, endExtend];
    },

    /**
     * Create a parallel segment at a given offset distance
     */
    parallelSegment(segment: LineSegment, offset: number): LineSegment {
        const normal = this.normal(segment);
        const offsetVec = Vec2.mul(normal, offset);

        return [
            Vec2.add(segment[0], offsetVec),
            Vec2.add(segment[1], offsetVec)
        ];
    },

    /**
     * Split a segment at a given parameter t (0-1)
     */
    splitSegment(segment: LineSegment, t: number): [LineSegment, LineSegment] {
        const splitPoint = Vec2.add(segment[0], Vec2.mul(Vec2.sub(segment[1], segment[0]), t));
        return [
            [segment[0], splitPoint],
            [splitPoint, segment[1]]
        ];
    },

    getOverlap(seg1: LineSegment, seg2: LineSegment): [Point, Point] | null {
        const [a1, a2] = seg1;
        const [b1, b2] = seg2;

        const vecA = Vec2.sub(a2, a1);
        const vecB = Vec2.sub(b2, b1);

        // 1. Cek apakah segmen A memiliki panjang (bukan titik)
        const lenSqA = Vec2.magSq(vecA); // x*x + y*y (Tanpa Akar)
        if (lenSqA < EPSILON) return null; // Segmen A cuma sebuah titik

        // 2. Cek Kolinearitas (Cross Product)
        // Apakah mereka sejajar?
        const cross = Vec2.cross(vecA, vecB);
        if (Math.abs(cross) > EPSILON) return null; // Tidak sejajar

        // Apakah b1 terletak di garis perpanjangan A?
        const vecDiff = Vec2.sub(b1, a1);
        const crossDiff = Vec2.cross(vecDiff, vecA);
        if (Math.abs(crossDiff) > EPSILON) return null; // Sejajar tapi beda jalur (parallel offset)

        // 3. Proyeksi Parameter t (Tanpa Sqrt)
        // Kita proyeksikan titik-titik Segmen B ke dalam satuan Segmen A
        // t = 0 (di a1), t = 1 (di a2)
        // Rumus: dot(AP, AB) / |AB|^2

        const getT = (p: Point) => Vec2.dot(Vec2.sub(p, a1), vecA) / lenSqA;

        const tB1 = getT(b1);
        const tB2 = getT(b2);

        // Urutkan tB (karena segmen B bisa berlawanan arah)
        const tMinB = Math.min(tB1, tB2);
        const tMaxB = Math.max(tB1, tB2);

        // 4. Cari Interseksi Interval [0, 1] dengan [tMinB, tMaxB]
        // Segmen A selalu [0, 1] dalam parameter spacenya sendiri
        const tOverlapStart = Math.max(0, tMinB);
        const tOverlapEnd = Math.min(1, tMaxB);

        // 5. Validasi Overlap
        // Jika start > end, atau selisihnya sangat kecil (cuma nyentuh ujung)
        if (tOverlapStart > tOverlapEnd - EPSILON) {
            return null;
        }

        // 6. Konversi balik t ke Point
        const pStart = Vec2.add(a1, Vec2.mul(vecA, tOverlapStart));
        const pEnd = Vec2.add(a1, Vec2.mul(vecA, tOverlapEnd));

        return [pStart, pEnd];
    }

};

export default Line2;