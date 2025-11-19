// src/utils/snap.ts
import { Vert } from '../types';
import { distance, midpoint, closestPointOnLine } from './geometry';

export interface SnapResult {
    point: Vert;
    type: 'grid' | 'endpoint' | 'midpoint' | 'intersection' | 'line';
    distance: number;
}

export class SnapEngine {
    
    private gridSize: number;
    private points: Vert[] = [];
    private lines: { from: Vert; to: Vert }[] = [];
    private adaptiveGridEnabled: boolean = true;

    constructor(gridSize: number = 10) {
        this.gridSize = gridSize;
    }

    setGridSize(size: number): void {
        this.gridSize = size;
    }

    enableAdaptiveGrid(enabled: boolean): void {
        this.adaptiveGridEnabled = enabled;
    }

    addPoint(point: Vert): void {
        this.points.push(point);
    }

    addLine(from: Vert, to: Vert): void {
        this.lines.push({ from, to });
        // Add endpoints and midpoint
        this.points.push(from, to, midpoint(from, to));
    }

    clear(): void {
        this.points = [];
        this.lines = [];
    }

    snap(point: Vert, threshold: number = 10, zoom: number = 1): SnapResult | null {
        const results: SnapResult[] = [];

        // Grid snapping with adaptive sizing
        const gridPoint = this.snapToGrid(point, zoom);
        const gridDistance = distance(point, gridPoint);
        
        if (gridDistance <= threshold) {
            results.push({
                point: gridPoint,
                type: 'grid',
                distance: gridDistance
            });
        }

        for (const snapPoint of this.points) {
            const dist = distance(point, snapPoint);
            if (dist <= threshold) {
                const pointType = this.getPointType(snapPoint);
                results.push({
                    point: snapPoint,
                    type: pointType,
                    distance: dist
                });
            }
        }

        // Line snapping
        for (const line of this.lines) {
            const closest = closestPointOnLine(point, line.from, line.to);
            const dist = distance(point, closest);
            if (dist <= threshold) {
                results.push({
                    point: closest,
                    type: 'line',
                    distance: dist
                });
            }
        }

        if (results.length === 0) return null;

        // Return the closest snap point
        return results.reduce((closest, current) =>
            current.distance < closest.distance ? current : closest
        );
    }

    private snapToGrid(point: Vert, zoom: number = 1): Vert {
        if (!this.adaptiveGridEnabled) {
            return {
                x: Math.round(point.x / this.gridSize) * this.gridSize,
                y: Math.round(point.y / this.gridSize) * this.gridSize
            };
        }

        // Use the same adaptive grid sizing logic as your canvas
        const adaptiveGridSize = this.getAdaptiveGridSize(zoom);

        return {
            x: Math.round(point.x / adaptiveGridSize) * adaptiveGridSize,
            y: Math.round(point.y / adaptiveGridSize) * adaptiveGridSize
        };
    }

    private getAdaptiveGridSize(zoom: number): number {
        if (zoom < 0.5) {
            return 80;
        } else if (zoom < 1) {
            return 70;
        } else if (zoom < 2) {
            return 50;
        } else {
            return 25;
        }
    }

    private shouldSnapToGrid(zoom: number): boolean {
        // Use the same logic as FixedGridCanvas for when grid is visible
        
        // Check minor grid condition - if minor grid would be drawn, we should snap
        const effectiveGridSize = this.gridSize * zoom;
        const minorGridVisible = effectiveGridSize > 7;
        
        // Check major grid alpha - if major grid has sufficient alpha, we should snap
        const pct = (zoom - 0.1) / (10 - 0.1);
        const clamped = Math.min(1, Math.max(0.15, pct));
        const majorGridVisible = clamped > 0.3; // Only snap if grid is reasonably visible
        
        return minorGridVisible && majorGridVisible;
    }

    private getPointType(point: Vert): 'endpoint' | 'midpoint' {
        // Simple heuristic: if the point is exactly midway between two endpoints, it's a midpoint
        for (const line of this.lines) {
            const mid = midpoint(line.from, line.to);
            if (Math.abs(point.x - mid.x) < 0.001 && Math.abs(point.y - mid.y) < 0.001) {
                return 'midpoint';
            }
        }
        return 'endpoint';
    }

    // Helper method to check if minor grid should be visible (same condition as FixedGridCanvas)
    shouldShowMinorGrid(zoom: number): boolean {
        const effectiveGridSize = this.gridSize * zoom;
        return effectiveGridSize > 7;
    }

    // Helper method to get major grid alpha (same as FixedGridCanvas)
    getMajorGridAlpha(zoom: number): number {
        const pct = (zoom - 0.1) / (10 - 0.1);
        const clamped = Math.min(1, Math.max(0.15, pct));
        return clamped;
    }

    // Helper method to get current grid size for external use
    getCurrentGridSize(zoom: number = 1): number {
        return this.adaptiveGridEnabled ? this.getAdaptiveGridSize(zoom) : this.gridSize;
    }
}

// Utility function for direct snapping without engine instance
export function snapToGrid(point: Vert, zoom: number = 1): Vert {
    let gridSize: number;

    if (zoom < 0.5) {
        gridSize = 80;
    } else if (zoom < 1) {
        gridSize = 70;
    } else if (zoom < 2) {
        gridSize = 50;
    } else {
        gridSize = 25;
    }

    return {
        x: Math.round(point.x / gridSize) * gridSize,
        y: Math.round(point.y / gridSize) * gridSize
    };
}