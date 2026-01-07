import { useCanvas, useMouseDown, useMouseMove } from '@/hooks/useCanvas';
import { useEditor } from '@/hooks/useEditor';
import { useEngine } from '@/hooks/useEngine';
import { useCreatePortal } from '@/hooks/usePortal';
import { useSnap } from '@/hooks/useSnap';
import { useGrid } from '@/hooks/useGrid';
import { Point } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Ruler, MousePointer2 } from 'lucide-react';
import Vec2 from '@/utils/vec2d';
import { formatLength } from '@/utils/units';

export default function WallDrawer() {
    const { scalePixel, setMode, unit, guidelinesEnabled } = useEngine();
    const { snap, snapWall } = useSnap();
    const { clientToWorldPoint } = useCanvas();
    const { addWall, data, cleanupShortWalls, splitWall, normalizeWallsDebounced } = useEditor();
    const { disabled: snapDisabled } = useGrid();
    const [startPoint, setStartPoint] = useState<Point>();
    const [current, setCurrent] = useState<Point>();
    const [pendingSlice, setPendingSlice] = useState<{ wallId: string; t: number; point: Point }>();
    const [guides, setGuides] = useState<{ x?: number; y?: number } | null>(null);

    const cancel = useCallback(() => {
        setStartPoint(undefined);
        setCurrent(undefined);
        setMode('idle');
    }, [setMode]);

    const applyOrtho = useCallback((origin: Point, target: Point) => {
        const dx = Math.abs(target.x - origin.x);
        const dy = Math.abs(target.y - origin.y);
        return dx >= dy ? { x: target.x, y: origin.y } : { x: origin.x, y: target.y };
    }, []);

    const wallDirs = useMemo(() => {
        const dirs: number[] = [];
        for (const w of data.walls) {
            const a = w.points?.[0];
            const b = w.points?.[1];
            if (!a || !b) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy);
            if (len < 1e-6) continue;
            const ang = Math.atan2(dy, dx);
            dirs.push(ang);
        }
        return dirs;
    }, [data.walls]);

    const normalizeAngle = useCallback((a: number) => {
        let x = a;
        while (x > Math.PI) x -= Math.PI * 2;
        while (x < -Math.PI) x += Math.PI * 2;
        return x;
    }, []);

    const angleDiff = useCallback((a: number, b: number) => {
        return Math.abs(normalizeAngle(a - b));
    }, [normalizeAngle]);

    const applyAngleSnap = useCallback((origin: Point, target: Point, stepDeg: number, toleranceDeg: number) => {
        const dx = target.x - origin.x;
        const dy = target.y - origin.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) return { snapped: false, point: target };

        const ang = Math.atan2(dy, dx);
        const angDeg = (ang * 180) / Math.PI;
        const snappedDeg = Math.round(angDeg / stepDeg) * stepDeg;
        let delta = angDeg - snappedDeg;
        // normalize delta to [-180,180]
        while (delta > 180) delta -= 360;
        while (delta < -180) delta += 360;

        if (Math.abs(delta) > toleranceDeg) return { snapped: false, point: target };

        const snappedRad = (snappedDeg * Math.PI) / 180;
        const p = {
            x: origin.x + Math.cos(snappedRad) * len,
            y: origin.y + Math.sin(snappedRad) * len,
        };
        return { snapped: true, point: p };
    }, []);

    const applyWallParallelSnap = useCallback((origin: Point, target: Point) => {
        const dx = target.x - origin.x;
        const dy = target.y - origin.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6 || wallDirs.length === 0) return { snapped: false, point: target };

        const ang = Math.atan2(dy, dx);
        const tol = (6 * Math.PI) / 180;

        let bestAng: number | null = null;
        let bestDelta = Infinity;

        for (const wAng of wallDirs) {
            // parallel
            const d0 = angleDiff(ang, wAng);
            if (d0 < bestDelta) {
                bestDelta = d0;
                bestAng = wAng;
            }
            // perpendicular
            const wPerp = wAng + Math.PI / 2;
            const d1 = angleDiff(ang, wPerp);
            if (d1 < bestDelta) {
                bestDelta = d1;
                bestAng = wPerp;
            }
        }

        if (bestAng == null || bestDelta > tol) return { snapped: false, point: target };

        const p = {
            x: origin.x + Math.cos(bestAng) * len,
            y: origin.y + Math.sin(bestAng) * len,
        };
        return { snapped: true, point: p };
    }, [wallDirs, angleDiff]);

    const snapToWallBody = useCallback((point: Point, thresholdPx = 25) => {
        if (snapDisabled) return;
        if (!data.walls || data.walls.length === 0) return;

        const threshold = scalePixel(thresholdPx, 1, 2000);
        let best:
            | { wallId: string; t: number; point: Point; distance: number }
            | undefined;

        for (const w of data.walls) {
            const a = w.points?.[0];
            const b = w.points?.[1];
            if (!a || !b) continue;

            const ab = Vec2.sub(b, a);
            const lenSq = Vec2.dot(ab, ab);
            if (lenSq < 1e-9) continue;

            const ap = Vec2.sub(point, a);
            const rawT = Vec2.dot(ap, ab) / lenSq;
            const t = Math.max(0, Math.min(1, rawT));

            // Ignore endpoints here; endpoint snapping is handled separately.
            if (!(t > 1e-4 && t < 1 - 1e-4)) continue;

            const proj = Vec2.add(a, Vec2.mul(ab, t));
            const d = Vec2.dist(point, proj);
            if (d > threshold) continue;

            if (!best || d < best.distance) {
                best = { wallId: w.id, t, point: proj, distance: d };
            }
        }

        if (!best) return;
        return { wallId: best.wallId, t: best.t, point: best.point };
    }, [data.walls, scalePixel, snapDisabled]);

    const snapForDrawing = useCallback((point: Point, thresholdPx = 25) => {
        // Priority: wall endpoints -> wall body -> grid.
        const endpoint = snapWall(point, thresholdPx);
        if (!Vec2.equal(endpoint, point)) {
            return { point: endpoint, pendingSlice: undefined };
        }

        const body = snapToWallBody(point, thresholdPx);
        if (body) {
            return { point: body.point, pendingSlice: body };
        }

        return { point: snap(point, thresholdPx), pendingSlice: undefined };
    }, [snap, snapWall, snapToWallBody]);

    const applyGuidelineSnap = useCallback((p: Point) => {
        // Guidelines are a form of snapping; respect both toggles.
        if (snapDisabled || !guidelinesEnabled) {
            setGuides(null);
            return p;
        }

        const tol = scalePixel(12, 1, 2000);
        let bestDxAbs = Infinity;
        let bestDyAbs = Infinity;
        let guideX: number | undefined;
        let guideY: number | undefined;
        let dxDelta = 0;
        let dyDelta = 0;

        for (const w of data.walls) {
            for (const end of w.points) {
                const dx = end.x - p.x;
                const dy = end.y - p.y;

                const dxAbs = Math.abs(dx);
                const dyAbs = Math.abs(dy);

                if (dxAbs < bestDxAbs) {
                    bestDxAbs = dxAbs;
                    guideX = end.x;
                    dxDelta = dx;
                }
                if (dyAbs < bestDyAbs) {
                    bestDyAbs = dyAbs;
                    guideY = end.y;
                    dyDelta = dy;
                }
            }
        }

        let next = p;
        const nextGuides: { x?: number; y?: number } = {};
        if (guideX !== undefined && bestDxAbs <= tol) {
            next = { ...next, x: next.x + dxDelta };
            nextGuides.x = guideX;
        }
        if (guideY !== undefined && bestDyAbs <= tol) {
            next = { ...next, y: next.y + dyDelta };
            nextGuides.y = guideY;
        }

        setGuides(nextGuides.x !== undefined || nextGuides.y !== undefined ? nextGuides : null);
        return next;
    }, [data.walls, guidelinesEnabled, scalePixel, snapDisabled]);

    const isDrawing = Boolean(startPoint);
    const wallLength = useMemo(() => {
        if (!startPoint || !current) return 0;
        return Vec2.dist(startPoint, current);
    }, [startPoint, current]);

    const points = useMemo(() => {
        if (!startPoint || !current) return;
        return [startPoint, current].map(({ x, y }) => [x, y].join(',')).join(" ");
    }, [startPoint, current]);

    // Portal for wall drawing UI
    useCreatePortal(() => (
        <div style={{
            display: "flex",
            alignItems: 'center',
            justifyContent: "space-between",
            gap: 12,
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 12,
            border: `2px solid ${isDrawing ? '#3b82f6' : '#6b7280'}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: 280
        }}>
            <div style={{ display: "flex", alignItems: 'center', gap: 8 }}>
                <motion.div
                    animate={{
                        scale: isDrawing ? 1.2 : 1,
                        rotate: isDrawing ? 5 : 0
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <Pencil size={20} color={isDrawing ? '#3b82f6' : '#6b7280'} />
                </motion.div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                        fontWeight: 700,
                        fontSize: '14px',
                        color: isDrawing ? '#3b82f6' : '#6b7280',
                        lineHeight: 1.2
                    }}>
                        Wall Drawing
                    </span>
                    <span style={{
                        fontSize: '12px',
                        color: isDrawing ? '#3b82f6' : '#666',
                        opacity: 0.8
                    }}>
                        {isDrawing ? 'Click to place endpoint' : 'Click to start drawing'}
                    </span>
                </div>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                background: isDrawing ? '#3b82f6' : '#6b7280',
                borderRadius: 8,
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                minWidth: 24,
                justifyContent: 'center'
            }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isDrawing ? 'drawing' : 'idle'}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        {isDrawing ? (
                            <>
                                <Ruler size={14} />
                                {formatLength(wallLength, unit)}
                            </>
                        ) : (
                            <>
                                <MousePointer2 size={14} />
                                Ready
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    ), [isDrawing, wallLength]);

    useEffect(() => {
        if (!startPoint) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cancel();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [startPoint, cancel]);

    useMouseMove((e) => {
        const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        if (!startPoint) {
            const snapped = snapForDrawing(world);
            setPendingSlice(snapped.pendingSlice);
            setCurrent(applyGuidelineSnap(snapped.point));
            return;
        }

        // Alt: temporarily disable angle snapping
        if (e.altKey) {
            const endpoint = snapWall(world, 25);
            const snapped = snapForDrawing(endpoint);
            setPendingSlice(snapped.pendingSlice);
            setCurrent(applyGuidelineSnap(snapped.point));
            return;
        }

        // Shift: stronger snapping (45° increments). Also includes ortho.
        if (e.shiftKey) {
            const ortho = applyOrtho(startPoint, world);
            const angSnap = applyAngleSnap(startPoint, ortho, 45, 10);
            if (angSnap.snapped) {
                const snapped = snapForDrawing(angSnap.point);
                setPendingSlice(snapped.pendingSlice);
                setCurrent(applyGuidelineSnap(snapped.point));
            } else {
                const snapped = snapForDrawing(ortho);
                setPendingSlice(snapped.pendingSlice);
                setCurrent(applyGuidelineSnap(snapped.point));
            }
            return;
        }

        // Smart snaps:
        // 1) parallel/perpendicular to existing walls
        // 2) angle increments (15°)
        const parallel = applyWallParallelSnap(startPoint, world);
        if (parallel.snapped) {
            const snapped = snapForDrawing(parallel.point);
            setPendingSlice(snapped.pendingSlice);
            setCurrent(applyGuidelineSnap(snapped.point));
            return;
        }

        const angSnap = applyAngleSnap(startPoint, world, 15, 6);
        if (angSnap.snapped) {
            const snapped = snapForDrawing(angSnap.point);
            setPendingSlice(snapped.pendingSlice);
            setCurrent(applyGuidelineSnap(snapped.point));
        } else {
            const snapped = snapForDrawing(world);
            setPendingSlice(snapped.pendingSlice);
            setCurrent(applyGuidelineSnap(snapped.point));
        }
    }, [snapForDrawing, snapWall, clientToWorldPoint, startPoint, applyOrtho, applyAngleSnap, applyWallParallelSnap, applyGuidelineSnap]);

    useMouseDown((e) => {
        if (e.button == 0) {
            const worldRaw = clientToWorldPoint({ x: e.clientX, y: e.clientY });
            let constrained = startPoint && e.shiftKey ? applyOrtho(startPoint, worldRaw) : worldRaw;

            if (startPoint && !e.altKey) {
                if (e.shiftKey) {
                    constrained = applyAngleSnap(startPoint, constrained, 45, 10).point;
                } else {
                    const parallel = applyWallParallelSnap(startPoint, constrained);
                    if (parallel.snapped) constrained = parallel.point;
                    else constrained = applyAngleSnap(startPoint, constrained, 15, 6).point;
                }
            }

            const snapped = snapForDrawing(constrained);
            const world = applyGuidelineSnap(snapped.point);
            if (!startPoint) {
                setStartPoint(world);
                setPendingSlice(snapped.pendingSlice);
            } else {
                const thickness = 200;
                const len = Vec2.dist(startPoint, world);
                const minLen = Math.max(200, thickness);
                if (len >= minLen) {
                    if (snapped.pendingSlice) {
                        splitWall(snapped.pendingSlice.wallId, snapped.pendingSlice.t);
                    }
                    addWall({
                        points: [startPoint, world],
                        thickness,
                        floor: 0
                    });
                    // Cleanup in case the new segment creates tiny joined stubs elsewhere.
                    cleanupShortWalls(200);
                    // Resolve intersections + overlaps created by this new segment.
                    // Debounced so rapid multi-click drawing normalizes once.
                    normalizeWallsDebounced();
                    setStartPoint(world); // Continue drawing from the last point
                    setPendingSlice(undefined);
                }
            }
        } else {
            // Right click to cancel
            cancel();
        }
    }, [startPoint, clientToWorldPoint, snapForDrawing, addWall, cancel, applyOrtho, applyAngleSnap, applyWallParallelSnap, cleanupShortWalls, splitWall, normalizeWallsDebounced, applyGuidelineSnap]);

    return (
        <>
            <AnimatePresence>
                {startPoint && (
                    <>
                        <AnimatePresence>
                            {guides?.x !== undefined && (
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
                                    style={{ pointerEvents: 'none' }}
                                />
                            )}
                            {guides?.y !== undefined && (
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
                                    style={{ pointerEvents: 'none' }}
                                />
                            )}
                        </AnimatePresence>

                        {/* Start point indicator */}
                        <motion.circle
                            cx={startPoint.x}
                            cy={startPoint.y}
                            r={scalePixel(6, 4, 200)}
                            fill='#3b82f6'
                            stroke='white'
                            strokeWidth={scalePixel(1.5)}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400 }}
                        />

                        {/* Drawing guide line */}
                        {points && current && (
                            <>
                                {/* Pending slice indicator (when snapping to wall body) */}
                                {pendingSlice && (
                                    <motion.circle
                                        cx={pendingSlice.point.x}
                                        cy={pendingSlice.point.y}
                                        r={scalePixel(4, 2, 120)}
                                        fill="#22c55e"
                                        stroke="white"
                                        strokeWidth={scalePixel(1.5)}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ duration: 0.1 }}
                                        style={{ pointerEvents: 'none' }}
                                    />
                                )}

                                <motion.polyline
                                    points={points}
                                    fill='none'
                                    stroke='#3b82f6'
                                    strokeWidth={scalePixel(4)}
                                    strokeDasharray={scalePixel(8)}
                                    strokeLinecap="round"
                                    initial={{ opacity: 0, pathLength: 0 }}
                                    animate={{ opacity: 0.8, pathLength: 1 }}
                                    exit={{ opacity: 0, pathLength: 0 }}
                                    transition={{ duration: 0.2 }}
                                />

                                {/* Current point indicator */}
                                <motion.circle
                                    cx={current.x}
                                    cy={current.y}
                                    r={scalePixel(5, 3, 150)}
                                    fill='#3b82f6'
                                    stroke='white'
                                    strokeWidth={scalePixel(1.5)}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    transition={{ type: "spring", stiffness: 400 }}
                                />

                                {/* Length measurement text */}
                                {wallLength > 50 && (
                                    <motion.text
                                        x={(startPoint.x + current.x) / 2}
                                        y={(startPoint.y + current.y) / 2 - 10}
                                        textAnchor="middle"
                                        fill="#3b82f6"
                                        fontSize={scalePixel(12)}
                                        fontWeight="600"
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        style={{
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        }}
                                    >
                                        {formatLength(wallLength, unit)}
                                    </motion.text>
                                )}
                            </>
                        )}
                    </>
                )}
            </AnimatePresence>

            {/* Always show current cursor position indicator when not drawing */}
            <AnimatePresence>
                {current && !startPoint && (
                    <motion.circle
                        cx={current.x}
                        cy={current.y}
                        r={scalePixel(3, 2, 100)}
                        fill='#6b7280'
                        stroke='white'
                        strokeWidth={scalePixel(1)}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.1 }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}