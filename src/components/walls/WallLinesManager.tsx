import { useCanvas, useMouseDown, useMouseMove, useMouseUp } from '@/hooks/useCanvas';
import { useEditor } from '@/hooks/useEditor';
import { useEngine } from '@/hooks/useEngine';
import { useCreatePortal } from '@/hooks/usePortal';
import { useSnap } from '@/hooks/useSnap';
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
    const { updateWalls, normalizeWalls } = useEditor();
    const { clientToWorldPoint } = useCanvas();
    const { mode, scalePixel } = useEngine();

    const [hoveredId, setHoveredId] = useState<string>();
    const [movingId, setMovingId] = useState<string>();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [intersections, setIntersections] = useState<Wall[]>([]);

    const cuttedLines = useMemo<{ id: string, segment: LineSegment }[]>(() => 
        walls.map(wall => {
            const segment = Line2.extendSegment(wall.points, -Math.max(Math.abs((wall.thickness / 2) + wall.thickness / 4), 17));
            return { id: wall.id, segment };
        }), 
        [walls]
    );

    const movingWall = useMemo(() => walls.find(wall => wall.id == movingId), [walls, movingId]);
    const isMoving = Boolean(movingWall);
    const isHovering = Boolean(hoveredId);
    const connectionCount = connections.reduce((total, conn) => total + conn.connections.length, 0);

    const HOVER_THRESHOLD = useMemo(() => scalePixel(14, 6, 40), [scalePixel]);

    const findNearestId = useCallback((world: Point) => {
        let min = Infinity;
        let id: string | undefined;
        
        for (const cWall of cuttedLines) {
            const distance = Line2.getDistanceToSegment(world, cWall.segment);
            if (distance < min) {
                min = distance;
                id = cWall.id;
            }
        }
        
        return min <= HOVER_THRESHOLD ? id : undefined;
    }, [cuttedLines, HOVER_THRESHOLD]);

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
        e.currentTarget.style.cursor = "move";
        const wall = walls.find(wall => wall.id == hoveredId);
        if (!wall) return;

        const connections = wall.points.map((point, index) => {
            const connections = WallUtils.findConnectedAtPoint(point, walls, wall);
            if (connections.length > 0) return { connections, point, index };
            return null;
        }).filter(e => e != null) as Connection[];
        
        setConnections(connections);
        setMovingId(hoveredId);
    }, [hoveredId, mode, walls]);

    useMouseUp(() => {
        if (!movingId || ["slice-wall", "eraser"].includes(mode)) return;
        setMovingId(undefined);
        setHoveredId(undefined);
        setConnections([]);
        normalizeWalls();
    }, [movingId, mode, normalizeWalls]);

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
            const p0 = Vec2.add(seg[0], offset);
            const p1 = Vec2.add(seg[1], offset);
            setIntersections([]);

            if (Vec2.dist(p0, p1) < movingWall.thickness) return;

            const p0Connection = connections.find(c => c.index == 0);
            const p1Connection = connections.find(c => c.index == 1);
            const updateStack: [string, Record<string, any>][] = [
                [movingWall.id, { points: [p0, p1] }]
            ];

            if (p0Connection) {
                p0Connection.connections.forEach(connection => {
                    const segment = connection.wall.points;
                    updateStack.push([
                        connection.wall.id,
                        { points: segment.map((point, i) => i == connection.index ? p0 : point) as LineSegment }
                    ]);
                });
            }

            if (p1Connection) {
                p1Connection.connections.forEach(connection => {
                    const segment = connection.wall.points;
                    updateStack.push([
                        connection.wall.id,
                        { points: segment.map((point, i) => i == connection.index ? p1 : point) as LineSegment }
                    ]);
                });
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
    }, [movingWall, mode, walls, clientToWorldPoint, updateWalls, findNearestId, connections]);

    return (
        <>
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
                            strokeWidth={isMoving ? 10 : (isLineHover ? 12 : 8)}
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