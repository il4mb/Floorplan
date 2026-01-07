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
import { useWallsPolygon } from '@/hooks/useWallEngine';

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
    const wallsPolygon = useWallsPolygon();
    
    const [moving, setMoving] = useState<Moving[]>([]);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const [movingIndex, setMovingIndex] = useState(-1);
    const [guides, setGuides] = useState<{ x?: number; y?: number } | null>(null);
    const [pendingSlice, setPendingSlice] = useState<{ wallId: string; t: number } | null>(null);
    
    // Bevel/chamfer wall state - a wall that connects two other walls in a chain
    type BevelWall = {
        wallId: string;                  // The bevel wall itself
        endpoint0Wall: { id: string; otherEnd: Point };  // Wall connected at endpoint 0
        endpoint1Wall: { id: string; otherEnd: Point };  // Wall connected at endpoint 1
    };
    const [hoveredBevel, setHoveredBevel] = useState<BevelWall | null>(null);
    const [movingBevel, setMovingBevel] = useState<BevelWall | null>(null);
    const [bevelDragStart, setBevelDragStart] = useState<Point | null>(null);

    const isMoving = useMemo(() => moving.length > 0, [moving]);
    const isMovingBevel = useMemo(() => movingBevel !== null, [movingBevel]);
    const isHovering = useMemo(() => hoveredIndex > -1, [hoveredIndex]);
    const movingCount = moving.length;
    const CLICK_THRESHOLD = useMemo(() => scalePixel(15), [scalePixel]);
    const BEVEL_THRESHOLD = useMemo(() => scalePixel(20, 8, 50), [scalePixel]);

    const points = useMemo(() => {
        return Poly2.removeDuplicate(walls.map(wall => wall.points).flat());
    }, [walls]);

    // Detect bevel/chamfer walls - walls where:
    // - Each endpoint connects to EXACTLY ONE other wall
    // - Forms a "chain" pattern (not a "star" junction)
    const bevelWalls = useMemo(() => {
        const bevels: BevelWall[] = [];
        const tolerance = 5;
        
        for (const wall of walls) {
            const [p0, p1] = wall.points;
            
            // Find walls connected at each endpoint
            const connAtP0 = walls.filter(w => {
                if (w.id === wall.id) return false;
                return Vec2.dist(w.points[0], p0) < tolerance || Vec2.dist(w.points[1], p0) < tolerance;
            });
            
            const connAtP1 = walls.filter(w => {
                if (w.id === wall.id) return false;
                return Vec2.dist(w.points[0], p1) < tolerance || Vec2.dist(w.points[1], p1) < tolerance;
            });
            
            // Must have exactly 1 connection at each endpoint (chain pattern)
            if (connAtP0.length !== 1 || connAtP1.length !== 1) continue;
            
            const wall0 = connAtP0[0]!;
            const wall1 = connAtP1[0]!;
            
            // Get the "other end" of each connected wall (the end that's NOT at our junction)
            const otherEnd0 = Vec2.dist(wall0.points[0], p0) < tolerance ? wall0.points[1] : wall0.points[0];
            const otherEnd1 = Vec2.dist(wall1.points[0], p1) < tolerance ? wall1.points[1] : wall1.points[0];
            
            bevels.push({
                wallId: wall.id,
                endpoint0Wall: { id: wall0.id, otherEnd: otherEnd0 },
                endpoint1Wall: { id: wall1.id, otherEnd: otherEnd1 }
            });
        }
        
        return bevels;
    }, [walls]);

    // Find nearest bevel wall to a point
    const findNearestBevelWall = useCallback((p: Point): BevelWall | null => {
        let best: BevelWall | null = null;
        let bestDist = Infinity;
        
        for (const bevel of bevelWalls) {
            const wall = walls.find(w => w.id === bevel.wallId);
            if (!wall) continue;
            
            // Distance to the line segment
            const [a, b] = wall.points;
            const ab = Vec2.sub(b, a);
            const ap = Vec2.sub(p, a);
            const lenSq = Vec2.dot(ab, ab);
            if (lenSq < 1e-9) continue;
            
            const t = Math.max(0, Math.min(1, Vec2.dot(ap, ab) / lenSq));
            const proj = Vec2.add(a, Vec2.mul(ab, t));
            const dist = Vec2.dist(p, proj);
            
            if (dist < bestDist && dist <= BEVEL_THRESHOLD) {
                bestDist = dist;
                best = bevel;
            }
        }
        
        return best;
    }, [bevelWalls, walls, BEVEL_THRESHOLD]);

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
        
        // Check for bevel wall first (but not if too close to a vertex)
        const nearest = Vec2.nearest(world, points);
        const nearestBevel = findNearestBevelWall(world);
        
        if (nearestBevel && nearest.distance >= CLICK_THRESHOLD * 0.5) {
            e.preventDefault();
            e.currentTarget.style.cursor = "move";
            setMovingBevel(nearestBevel);
            setBevelDragStart(world);
            setIsInteracting(true);
            return;
        }
        
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
    }, [points, CLICK_THRESHOLD, clientToWorldPoint, walls, findNearestBevelWall]);

    useMouseUp(() => {
        // Handle bevel edge drag end
        if (isMovingBevel) {
            setMovingBevel(null);
            setBevelDragStart(null);
            setHoveredBevel(null);
            setIsInteracting(false);
            cleanupShortWalls(200);
            normalizeWallsDebounced();
            return;
        }
        
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
    }, [isMoving, isMovingBevel, setIsInteracting, moving, walls, updateWalls, cleanupShortWalls, scalePixel, findNearestExternalVertex, pendingSlice, disabled, splitWall, normalizeWallsDebounced]);

    useMouseMove((e) => {
        const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        
        // Handle bevel wall dragging - slides along parent wall LINES (extended)
        if (isMovingBevel && movingBevel && bevelDragStart) {
            e.preventDefault();
            e.currentTarget.style.cursor = "move";
            
            const bevelWall = walls.find(w => w.id === movingBevel.wallId);
            const wall0 = walls.find(w => w.id === movingBevel.endpoint0Wall.id);
            const wall1 = walls.find(w => w.id === movingBevel.endpoint1Wall.id);
            if (!bevelWall || !wall0 || !wall1) return;
            
            // Current bevel endpoints
            const [bp0, bp1] = bevelWall.points;
            
            // The "fixed" endpoints of the parent walls (the far ends, not at bevel)
            const fixedEnd0 = movingBevel.endpoint0Wall.otherEnd;
            const fixedEnd1 = movingBevel.endpoint1Wall.otherEnd;
            
            // Calculate bevel perpendicular direction for drag
            const bevelDir = Vec2.normalize(Vec2.sub(bp1, bp0));
            const bevelPerp = Vec2.perp(bevelDir);
            
            // How far did mouse move perpendicular to bevel?
            const delta = Vec2.sub(world, bevelDragStart);
            const perpDist = Vec2.dot(delta, bevelPerp);
            
            // Move bevel endpoints perpendicular to bevel direction
            const movedP0 = Vec2.add(bp0, Vec2.mul(bevelPerp, perpDist));
            const movedP1 = Vec2.add(bp1, Vec2.mul(bevelPerp, perpDist));
            
            // Project moved points onto the INFINITE LINES of parent walls
            const projectOntoInfiniteLine = (p: Point, lineStart: Point, lineEnd: Point): Point => {
                const ab = Vec2.sub(lineEnd, lineStart);
                const ap = Vec2.sub(p, lineStart);
                const lenSq = Vec2.dot(ab, ab);
                if (lenSq < 1e-9) return p;
                
                const t = Vec2.dot(ap, ab) / lenSq;
                return Vec2.add(lineStart, Vec2.mul(ab, t));
            };
            
            // Project onto parent wall lines (from fixed end toward bevel junction)
            // Wall0's line: fixedEnd0 -> bp0 (original direction)
            // Wall1's line: fixedEnd1 -> bp1
            const newBp0 = projectOntoInfiniteLine(movedP0, fixedEnd0, bp0);
            const newBp1 = projectOntoInfiniteLine(movedP1, fixedEnd1, bp1);
            
            // Check constraints - bidirectional limits:
            // Direction check: prevent bevel endpoints from flipping past fixed ends
            const dir0 = Vec2.sub(bp0, fixedEnd0);
            const newDir0 = Vec2.sub(newBp0, fixedEnd0);
            const dir1 = Vec2.sub(bp1, fixedEnd1);
            const newDir1 = Vec2.sub(newBp1, fixedEnd1);
            
            // Stop if would flip direction (go past fixed end)
            if (Vec2.dot(dir0, newDir0) <= 0) return;
            if (Vec2.dot(dir1, newDir1) <= 0) return;
            
            // Direction 1: Bevel shrinking toward perfect L junction
            const newBevelLen = Vec2.dist(newBp0, newBp1);
            if (newBevelLen < 1) return; // Stop at perfect L
            
            // Direction 2: Bevel growing, parent walls shrinking toward 0
            const newWall0Len = Vec2.dist(fixedEnd0, newBp0);
            const newWall1Len = Vec2.dist(fixedEnd1, newBp1);
            if (newWall0Len < 1 || newWall1Len < 1) return; // Stop when either parent reaches 0
            
            // Update all three walls:
            // - Bevel wall gets new endpoints
            // - Parent walls get their junction endpoints updated
            const wall0JunctionIdx = Vec2.dist(wall0.points[0], bp0) < 5 ? 0 : 1;
            const wall1JunctionIdx = Vec2.dist(wall1.points[0], bp1) < 5 ? 0 : 1;
            
            const newWall0Points: [Point, Point] = [...wall0.points];
            newWall0Points[wall0JunctionIdx] = newBp0;
            
            const newWall1Points: [Point, Point] = [...wall1.points];
            newWall1Points[wall1JunctionIdx] = newBp1;
            
            updateWalls(
                [bevelWall.id, wall0.id, wall1.id],
                [
                    { points: [newBp0, newBp1] },
                    { points: newWall0Points },
                    { points: newWall1Points }
                ]
            );
            setBevelDragStart(world);
            return;
        }
        
        if (isMoving) {
            e.preventDefault();
            e.currentTarget.style.cursor = "move";
            handleMoveWalls(world);
        } else {
            if (e.isDefaultPrevented()) return;
            
            // Check for bevel wall hover
            const nearestBevel = findNearestBevelWall(world);
            const nearest = Vec2.nearest(world, points);
            const vertIndex = nearest.distance < CLICK_THRESHOLD ? nearest.index : -1;
            
            // Prioritize vertex over bevel
            if (vertIndex > -1) {
                setHoveredIndex(vertIndex);
                setHoveredBevel(null);
                e.preventDefault();
                e.currentTarget.style.cursor = "grab";
            } else if (nearestBevel) {
                setHoveredIndex(-1);
                setHoveredBevel(nearestBevel);
                e.preventDefault();
                e.currentTarget.style.cursor = "ew-resize";
            } else {
                setHoveredIndex(-1);
                setHoveredBevel(null);
                e.currentTarget.style.cursor = "default";
            }
        }
    }, [clientToWorldPoint, handleMoveWalls, isMoving, isMovingBevel, movingBevel, bevelDragStart, CLICK_THRESHOLD, points, findNearestBevelWall, walls, updateWalls]);

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

            {/* Bevel wall highlight */}
            <AnimatePresence>
                {(hoveredBevel || movingBevel) && (() => {
                    const bevel = movingBevel || hoveredBevel;
                    if (!bevel) return null;
                    
                    // Get the actual bevel wall to highlight it
                    const bevelWall = walls.find(w => w.id === bevel.wallId);
                    if (!bevelWall) return null;
                    
                    const [p0, p1] = bevelWall.points;
                    
                    return (
                        <g key="bevel-highlight" style={{ pointerEvents: 'none' }}>
                            {/* Highlight the bevel wall line */}
                            <motion.line
                                x1={p0.x}
                                y1={p0.y}
                                x2={p1.x}
                                y2={p1.y}
                                stroke={movingBevel ? "#f59e0b" : "#ec4899"}
                                strokeWidth={scalePixel(8, 4, 25)}
                                strokeLinecap="round"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.8 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            />
                            {/* Endpoint indicators */}
                            <motion.circle
                                cx={p0.x}
                                cy={p0.y}
                                r={scalePixel(5, 3, 15)}
                                fill={movingBevel ? "#f59e0b" : "#ec4899"}
                                stroke="white"
                                strokeWidth={scalePixel(2)}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            />
                            <motion.circle
                                cx={p1.x}
                                cy={p1.y}
                                r={scalePixel(5, 3, 15)}
                                fill={movingBevel ? "#f59e0b" : "#ec4899"}
                                stroke="white"
                                strokeWidth={scalePixel(2)}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            />
                        </g>
                    );
                })()}
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