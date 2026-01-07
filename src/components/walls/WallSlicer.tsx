import { useMouseDown, usePointer } from '@/hooks/useCanvas';
import { useEditor } from '@/hooks/useEditor';
import { useCreatePortal } from '@/hooks/usePortal';
import { Point, Wall } from '@/types';
import Line2 from '@/utils/line2d';
import Poly2 from '@/utils/polygon2d';
import Vec2 from '@/utils/vec2d';
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEngine } from '@/hooks/useEngine';
import { formatLength } from '@/utils/units';

type Nearest = {
    wall?: Wall;
    point?: Point;
    distance: number;
}

export interface WallSlicerProps {
    walls: Wall[];
}

export default function WallSlicer({ walls }: WallSlicerProps) {
    const { splitWall, cleanupShortWalls } = useEditor();
    const pointer = usePointer();
    const { unit, scalePixel } = useEngine();
    
    const nearestWalls = useMemo(() => {
        if (!pointer) return;
        const margin = scalePixel(10, 4, 80);
        return walls.filter(wall => {
            const d = Line2.getDistanceToSegment(pointer, wall.points);
            return d <= (wall.thickness / 2) + margin;
        });
    }, [pointer, walls, scalePixel]);
    
    const nearest = useMemo(() => {
        if (!nearestWalls || !pointer) return;
        return nearestWalls.reduce((acc, cur) => {
            const safeDistance = cur.thickness + (cur.thickness / 2);
            const point = Line2.getNearestPointOnSegment(pointer, cur.points);
            const distPointA = Vec2.dist(cur.points[0], point);
            const distPointB = Vec2.dist(cur.points[1], point);
            const distToCursor = Vec2.dist(point, pointer);

            if (distToCursor < acc.distance && distPointA > safeDistance && distPointB > safeDistance) {
                acc.distance = distToCursor;
                acc.wall = cur;
                acc.point = point;
            }
            return acc;
        }, { distance: Infinity, point: undefined, wall: undefined } as unknown as Nearest);
    }, [nearestWalls, pointer]);

    const polygon = useMemo(() => {
        if (!nearest?.wall || !nearest.point) return;

        const pts = nearest.wall.points;
        const p = nearest.point;
        const tangent = Vec2.normalize(Vec2.sub(pts[1], pts[0]));
        const normal = Line2.normal(pts);

        const size = nearest.wall.thickness;
        const half = size / 2;
        const pad = scalePixel(5, 2, 30);
        const tang = scalePixel(4, 2, 30);
        const pA = Vec2.add(p, Vec2.add(Vec2.mul(tangent, tang), Vec2.mul(normal, half + pad)));
        const pB = Vec2.add(p, Vec2.add(Vec2.mul(tangent, -tang), Vec2.mul(normal, half + pad)));
        const pC = Vec2.add(p, Vec2.add(Vec2.mul(tangent, -tang), Vec2.mul(normal, -half - pad)));
        const pD = Vec2.add(p, Vec2.add(Vec2.mul(tangent, tang), Vec2.mul(normal, -half - pad)));

        return Poly2.reorders([pA, pB, pC, pD]);
    }, [nearest, scalePixel]);

    const canSlice = Boolean(nearest?.wall && nearest?.point);
    const wallThickness = nearest?.wall?.thickness || 0;

    // Portal for slicer UI
    useCreatePortal(() => (
        <div style={{ 
            display: "flex", 
            alignItems: 'center', 
            justifyContent: "space-between", 
            gap: 12,
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 12,
            border: `2px solid ${canSlice ? '#22c55e' : '#6b7280'}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: 240
        }}>
            <div style={{ display: "flex", alignItems: 'center', gap: 8 }}>
                <motion.div
                    animate={{ 
                        rotate: canSlice ? 5 : 0,
                        scale: canSlice ? 1.1 : 1
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <Scissors 
                        size={20} 
                        color={canSlice ? '#22c55e' : '#6b7280'} 
                    />
                </motion.div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ 
                        fontWeight: 700, 
                        fontSize: '14px', 
                        color: canSlice ? '#22c55e' : '#6b7280',
                        lineHeight: 1.2
                    }}>
                        Wall Slicer
                    </span>
                    <span style={{
                        fontSize: '12px',
                        color: canSlice ? '#22c55e' : '#666',
                        opacity: 0.8
                    }}>
                        {canSlice ? 'Click to split wall' : 'Hover over wall to slice'}
                    </span>
                </div>
            </div>
            
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                padding: '4px 8px',
                background: canSlice ? '#22c55e' : '#6b7280',
                borderRadius: 8,
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                minWidth: 24,
                justifyContent: 'center'
            }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={canSlice ? 'ready' : 'idle'}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        {canSlice ? (
                            <>
                                <CheckCircle2 size={14} />
                                {formatLength(wallThickness, unit)}
                            </>
                        ) : (
                            <>
                                <AlertCircle size={14} />
                                —
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    ), [canSlice, wallThickness]);

    useMouseDown(() => {
        if (!nearest?.wall || !nearest.point) return;
        
        const wallId = nearest.wall.id;
        const [A, B] = nearest.wall.points;
        const P = nearest.point;
        const AB = Vec2.sub(B, A);
        const AP = Vec2.sub(P, A);
        const t = Vec2.dot(AP, AB) / Vec2.dot(AB, AB);

        if (t <= 0 || t >= 1) return;

        splitWall(wallId, t);
        cleanupShortWalls(200);
    }, [nearest, splitWall, cleanupShortWalls]);

    return (
        <>
            <AnimatePresence>
                {polygon && (
                    <motion.path
                        d={Poly2.toPath(polygon)}
                        fill='#22c55e'
                        fillOpacity={0.3}
                        stroke='#22c55e'
                        strokeWidth={2}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </AnimatePresence>

            {/* Visual indicator at the slice point */}
            <AnimatePresence>
                {nearest?.point && (
                    <motion.circle
                        cx={nearest.point.x}
                        cy={nearest.point.y}
                        r={4}
                        fill='#22c55e'
                        stroke='white'
                        strokeWidth={1.5}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400 }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}