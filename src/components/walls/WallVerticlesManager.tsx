import { useCanvas, useMouseDown, useMouseMove, useMouseUp } from '@/hooks/useCanvas';
import { useEditor } from '@/hooks/useEditor';
import { useEngine } from '@/hooks/useEngine';
import { useCreatePortal } from '@/hooks/usePortal';
import { useSnap } from '@/hooks/useSnap';
import { useGrid } from '@/hooks/useGrid';
import { Point, Wall } from '@/types';
import { LineSegment } from '@/utils/line2d';
import Poly2 from '@/utils/polygon2d';
import Vec2 from '@/utils/vec2d';
import WallUtils from '@/utils/wallUtils';
import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Move, MousePointer2, CornerDownLeft, Link, Unlink } from 'lucide-react';

type Moving = {
    wallId: Wall['id'];
    wallPointIndex: number;
}

export interface Props {
    walls: Wall[];
}

export default function WallVerticesManager({ walls }: Props) {
    const { updateWalls, cleanupShortWalls, splitWall, normalizeWallsDebounced } = useEditor();
    const { clientToWorldPoint } = useCanvas();
    const { scalePixel, setIsInteracting, guidelinesEnabled } = useEngine();
    const { snap } = useSnap();
    const { disabled } = useGrid();
    const [moving, setMoving] = useState<Moving[]>([]);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const [movingIndex, setMovingIndex] = useState(-1);
    const [guides, setGuides] = useState<{ x?: number; y?: number } | null>(null);
    const [pendingSlice, setPendingSlice] = useState<{ wallId: string; t: number } | null>(null);

    const isMoving = useMemo(() => moving.length > 0, [moving]);
    const isHovering = useMemo(() => hoveredIndex > -1, [hoveredIndex]);
    const movingCount = moving.length;
    const CLICK_THRESHOLD = useMemo(() => scalePixel(15), [scalePixel]);

    const points = useMemo(() => {
        return Poly2.removeDuplicate(walls.map(wall => wall.points).flat());
    }, [walls]);

    const findNearestExternalVertex = useCallback((p: Point, excludeWallIds: Set<string>, tol: number): Point | null => {
        let best: Point | null = null;
        let bestDist = Infinity;

        for (const w of walls) {
            if (excludeWallIds.has(w.id)) continue;
            for (const end of w.points) {
                const d = Vec2.dist(p, end);
                if (d < bestDist) {
                    bestDist = d;
                    best = end;
                }
            }
        }

        return best && bestDist <= tol ? best : null;
    }, [walls]);

    const findNearestExternalWallBody = useCallback((p: Point, excludeWallIds: Set<string>) => {
        let best: { wallId: string; t: number; point: Point; distance: number } | null = null;

        for (const w of walls) {
            if (excludeWallIds.has(w.id)) continue;
            const seg = w.points;
            const a = seg[0];
            const b = seg[1];
            const ab = Vec2.sub(b, a);
            const ap = Vec2.sub(p, a);
            const lenSq = Vec2.dot(ab, ab);
            if (lenSq <= 1e-9) continue;

            const t = Math.max(0, Math.min(1, Vec2.dot(ap, ab) / lenSq));
            const proj = Vec2.add(a, Vec2.mul(ab, t));
            const d = Vec2.dist(p, proj);

            // Ignore endpoints; endpoint joins are handled via vertex snapping.
            if (t <= 1e-4 || t >= 1 - 1e-4) continue;

            if (!best || d < best.distance) {
                best = { wallId: w.id, t, point: proj, distance: d };
            }
        }

        return best;
    }, [walls]);

    // Portal for vertex movement UI
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
                        <CornerDownLeft size={20} color={isHovering ? '#10b981' : '#6b7280'} />
                    )}
                </motion.div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ 
                        fontWeight: 700, 
                        fontSize: '14px', 
                        color: isMoving ? '#f59e0b' : (isHovering ? '#10b981' : '#6b7280'),
                        lineHeight: 1.2
                    }}>
                        {isMoving ? 'Moving Vertex' : 'Vertex Mover'}
                    </span>
                    <span style={{
                        fontSize: '12px',
                        color: isMoving ? '#f59e0b' : (isHovering ? '#10b981' : '#666'),
                        opacity: 0.8
                    }}>
                        {isMoving ? 'Drag to reposition vertex' : 
                         isHovering ? 'Click and drag to move' : 
                         'Hover over vertex to move'}
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
                                {movingCount}
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
    ), [isMoving, isHovering, movingCount]);

    const handleMoveWalls = useCallback((point: Point) => {
        const movingWallIds = new Set(moving.map((m) => m.wallId));

        // Prefer snapping to existing (non-moving) vertices / wall bodies so
        // joins land exactly where the user is dragging.
        let snapped = snap(point);
        if (!disabled) {
            const tol = scalePixel(18, 1, 2000);

            const externalVert = findNearestExternalVertex(point, movingWallIds, tol);
            const externalBody = findNearestExternalWallBody(point, movingWallIds);

            const vertDist = externalVert ? Vec2.dist(point, externalVert) : Infinity;
            const bodyDist = externalBody ? externalBody.distance : Infinity;

            if (externalVert && vertDist <= tol && vertDist <= bodyDist) {
                snapped = externalVert;
                setPendingSlice(null);
            } else if (externalBody && bodyDist <= tol) {
                snapped = externalBody.point;
                setPendingSlice({ wallId: externalBody.wallId, t: externalBody.t });
            } else {
                setPendingSlice(null);
            }
        }

        // Guideline snap: align dragged vertex to nearby existing endpoints
        // (vertical/horizontal guides). Threshold is screen-consistent.
        let guided = snapped;
        if (!disabled && guidelinesEnabled) {
            const tol = scalePixel(12, 1, 2000);

            let bestDx = Infinity;
            let bestDy = Infinity;
            let guideX: number | undefined;
            let guideY: number | undefined;

            for (const w of walls) {
                if (movingWallIds.has(w.id)) continue;
                for (const end of w.points) {
                    const dx = Math.abs(end.x - snapped.x);
                    const dy = Math.abs(end.y - snapped.y);
                    if (dx < bestDx) {
                        bestDx = dx;
                        guideX = end.x;
                    }
                    if (dy < bestDy) {
                        bestDy = dy;
                        guideY = end.y;
                    }
                }
            }

            const nextGuides: { x?: number; y?: number } = {};
            if (guideX !== undefined && bestDx <= tol) {
                guided = { ...guided, x: guideX };
                nextGuides.x = guideX;
            }
            if (guideY !== undefined && bestDy <= tol) {
                guided = { ...guided, y: guideY };
                nextGuides.y = guideY;
            }
            setGuides(nextGuides.x !== undefined || nextGuides.y !== undefined ? nextGuides : null);
        } else {
            setGuides(null);
        }

        const ids: string[] = [];
        const patches: Array<Partial<import('@/types').Wall>> = [];
        for (const move of moving) {
            const wall = walls.find(w => w.id == move.wallId);
            if (!wall) continue;
            const wallLineSeg = wall.points;
            const index = move.wallPointIndex;
            const nextPoints = wallLineSeg.map((x, i) => i == index ? guided : x) as LineSegment;
            ids.push(wall.id);
            patches.push({ points: nextPoints });
        }
        if (ids.length > 0) updateWalls(ids, patches);
    }, [snap, moving, walls, updateWalls, disabled, scalePixel, findNearestExternalVertex, findNearestExternalWallBody]);

    useMouseDown((e) => {
        if (e.isDefaultPrevented()) return;
        const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        const nearest = Vec2.nearest(world, points);
        if (nearest.distance < CLICK_THRESHOLD) {
            e.preventDefault();
            e.currentTarget.style.cursor = "move";
            const nearestPoint = nearest.point;
            const moving = WallUtils.findConnectedAtPoint(nearestPoint, walls).map((connection) => ({
                wallId: connection.wall.id,
                wallPointIndex: connection.index
            }));
            setMoving(moving);
            setMovingIndex(nearest.index);
            setIsInteracting(true);
        }
    }, [points, CLICK_THRESHOLD, clientToWorldPoint, walls]);

    useMouseUp(() => {
        if (!isMoving) return;

        // Auto-join: if the dragged vertex ends near another existing vertex
        // (not part of the moved set), snap to it.
        // IMPORTANT: do not use `movingIndex` into the deduped `points` list,
        // since ordering/dedup can change during dragging.
        if (moving.length > 0) {
            const movingWallIds = new Set(moving.map((m) => m.wallId));
            const first = moving[0]!;
            const firstWall = walls.find((w) => w.id === first.wallId);
            const draggedPoint = firstWall?.points[first.wallPointIndex];

            if (draggedPoint) {
                const tol = Math.max(scalePixel(10, 0.5, 2000), (firstWall?.thickness ?? 1));
                const best = findNearestExternalVertex(draggedPoint, movingWallIds, tol);

                if (best) {
                    const ids: string[] = [];
                    const patches: Array<Partial<import('@/types').Wall>> = [];
                    for (const m of moving) {
                        const w = walls.find(x => x.id === m.wallId);
                        if (!w) continue;
                        const nextPoints = w.points.map((p, i) => (i === m.wallPointIndex ? best : p)) as LineSegment;
                        ids.push(w.id);
                        patches.push({ points: nextPoints });
                    }
                    if (ids.length > 0) updateWalls(ids, patches);
                }
            }
        }

        // Auto-slice: if we snapped to another wall's body during drag, split
        // that wall at the snapped t so the join becomes a real vertex.
        if (!disabled && pendingSlice && (pendingSlice.t > 1e-4 && pendingSlice.t < 1 - 1e-4)) {
            // Guard: only slice if we're not effectively at an endpoint.
            splitWall(pendingSlice.wallId, pendingSlice.t);
        }

        setMoving([]);
        setMovingIndex(-1);
        setHoveredIndex(-1);
        setIsInteracting(false);
        setGuides(null);
        setPendingSlice(null);

        // Remove tiny joined stubs after manipulation completes.
        cleanupShortWalls(200);

        // Normalize geometry to resolve overlaps and re-merge collinear segments.
        normalizeWallsDebounced();
    }, [isMoving, setIsInteracting, moving, walls, updateWalls, cleanupShortWalls, scalePixel, findNearestExternalVertex, pendingSlice, disabled, splitWall, normalizeWallsDebounced]);

    useMouseMove((e) => {
        const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        if (isMoving) {
            e.preventDefault();
            e.currentTarget.style.cursor = "move";
            handleMoveWalls(world);
        } else {
            if (e.isDefaultPrevented()) return;
            const nearest = Vec2.nearest(world, points);
            const vertIndex = nearest.distance < CLICK_THRESHOLD ? nearest.index : -1;
            setHoveredIndex(vertIndex);
            if (vertIndex > -1) {
                e.preventDefault();
                e.currentTarget.style.cursor = "grab";
            } else {
                e.currentTarget.style.cursor = "default";
            }
        }
    }, [clientToWorldPoint, handleMoveWalls, isMoving, CLICK_THRESHOLD, points]);

    return (
        <>
            <AnimatePresence>
                {isMoving && pendingSlice && (() => {
                    const w = walls.find(x => x.id === pendingSlice.wallId);
                    if (!w) return null;
                    const p = Vec2.lerp(w.points[0], w.points[1], pendingSlice.t);
                    const r = scalePixel(6, 3, 200);
                    return (
                        <motion.circle
                            key="pending-slice"
                            cx={p.x}
                            cy={p.y}
                            r={r}
                            fill="#22c55e"
                            stroke="#ffffff"
                            strokeWidth={scalePixel(2)}
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 0.95, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.12 }}
                            style={{ pointerEvents: 'none' }}
                        />
                    );
                })()}
            </AnimatePresence>

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
                {points.map(({ x, y }, i) => {
                    const isPointHovered = hoveredIndex === i;
                    const isPointMoving = movingIndex === i;
                    const baseRadius = scalePixel(5, 3, 150);
                    const hoverRadius = baseRadius + scalePixel(2);
                    
                    return (
                        <motion.circle
                            key={i}
                            cx={x}
                            cy={y}
                            r={isPointMoving ? hoverRadius : (isPointHovered ? hoverRadius : baseRadius)}
                            fill={isPointMoving ? "#f59e0b" : (isPointHovered ? "#10b981" : "#22c55e")}
                            stroke="white"
                            strokeWidth={scalePixel(1.5)}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ 
                                scale: 1, 
                                opacity: isPointHovered || isPointMoving ? 1 : 0.7
                            }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 400,
                                damping: 25 
                            }}
                            whileHover={{ scale: 1.2 }}
                            style={{ cursor: "move" }}
                        />
                    );
                })}
            </AnimatePresence>

            {/* Connection lines when moving */}
            <AnimatePresence>
                {isMoving && movingIndex > -1 && (
                    <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}>
                        {moving.map((move, index) => {
                            const wall = walls.find(w => w.id === move.wallId);
                            if (!wall) return null;
                            
                            const movingPoint = points[movingIndex];
                            const otherPointIndex = move.wallPointIndex === 0 ? 1 : 0;
                            const otherPoint = wall.points[otherPointIndex];

                            if(!movingPoint) return null;
                            
                            return (
                                <motion.line
                                    key={`${move.wallId}-${index}`}
                                    x1={movingPoint.x}
                                    y1={movingPoint.y}
                                    x2={otherPoint.x}
                                    y2={otherPoint.y}
                                    stroke="#f59e0b"
                                    strokeWidth={scalePixel(3)}
                                    strokeDasharray={scalePixel(8)}
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            );
                        })}
                    </motion.g>
                )}
            </AnimatePresence>
        </>
    );
}