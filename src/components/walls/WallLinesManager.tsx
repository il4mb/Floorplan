import { useCanvas, useMouseDown, useMouseMove, useMouseUp } from '@/hooks/useCanvas';
import { useEditor } from '@/hooks/useEditor';
import { useEngine } from '@/hooks/useEngine';
import { useCreatePortal } from '@/hooks/usePortal';
import { useSnap } from '@/hooks/useSnap';
import { useGrid } from '@/hooks/useGrid';
import { Point, Wall } from '@/types';
import Line2, { LineSegment } from '@/utils/line2d';
import Vec2 from '@/utils/vec2d';
import WallUtils, { WallConnect } from '@/utils/wallUtils';
import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Move, MousePointer2, Link, Unlink } from 'lucide-react';

interface Connection {
    point: Point;
    index: number;
    connections: WallConnect[];
}

export interface WallLinesManagerProps {
    walls: Wall[];
}

export default function WallLinesManager({ walls }: WallLinesManagerProps) {
    const { snapGrid } = useSnap();
    const { disabled } = useGrid();
    const { updateWalls, cleanupShortWalls, normalizeWallsDebounced, removeWalls } = useEditor();
    const { clientToWorldPoint } = useCanvas();
    const { mode, scalePixel, setIsInteracting, setSelectedWallId, guidelinesEnabled } = useEngine();

    const [hoveredId, setHoveredId] = useState<string>();
    const [movingId, setMovingId] = useState<string>();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [intersections, setIntersections] = useState<Wall[]>([]);
    const [guides, setGuides] = useState<{ x?: number; y?: number } | null>(null);

    const cuttedLines = useMemo<{ id: string, segment: LineSegment, thickness: number }[]>(() => 
        walls.map(wall => {
            const segment = Line2.extendSegment(wall.points, -Math.max(Math.abs((wall.thickness / 2) + wall.thickness / 4), 17));
            return { id: wall.id, segment, thickness: wall.thickness };
        }), 
        [walls]
    );

    const movingWall = useMemo(() => walls.find(wall => wall.id == movingId), [walls, movingId]);
    const isMoving = Boolean(movingWall);
    const isHovering = Boolean(hoveredId);
    const connectionCount = connections.reduce((total, conn) => total + conn.connections.length, 0);

    const HOVER_THRESHOLD = useMemo(() => scalePixel(14, 6, 40), [scalePixel]);

    const findNearestId = useCallback((world: Point) => {
        let bestScore = Infinity;
        let bestId: string | undefined;

        for (const cWall of cuttedLines) {
            const distance = Line2.getDistanceToSegment(world, cWall.segment);
            const half = Math.max(0, cWall.thickness / 2);
            const score = Math.max(0, distance - half);
            const threshold = half + HOVER_THRESHOLD;
            if (distance <= threshold && score < bestScore) {
                bestScore = score;
                bestId = cWall.id;
            }
        }

        return bestId;
    }, [cuttedLines, HOVER_THRESHOLD]);

    const findNearestVertex = useCallback((p: Point, excludeWallId: string, tol: number): Point | null => {
        let best: Point | null = null;
        let bestDist = Infinity;
        for (const w of walls) {
            if (w.id === excludeWallId) continue;
            for (const end of w.points) {
                const d = Vec2.dist(p, end);
                if (d < bestDist) {
                    bestDist = d;
                    best = end;
                }
            }
        }
        return bestDist <= tol ? best : null;
    }, [walls]);

    // Portal for wall movement UI
    useCreatePortal(() => (
        <div style={{ 
            display: "flex", 
            alignItems: 'center', 
            justifyContent: "space-between", 
            gap: 12,
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 12,
            border: `2px solid ${isMoving ? '#f59e0b' : (isHovering ? '#10b981' : '#6b7280')}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: 280
        }}>
            <div style={{ display: "flex", alignItems: 'center', gap: 8 }}>
                <motion.div
                    animate={{ 
                        scale: isMoving ? 1.2 : (isHovering ? 1.1 : 1),
                        rotate: isMoving ? 5 : 0
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    {isMoving ? (
                        <Move size={20} color="#f59e0b" />
                    ) : (
                        <MousePointer2 size={20} color={isHovering ? '#10b981' : '#6b7280'} />
                    )}
                </motion.div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ 
                        fontWeight: 700, 
                        fontSize: '14px', 
                        color: isMoving ? '#f59e0b' : (isHovering ? '#10b981' : '#6b7280'),
                        lineHeight: 1.2
                    }}>
                        {isMoving ? 'Moving Wall' : 'Wall Mover'}
                    </span>
                    <span style={{
                        fontSize: '12px',
                        color: isMoving ? '#f59e0b' : (isHovering ? '#10b981' : '#666'),
                        opacity: 0.8
                    }}>
                        {isMoving ? 'Drag to reposition' : 
                         isHovering ? 'Click and drag to move' : 
                         'Hover over wall to move'}
                    </span>
                </div>
            </div>
            
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                padding: '4px 8px',
                background: isMoving ? '#f59e0b' : (isHovering ? '#10b981' : '#6b7280'),
                borderRadius: 8,
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                minWidth: 24,
                justifyContent: 'center'
            }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isMoving ? 'moving' : isHovering ? 'hover' : 'idle'}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        {isMoving ? (
                            <>
                                <Link size={14} />
                                {connectionCount}
                            </>
                        ) : isHovering ? (
                            <>
                                <MousePointer2 size={14} />
                                Ready
                            </>
                        ) : (
                            <>
                                <Unlink size={14} />
                                —
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    ), [isMoving, isHovering, connectionCount]);

    useMouseDown((e) => {
        if (!hoveredId || ["slice-wall", "eraser"].includes(mode)) return;
        e.preventDefault();
        
        // Delete mode: click to delete wall
        if (mode === "delete") {
            removeWalls([hoveredId]);
            setHoveredId(undefined);
            normalizeWallsDebounced();
            return;
        }
        
        e.currentTarget.style.cursor = "move";

        setSelectedWallId(hoveredId);
        const wall = walls.find(wall => wall.id == hoveredId);
        if (!wall) return;

        const connections = wall.points.map((point, index) => {
            const connections = WallUtils.findConnectedAtPoint(point, walls, wall);
            if (connections.length > 0) return { connections, point, index };
            return null;
        }).filter(e => e != null) as Connection[];
        
        setConnections(connections);
        setMovingId(hoveredId);
        setIsInteracting(true);
    }, [hoveredId, mode, walls, setSelectedWallId, setIsInteracting, removeWalls, normalizeWallsDebounced]);

    useMouseUp(() => {
        if (!movingId || ["slice-wall", "eraser"].includes(mode)) return;

        // Auto-join: snap moved wall endpoints to existing vertices if close.
        const movedWall = walls.find(w => w.id === movingId);
        if (movedWall) {
            const tol = Math.max(0.5, movedWall.thickness);
            const p0 = movedWall.points[0];
            const p1 = movedWall.points[1];
            const j0 = findNearestVertex(p0, movedWall.id, tol);
            const j1 = findNearestVertex(p1, movedWall.id, tol);
            if (j0 || j1) {
                updateWalls(
                    [movedWall.id],
                    [{
                        points: [j0 ?? p0, j1 ?? p1],
                    }]
                );
            }
        }

        setMovingId(undefined);
        setHoveredId(undefined);
        setConnections([]);
        setIsInteracting(false);
        setGuides(null);

        // Remove tiny joined stubs after manipulation completes.
        cleanupShortWalls(200);

        // Ensure intersections/overlaps are actually sliced/merged.
        normalizeWallsDebounced();
    }, [movingId, mode, setIsInteracting, walls, findNearestVertex, updateWalls, cleanupShortWalls, normalizeWallsDebounced]);

    useMouseMove((e) => {
        if (e.isDefaultPrevented() || ["slice-wall", "eraser"].includes(mode)) return;

        const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        const snapped = snapGrid(world);

        if (movingWall) {
            e.preventDefault();
            e.currentTarget.style.cursor = "move";
            const seg: LineSegment = movingWall.points;
            const signedDist = Line2.getSignedDistanceToSegment(snapped, seg);

            // compute offset
            const normal = Line2.normal(seg);
            const offset = Vec2.mul(normal, signedDist);

            // apply to both endpoints
            let p0 = Vec2.add(seg[0], offset);
            let p1 = Vec2.add(seg[1], offset);
            setIntersections([]);

            // Guideline snap: align moved wall endpoints to nearby existing
            // endpoints' X/Y (vertical/horizontal guides).
            if (!disabled && guidelinesEnabled) {
                const tol = scalePixel(12, 1, 2000);
                let bestDxAbs = Infinity;
                let bestDyAbs = Infinity;
                let dxDelta = 0;
                let dyDelta = 0;
                let guideX: number | undefined;
                let guideY: number | undefined;

                for (const w of walls) {
                    if (w.id === movingWall.id) continue;
                    for (const end of w.points) {
                        const dx0 = end.x - p0.x;
                        const dx1 = end.x - p1.x;
                        const dy0 = end.y - p0.y;
                        const dy1 = end.y - p1.y;

                        const dx0Abs = Math.abs(dx0);
                        const dx1Abs = Math.abs(dx1);
                        if (dx0Abs < bestDxAbs) {
                            bestDxAbs = dx0Abs;
                            dxDelta = dx0;
                            guideX = end.x;
                        }
                        if (dx1Abs < bestDxAbs) {
                            bestDxAbs = dx1Abs;
                            dxDelta = dx1;
                            guideX = end.x;
                        }

                        const dy0Abs = Math.abs(dy0);
                        const dy1Abs = Math.abs(dy1);
                        if (dy0Abs < bestDyAbs) {
                            bestDyAbs = dy0Abs;
                            dyDelta = dy0;
                            guideY = end.y;
                        }
                        if (dy1Abs < bestDyAbs) {
                            bestDyAbs = dy1Abs;
                            dyDelta = dy1;
                            guideY = end.y;
                        }
                    }
                }

                const nextGuides: { x?: number; y?: number } = {};
                if (guideX !== undefined && bestDxAbs <= tol) {
                    p0 = { ...p0, x: p0.x + dxDelta };
                    p1 = { ...p1, x: p1.x + dxDelta };
                    nextGuides.x = guideX;
                }
                if (guideY !== undefined && bestDyAbs <= tol) {
                    p0 = { ...p0, y: p0.y + dyDelta };
                    p1 = { ...p1, y: p1.y + dyDelta };
                    nextGuides.y = guideY;
                }

                setGuides(nextGuides.x !== undefined || nextGuides.y !== undefined ? nextGuides : null);
            } else {
                setGuides(null);
            }

            if (Vec2.dist(p0, p1) < movingWall.thickness) return;

            const updateStack: [string, Record<string, any>][] = [
                [movingWall.id, { points: [p0, p1] }]
            ];

            // Move connected wall endpoints to maintain joints
            for (const conn of connections) {
                // Get the new position for this connection point
                const newConnPoint = conn.index === 0 ? p0 : p1;
                
                for (const connected of conn.connections) {
                    // Skip if already in update stack
                    if (updateStack.some(([id]) => id === connected.wall.id)) continue;
                    
                    const connectedWall = walls.find(w => w.id === connected.wall.id);
                    if (!connectedWall) continue;
                    
                    // Update the connected wall's endpoint to follow
                    const newPoints: [Point, Point] = [...connectedWall.points];
                    newPoints[connected.index] = { ...newConnPoint };
                    
                    updateStack.push([connected.wall.id, { points: newPoints }]);
                }
            }

            const ids = updateStack.map(d => d[0]);
            const patches = updateStack.map(d => d[1]);
            updateWalls(ids, patches);
        } else {
            const nearest = findNearestId(world);
            setHoveredId(nearest);
            if (nearest) {
                e.preventDefault();
                e.currentTarget.style.cursor = "grab";
            } else {
                e.currentTarget.style.cursor = "default";
            }
        }
    }, [movingWall, mode, walls, clientToWorldPoint, updateWalls, findNearestId, connections, disabled, scalePixel, snapGrid]);

    return (
        <>
            <AnimatePresence>
                {isMoving && guidelinesEnabled && guides?.x !== undefined && (
                    <motion.line
                        key="guide-x"
                        x1={guides.x}
                        y1={-1000000}
                        x2={guides.x}
                        y2={1000000}
                        stroke="#10b981"
                        strokeWidth={scalePixel(1.5)}
                        strokeDasharray={scalePixel(10)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.8 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    />
                )}
                {isMoving && guidelinesEnabled && guides?.y !== undefined && (
                    <motion.line
                        key="guide-y"
                        x1={-1000000}
                        y1={guides.y}
                        x2={1000000}
                        y2={guides.y}
                        stroke="#10b981"
                        strokeWidth={scalePixel(1.5)}
                        strokeDasharray={scalePixel(10)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.8 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {walls.map((wall) => {
                    const isLineHover = wall.id == hoveredId;
                    const points = cuttedLines.find(cl => cl.id == wall.id)?.segment;
                    
                    if (!points) return null;

                    return (
                        <motion.line
                            key={wall.id}
                            x1={points[0].x}
                            y1={points[0].y}
                            x2={points[1].x}
                            y2={points[1].y}
                            stroke={isMoving ? "#f59e0b" : isLineHover ? '#10b981' : '#888'}
                            strokeWidth={isMoving ? scalePixel(18, 8, 60) : (isLineHover ? scalePixel(22, 10, 70) : scalePixel(14, 6, 50))}
                            strokeLinecap="round"
                            strokeMiterlimit={5}
                            strokeLinejoin="round"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: (isLineHover && !isMoving) || movingId == wall.id ? 0.8 : 0.6 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        />
                    );
                })}
            </AnimatePresence>

            <AnimatePresence>
                {intersections.map((wall) => (
                    <motion.line
                        key={wall.id}
                        x1={wall.points[0].x}
                        y1={wall.points[0].y}
                        x2={wall.points[1].x}
                        y2={wall.points[1].y}
                        stroke="#ef4444"
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeMiterlimit={5}
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                ))}
            </AnimatePresence>
        </>
    );
}