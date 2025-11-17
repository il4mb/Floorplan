import { Point } from '../types';
export interface SnapResult {
    point: Point;
    type: 'grid' | 'endpoint' | 'midpoint' | 'intersection' | 'line';
    distance: number;
}
export declare class SnapEngine {
    private gridSize;
    private points;
    private lines;
    constructor(gridSize?: number);
    setGridSize(size: number): void;
    addPoint(point: Point): void;
    addLine(from: Point, to: Point): void;
    clear(): void;
    snap(point: Point, threshold?: number): SnapResult | null;
    private snapToGrid;
}
//# sourceMappingURL=snap.d.ts.map