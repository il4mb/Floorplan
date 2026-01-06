import { Point } from "@/types";
import Line2, { LineSegment } from "@/utils/line2d";
import Vec2 from "@/utils/vec2d";
import Poly2, { Polygon } from "./polygon2d";

export interface Wall {
    id: string;
    points: LineSegment;
    thickness: number;
}
export interface WallConnect {
    wall: Wall;
    index: number;
}

export interface WallOverlap {
    wallA: Wall;
    wallB: Wall;
    overlapType: 'partial' | 'full' | 'corner';
    overlapArea: number;
    overlapPolygon: Point[];
    intersectionPoints: Point[];
}

export interface WallPolygon {
    outer: Point[];
    inner?: Point[];
}

export interface NearestWallResult {
    wall: Wall;
    distance: number;
    type: 'endpoint' | 'parallel' | 'perpendicular' | 'intersection' | 'overlap';
    connectionPoint?: Point;
    closestPoints: [Point, Point]; // [pointOnTarget, pointOnNeighbor]
}

const WallUtils = {

    createPolygon(wall: Wall, allWalls: Wall[]): Polygon {
        if (!wall.points || wall.points.length < 2) return [];

        const halfThick = wall.thickness / 2;
        const pStart = wall.points[0];
        const pEnd = wall.points[1];

        // 1. Cari neighbors
        const startNeighbors = this.findConnectedAtPoint(pStart, allWalls, wall).map(con => con.wall);
        const endNeighbors = this.findConnectedAtPoint(pEnd, allWalls, wall).map(con => con.wall);

        // 2. Hitung sudut-sudut miter menggunakan logika interseksi garis
        // Arah P1 -> P2
        const dirStart = Vec2.normalize(Vec2.sub(pEnd, pStart));
        const { left: sl, right: sr } = Poly2.computeMiterCorners(pStart, dirStart, halfThick, startNeighbors);

        // Arah P2 -> P1 (dibalik untuk perhitungan ujung)
        const dirEnd = Vec2.normalize(Vec2.sub(pStart, pEnd));
        const { left: el, right: er } = Poly2.computeMiterCorners(pEnd, dirEnd, halfThick, endNeighbors);

        // 3. Susun Poligon dengan Solusi "Center Pivot Injection"
        const polygon: Point[] = [];

        // --- Sisi Start ---
        polygon.push(sl); // Start Left Corner

        // --- Menuju Sisi End ---
        polygon.push(el); // End Left Corner

        // PERBAIKAN DISINI: Cek apakah ini sambungan 3 arah atau lebih?
        // Jika neighbors >= 2, berarti total ada 3 dinding (diri sendiri + 2 neighbor).
        if (endNeighbors.length >= 2) {
            // Masukkan titik pivot pusat agar tidak ada lubang
            polygon.push(pEnd);
        }

        polygon.push(er); // End Right Corner

        // --- Kembali ke Sisi Start ---
        polygon.push(sr); // Start Right Corner

        // PERBAIKAN DISINI JUGA: Cek untuk sisi Start
        if (startNeighbors.length >= 2) {
            // Masukkan titik pivot pusat
            polygon.push(pStart);
        }

        // (Poligon akan otomatis tertutup kembali ke titik pertama 'sl' saat dirender)

        return Poly2.reorders(polygon);
    },

    /**
     * Find overlap between walls considering thickness (polygon-based)
     */
    findOverlap(wallA: Wall, wallB: Wall): WallOverlap | null {
        if (wallA.id === wallB.id) return null;

        // Create polygons for both walls
        const polygonA = Poly2.polygonFromLine(wallA.points, wallA.thickness);
        const polygonB = Poly2.polygonFromLine(wallB.points, wallB.thickness);

        // Find polygon intersection
        const overlapPolygon = Poly2.getIntersec(polygonA, polygonB);

        if (overlapPolygon.length < 3) {
            return null; // No meaningful overlap
        }

        const overlapArea = Poly2.calculateArea(overlapPolygon);
        const intersectionPoints = Poly2.findIntersecPoints(polygonA, polygonB);

        // Determine overlap type
        let overlapType: WallOverlap['overlapType'] = 'partial';

        if (this.isFullyOverlapping(wallA, wallB)) {
            overlapType = 'full';
        } else if (this.isCornerOverlap(wallA, wallB)) {
            overlapType = 'corner';
        }

        return {
            wallA,
            wallB,
            overlapType,
            overlapArea,
            overlapPolygon,
            intersectionPoints
        };
    },

    /**
     * Check if walls are fully overlapping (considering thickness)
     */
    isFullyOverlapping(wallA: Wall, wallB: Wall): boolean {
        if (!this.isWallsCollinear(wallA, wallB)) {
            return false;
        }

        const polyA = Poly2.polygonFromLine(wallA.points, wallA.thickness);
        const polyB = Poly2.polygonFromLine(wallB.points, wallB.thickness);
        const intersection = Poly2.getIntersec(polyA, polyB);

        if (intersection.length < 3) return false;

        const areaA = Poly2.calculateArea(polyA);
        const areaB = Poly2.calculateArea(polyB);
        const intersectionArea = Poly2.calculateArea(intersection);

        // Considered fully overlapping if intersection area is close to both wall areas
        return Math.abs(intersectionArea - areaA) < 1e-9 && Math.abs(intersectionArea - areaB) < 1e-9;
    },

    /**
     * Check if walls are collinear (center lines)
     */
    isWallsCollinear(wallA: Wall, wallB: Wall, tolerance: number = 1e-9): boolean {
        const [a1, a2] = wallA.points;
        const [b1, b2] = wallB.points;

        const dirA = Vec2.normalize(Vec2.sub(a2, a1));
        const dirB = Vec2.normalize(Vec2.sub(b2, b1));

        // Check if directions are parallel
        const cross = Math.abs(Vec2.cross(dirA, dirB));
        if (cross > tolerance) return false;

        // Check if distance between center lines is within tolerance
        const dist = Line2.getDistanceToSegment(a1, [b1, b2]);
        return dist <= tolerance;
    },

    /**
     * Check for corner overlap (walls meeting at corners)
     */
    isCornerOverlap(wallA: Wall, wallB: Wall): boolean {
        const polyA = Poly2.polygonFromLine(wallA.points, wallA.thickness);
        const polyB = Poly2.polygonFromLine(wallB.points, wallB.thickness);

        // Count how many corners are inside the other polygon
        let cornersAInside = 0;
        let cornersBInside = 0;

        for (const corner of polyA) {
            if (Poly2.isPointInside(corner, polyB)) {
                cornersAInside++;
            }
        }

        for (const corner of polyB) {
            if (Poly2.isPointInside(corner, polyA)) {
                cornersBInside++;
            }
        }

        // Corner overlap typically involves 1-2 corner points overlapping
        return (cornersAInside > 0 && cornersAInside < 4) ||
            (cornersBInside > 0 && cornersBInside < 4);
    },

    /**
     * Find all overlaps in a wall collection
     */
    findAllOverlaps(walls: Wall[]): WallOverlap[] {
        const overlaps: WallOverlap[] = [];

        for (let i = 0; i < walls.length; i++) {
            for (let j = i + 1; j < walls.length; j++) {
                const overlap = this.findOverlap(walls[i]!, walls[j]!);
                if (overlap && overlap.overlapArea > 1e-9) {
                    overlaps.push(overlap);
                }
            }
        }

        return overlaps;
    },

    /**
     * Get wall bounding box
     */
    getWallBoundingBox(wall: Wall): { min: Point; max: Point } {
        const polygon = Poly2.polygonFromLine(wall.points, wall.thickness);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const point of polygon) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
    },

    /**
     * Check if two wall bounding boxes intersect
     */
    doBoundingBoxesIntersect(boxA: { min: Point; max: Point }, boxB: { min: Point; max: Point }): boolean {
        return !(boxA.max.x < boxB.min.x ||
            boxA.min.x > boxB.max.x ||
            boxA.max.y < boxB.min.y ||
            boxA.min.y > boxB.max.y);
    },


    findConnectedAtPoint(point: Point, allWalls: Wall[], excludeWall?: Wall): WallConnect[] {
        return allWalls.filter(w =>
            w !== excludeWall &&
            (Vec2.equal(w.points[0], point) || Vec2.equal(w.points[1], point))
        ).map(wall => {
            const index = wall.points.findIndex(p => Vec2.equal(p, point));
            return {
                index,
                wall
            }
        })
    },
    /**
     * Group walls by connectivity
     */
    findConnected(walls: Wall[], tolerance: number = 1e-9): Wall[][] {
        const groups: Wall[][] = [];
        const visited = new Set<string>();

        for (const wall of walls) {
            if (visited.has(wall.id)) continue;

            const group: Wall[] = [];
            const queue: Wall[] = [wall];

            while (queue.length > 0) {
                const current = queue.shift()!;
                if (visited.has(current.id)) continue;

                visited.add(current.id);
                group.push(current);

                // Find all neighbors of current wall
                const neighbors = walls.filter(w =>
                    w.id !== current.id &&
                    !visited.has(w.id) &&
                    this.findNearest(current, [w], tolerance).length > 0
                );

                queue.push(...neighbors);
            }

            if (group.length > 0) {
                groups.push(group);
            }
        }

        return groups;
    },

    /**
     * Find the single closest wall
     */
    findClosestWall(wall: Wall, neighbors: Wall[], tolerance: number = 1e-9): NearestWallResult | null {
        const nearest = this.findNearest(wall, neighbors, tolerance);
        return nearest.length > 0 ? nearest[0]! : null;
    },

    /**
     * Find nearest walls with additional filtering options
     */
    findNearestWithFilter(
        wall: Wall,
        neighbors: Wall[],
        options: {
            tolerance?: number;
            types?: NearestWallResult['type'][];
            maxDistance?: number;
            excludeSelf?: boolean;
        } = {}
    ): NearestWallResult[] {
        const {
            tolerance = 1e-9,
            types,
            maxDistance = Infinity,
            excludeSelf = true
        } = options;

        let filteredNeighbors = excludeSelf ? neighbors.filter(n => n.id !== wall.id) : neighbors;

        const results = this.findNearest(wall, filteredNeighbors, tolerance);

        // Apply filters
        let filtered = results.filter(result => result.distance <= maxDistance);

        if (types && types.length > 0) {
            filtered = filtered.filter(result => types.includes(result.type));
        }

        return filtered;
    },

    /**
     * Get parameter t for point on line segment (0 = start, 1 = end)
     */
    getLineParameter(segment: LineSegment, point: Point): number {
        const [start, end] = segment;
        const segmentVec = Vec2.sub(end, start);
        const pointVec = Vec2.sub(point, start);

        const segmentLength = Vec2.mag(segmentVec);
        if (segmentLength === 0) return 0;

        return Vec2.dot(pointVec, Vec2.normalize(segmentVec)) / segmentLength;
    },

    /**
     * Find closest points between two line segments
     */
    findClosestPointsBetweenSegments(segA: LineSegment, segB: LineSegment): [Point, Point] {
        const [a1, a2] = segA;
        const [b1, b2] = segB;

        const closestOnA = Line2.getNearestPointOnSegment(b1, [a1, a2]);
        const closestOnB = Line2.getNearestPointOnSegment(a1, [b1, b2]);

        const dist1 = Vec2.dist(b1, closestOnA);
        const dist2 = Vec2.dist(a1, closestOnB);

        if (dist1 <= dist2) {
            return [closestOnA, b1];
        } else {
            return [a1, closestOnB];
        }
    },
    /**
     * General edge-to-edge proximity check
     */
    checkEdgeProximity(wallA: Wall, wallB: Wall, tolerance: number): NearestWallResult | null {
        const [closestA, closestB] = this.findClosestPointsBetweenSegments(wallA.points, wallB.points);
        const distance = Vec2.dist(closestA, closestB);

        // Adjust for wall thickness
        const effectiveDistance = Math.max(0, distance - (wallA.thickness + wallB.thickness) / 2);

        if (effectiveDistance <= tolerance) {
            return {
                wall: wallB,
                distance: effectiveDistance,
                type: 'parallel', // fallback type
                closestPoints: [closestA, closestB]
            };
        }

        return null;
    },
    /**
     * Check for perpendicular wall connections
     */
    checkPerpendicularConnections(wallA: Wall, wallB: Wall, tolerance: number): NearestWallResult | null {
        const angle = Math.abs(Line2.angleBetween(wallA.points, wallB.points));
        const isPerpendicular = Math.abs(angle - Math.PI / 2) < 0.1; // ~5.7 degrees tolerance

        if (!isPerpendicular) {
            return null;
        }

        // Find potential T-junction points
        const endpointsA = [wallA.points[0], wallA.points[1]];
        const endpointsB = [wallB.points[0], wallB.points[1]];

        // Check if any endpoint is close to the other wall's segment
        for (const endpoint of endpointsA) {
            const closest = Line2.getNearestPointOnSegment(endpoint, wallB.points);
            const distance = Vec2.dist(endpoint, closest);
            if (distance <= tolerance) {
                return {
                    wall: wallB,
                    distance,
                    type: 'perpendicular',
                    connectionPoint: endpoint,
                    closestPoints: [endpoint, closest]
                };
            }
        }

        for (const endpoint of endpointsB) {
            const closest = Line2.getNearestPointOnSegment(endpoint, wallA.points);
            const distance = Vec2.dist(endpoint, closest);
            if (distance <= tolerance) {
                return {
                    wall: wallB,
                    distance,
                    type: 'perpendicular',
                    connectionPoint: closest,
                    closestPoints: [closest, endpoint]
                };
            }
        }

        return null;
    },
    /** 
     *    * Find nearest walls considering thickness and various connection types
   */
    findNearest(wall: Wall, neighbors: Wall[], tolerance: number = 1e-9): NearestWallResult[] {
        const results: NearestWallResult[] = [];

        for (const neighbor of neighbors) {
            if (neighbor.id === wall.id) continue;

            const result = this.calculateWallProximity(wall, neighbor, tolerance);
            if (result && result.distance <= tolerance) {
                results.push(result);
            }
        }

        // Sort by distance
        return results.sort((a, b) => a.distance - b.distance);
    },

    /**
     * Calculate proximity between two walls considering thickness
     */
    calculateWallProximity(wallA: Wall, wallB: Wall, tolerance: number = 1e-9): NearestWallResult | null {
        const [a1, a2] = wallA.points;
        const [b1, b2] = wallB.points;

        // Check for direct intersection first
        const intersection = Line2.getLineIntersection([a1, a2], [b1, b2]);
        if (intersection) {
            const t = this.getLineParameter(wallA.points, intersection);
            const u = this.getLineParameter(wallB.points, intersection);

            // If intersection is within both segments
            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                return {
                    wall: wallB,
                    distance: 0,
                    type: 'intersection',
                    connectionPoint: intersection,
                    closestPoints: [intersection, intersection]
                };
            }
        }

        // Check endpoint connections
        const endpointResult = this.checkEndpointConnections(wallA, wallB, tolerance);
        if (endpointResult) return endpointResult;

        // Check parallel wall proximity
        const parallelResult = this.checkParallelProximity(wallA, wallB, tolerance);
        if (parallelResult) return parallelResult;

        // Check perpendicular connections
        const perpendicularResult = this.checkPerpendicularConnections(wallA, wallB, tolerance);
        if (perpendicularResult) return perpendicularResult;

        // Check general proximity between wall edges
        return this.checkEdgeProximity(wallA, wallB, tolerance);
    },

    /**
     * Check for endpoint-to-endpoint or endpoint-to-edge connections
     */
    checkEndpointConnections(wallA: Wall, wallB: Wall, tolerance: number): NearestWallResult | null {
        const endpointsA = [wallA.points[0], wallA.points[1]];
        const endpointsB = [wallB.points[0], wallB.points[1]];

        // Check endpoint to endpoint connections
        for (let i = 0; i < endpointsA.length; i++) {
            for (let j = 0; j < endpointsB.length; j++) {
                const distance = Vec2.dist(endpointsA[i]!, endpointsB[j]!);
                if (distance <= tolerance) {
                    return {
                        wall: wallB,
                        distance,
                        type: 'endpoint',
                        connectionPoint: endpointsA[i],
                        closestPoints: [endpointsA[i]!, endpointsB[j]!]
                    } as NearestWallResult;
                }
            }
        }

        // Check endpoint to edge connections
        for (const endpoint of endpointsA) {
            const closest = Line2.getNearestPointOnSegment(endpoint, wallB.points);
            const distance = Vec2.dist(endpoint, closest);
            if (distance <= tolerance) {
                return {
                    wall: wallB,
                    distance,
                    type: 'endpoint',
                    connectionPoint: endpoint,
                    closestPoints: [endpoint, closest]
                };
            }
        }

        for (const endpoint of endpointsB) {
            const closest = Line2.getNearestPointOnSegment(endpoint, wallA.points);
            const distance = Vec2.dist(endpoint, closest);
            if (distance <= tolerance) {
                return {
                    wall: wallB,
                    distance,
                    type: 'endpoint',
                    connectionPoint: closest,
                    closestPoints: [closest, endpoint]
                };
            }
        }

        return null;
    },

    /**
     * Check proximity between parallel walls
     */
    checkParallelProximity(wallA: Wall, wallB: Wall, tolerance: number): NearestWallResult | null {
        if (!this.areWallsParallel(wallA, wallB)) {
            return null;
        }

        // Calculate distance between parallel lines
        const distance = this.distanceBetweenParallelWalls(wallA, wallB);

        if (distance <= tolerance + (wallA.thickness + wallB.thickness) / 2) {
            const [closestA, closestB] = this.findClosestPointsBetweenSegments(wallA.points, wallB.points);

            return {
                wall: wallB,
                distance: Math.max(0, distance - (wallA.thickness + wallB.thickness) / 2),
                type: 'parallel',
                closestPoints: [closestA, closestB]
            };
        }

        return null;
    },

    /**
     * Check if walls are parallel
     */
    areWallsParallel(wallA: Wall, wallB: Wall, angleTolerance: number = 1e-3): boolean {
        const dirA = Vec2.normalize(Vec2.sub(wallA.points[1], wallA.points[0]));
        const dirB = Vec2.normalize(Vec2.sub(wallB.points[1], wallB.points[0]));

        const dot = Math.abs(Vec2.dot(dirA, dirB));
        return Math.abs(dot - 1) < angleTolerance || Math.abs(dot + 1) < angleTolerance;
    },

    /**
     * Calculate distance between parallel wall center lines
     */
    distanceBetweenParallelWalls(wallA: Wall, wallB: Wall): number {
        const a1 = wallA.points[0];
        return Line2.getDistanceToSegment(a1, wallB.points);
    },
};

export default WallUtils;