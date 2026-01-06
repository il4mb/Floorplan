import { useEngine } from '@/hooks/useEngine';
import { SnapContext, SnapState } from '@/hooks/useSnap';
import { useEditor } from '@/hooks/useEditor';
import { useGrid } from '@/hooks/useGrid';
import { Point } from '@/types';
import Vec2 from '@/utils/vec2d';
import { ReactNode, useCallback, useMemo } from 'react';

export interface SnapProviderProps {
    children?: ReactNode;
}
export default function SnapProvider({ children }: SnapProviderProps) {

    const { gridSize, view } = useEngine();
    const { data } = useEditor();
    const { disabled } = useGrid();

    const wallPoints = useMemo<Point[]>(() => {
        const pts: Point[] = [];
        for (const wall of data.walls) {
            pts.push(wall.points[0], wall.points[1]);
        }
        return pts;
    }, [data.walls]);

    const snapGrid = useCallback((point: Point, threshold = 25): Point => {
        if (disabled) return point;
        const gx = Math.round(point.x / gridSize) * gridSize;
        const gy = Math.round(point.y / gridSize) * gridSize;
        const dx = Math.abs(point.x - gx);
        const dy = Math.abs(point.y - gy);

        if (dx > threshold && dy > threshold) {
            return point;
        }
        return { x: gx, y: gy };
    }, [gridSize, disabled]);


    const snapWall = useCallback((point: Point, threshold = 25): Point => {
        if (disabled) return point;
        if (wallPoints.length === 0) return point;
        const nearest = Vec2.nearest(point, wallPoints);
        if (!nearest.point) return point;
        return nearest.distance <= threshold ? nearest.point : point;
    }, [wallPoints, view, disabled]);

    const snap = useCallback((point: Point, threshold = 25): Point => {
        if (disabled) return point;
        const wallSnapped = snapWall(point, threshold);
        if (!Vec2.equal(wallSnapped, point)) return wallSnapped;
        return snapGrid(point, threshold);
    }, [snapGrid, snapWall, disabled]);

    const value = useMemo<SnapState>(() => ({ snapGrid, snapWall, snap }), [snapGrid, snapWall, snap]);

    return (
        <SnapContext.Provider value={value}>
            {children}
        </SnapContext.Provider>
    );
}