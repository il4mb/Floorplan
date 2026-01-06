import { useCanvas, useMouseDown, useMouseMove, useMouseUp } from '@/hooks/useCanvas';
import { useEditor } from '@/hooks/useEditor';
import { useEngine } from '@/hooks/useEngine';
import { useCreatePortal } from '@/hooks/usePortal';
import { useSnap } from '@/hooks/useSnap';
import { useClearShortWalls } from '@/hooks/useWallEngine';
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
    const { updateWall, normalizeWalls } = useEditor();
    const { clientToWorldPoint } = useCanvas();
    const { scalePixel } = useEngine();
    const { snap } = useSnap();
    const cleanWalls = useClearShortWalls();
    const [moving, setMoving] = useState<Moving[]>([]);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const [movingIndex, setMovingIndex] = useState(-1);

    const isMoving = useMemo(() => moving.length > 0, [moving]);
    const isHovering = useMemo(() => hoveredIndex > -1, [hoveredIndex]);
    const movingCount = moving.length;
    const CLICK_THRESHOLD = useMemo(() => scalePixel(15), [scalePixel]);

    const points = useMemo(() => {
        return Poly2.removeDuplicate(walls.map(wall => wall.points).flat());
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
        const snapped = snap(point);
        moving.forEach((move) => {
            const wall = walls.find(w => w.id == move.wallId);
            if (!wall) return;
            const wallLineSeg = wall.points;
            const index = move.wallPointIndex;
            const points = wallLineSeg.map((x, i) => i == index ? snapped : x) as LineSegment;
            updateWall(wall.id, { points });
        });
    }, [snap, moving, walls, updateWall]);

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
        }
    }, [points, CLICK_THRESHOLD, clientToWorldPoint, walls]);

    useMouseUp(() => {
        if (!isMoving) return;
        cleanWalls();
        setMoving([]);
        setMovingIndex(-1);
        setHoveredIndex(-1);
        normalizeWalls();
    }, [cleanWalls, isMoving, normalizeWalls]);

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