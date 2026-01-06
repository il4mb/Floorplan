import { useMouseDown, useMouseMove, useMouseUp, usePointer } from '@/hooks/useCanvas';
import { useEditor } from '@/hooks/useEditor';
import { useCreatePortal } from '@/hooks/usePortal';
import { useWallsPolygon } from '@/hooks/useWallEngine';
import { Wall } from '@/types';
import Line2 from '@/utils/line2d';
import Poly2, { Polygon } from '@/utils/polygon2d';
import { Eraser, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface WallEraserProps {
    walls: Wall[];
}

export default function WallEraser({ walls }: WallEraserProps) {
    const pointer = usePointer();
    const { removeWalls } = useEditor();
    const wallsPolygon = useWallsPolygon();
    const [removeIds, setRemoveIds] = useState<string[]>([]);

    const nearestWalls = useMemo(() => 
        pointer && walls.filter(wall => Line2.getDistanceToSegment(pointer, wall.points) < 10), 
        [pointer, walls]
    );

    const overlaps = useMemo(() => {
        return nearestWalls?.map(wall => {
            const polygon = wallsPolygon.get(wall.id);
            return { polygon, wall };
        });
    }, [nearestWalls, wallsPolygon]);

    const polygons = useMemo<Polygon[]>(
        () => overlaps?.filter(e => e.polygon != null).map(e => e.polygon as Polygon) || [], 
        [overlaps]
    );

    const wallCount = overlaps?.length || 0;
    const willRemoveCount = removeIds.length;

    useCreatePortal(() => (
        <div style={{ 
            display: "flex", 
            alignItems: 'center', 
            justifyContent: "space-between", 
            gap: 12,
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 12,
            border: '2px solid #ff4444',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: 200
        }}>
            <div style={{ display: "flex", alignItems: 'center', gap: 8 }}>
                <motion.div
                    animate={{ 
                        rotate: willRemoveCount > 0 ? 15 : 0,
                        scale: willRemoveCount > 0 ? 1.1 : 1
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <Eraser size={20} color={willRemoveCount > 0 ? '#ff6b6b' : '#ff4444'} />
                </motion.div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ 
                        fontWeight: 700, 
                        fontSize: '14px', 
                        color: willRemoveCount > 0 ? '#ff6b6b' : '#ff4444',
                        lineHeight: 1.2
                    }}>
                        Wall Eraser
                    </span>
                    <span style={{
                        fontSize: '12px',
                        color: willRemoveCount > 0 ? '#ff6b6b' : '#666',
                        opacity: 0.8
                    }}>
                        {willRemoveCount > 0 ? 'Click to remove' : 'Hover over walls'}
                    </span>
                </div>
            </div>
            
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                padding: '4px 8px',
                background: willRemoveCount > 0 ? '#ff4444' : (wallCount > 0 ? '#22c55e' : '#6b7280'),
                borderRadius: 8,
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                minWidth: 24,
                justifyContent: 'center'
            }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={willRemoveCount > 0 ? 'remove' : wallCount > 0 ? 'hover' : 'idle'}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        {willRemoveCount > 0 ? (
                            <>
                                <AlertTriangle size={14} />
                                {willRemoveCount}
                            </>
                        ) : wallCount > 0 ? (
                            <>
                                <CheckCircle2 size={14} />
                                {wallCount}
                            </>
                        ) : (
                            '0'
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    ), [wallCount, willRemoveCount]);

    useMouseDown(() => {
        setRemoveIds(overlaps?.map(e => e.wall.id) || []);
    }, [overlaps]);

    useMouseUp(() => {
        if (removeIds.length < 1) return;
        removeWalls(removeIds);
        setRemoveIds([]);
    }, [removeIds, removeWalls]);

    useMouseMove((e) => {
        const hasWalls = polygons.length > 0;
        e.currentTarget.style.cursor = hasWalls ? "pointer" : "default";
        
        if (hasWalls) {
            setRemoveIds([]);
        }
    }, [polygons]);

    return (
        <>
            {polygons.map((item, index) => {
                const wallId = overlaps?.[index]?.wall.id;
                const willRemove = removeIds.includes(wallId || '');
                
                return (
                    <motion.path
                        key={wallId}
                        d={Poly2.toPath(item)}
                        fill={willRemove ? '#ff4444' : '#ef4444'}
                        fillOpacity={willRemove ? 0.4 : 0.2}
                        stroke={willRemove ? '#ff4444' : '#ef4444'}
                        strokeWidth={willRemove ? 3 : 2}
                        initial={{ opacity: 0 }}
                        animate={{ 
                            opacity: willRemove ? 0.4 : 0.2,
                            strokeWidth: willRemove ? 3 : 2
                        }}
                        transition={{ duration: 0.15 }}
                    />
                );
            })}
        </>
    );
}