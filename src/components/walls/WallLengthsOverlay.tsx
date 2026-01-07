import { useEngine } from '@/hooks/useEngine';
import { Wall } from '@/types';
import Vec2 from '@/utils/vec2d';
import { formatLength } from '@/utils/units';
import { useMemo } from 'react';

export interface WallLengthsOverlayProps {
    walls: Wall[];
}

interface LengthItem {
    id: string;
    pos: { x: number; y: number };
    rot: number;
    text: string;
    side: 'inside' | 'outside';
}

export default function WallLengthsOverlay({ walls }: WallLengthsOverlayProps) {
    const { unit, scalePixel, wallRuleMode } = useEngine();

    const items = useMemo(() => {
        const result: LengthItem[] = [];
        
        for (const w of walls) {
            const a = w.points?.[0];
            const b = w.points?.[1];
            if (!a || !b) continue;

            const len = Vec2.dist(a, b);
            if (len < 50) continue;

            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            const segLen = Math.hypot(dx, dy) || 1;
            const nx = -dy / segLen;
            const ny = dx / segLen;

            // Keep text upright.
            const rot = angle > 90 || angle < -90 ? angle + 180 : angle;
            const text = formatLength(len, unit);

            // Calculate inside and outside positions
            const baseOffset = (w.thickness ?? 0) / 2 + scalePixel(10);
            
            // Outside position (positive normal direction)
            const outsidePos = { x: mid.x + nx * baseOffset, y: mid.y + ny * baseOffset };
            // Inside position (negative normal direction)
            const insidePos = { x: mid.x - nx * baseOffset, y: mid.y - ny * baseOffset };

            if (wallRuleMode === 'outside' || wallRuleMode === 'both') {
                result.push({
                    id: `${w.id}-outside`,
                    pos: outsidePos,
                    rot,
                    text,
                    side: 'outside'
                });
            }

            if (wallRuleMode === 'inside') {
                result.push({
                    id: `${w.id}-inside`,
                    pos: insidePos,
                    rot,
                    text,
                    side: 'inside'
                });
            }

            if (wallRuleMode === 'both') {
                // Only add inside if it would be different (for 'both' mode)
                // Since inside/outside measurements are the same for centerline,
                // we show inside only when 'both' is selected
                result.push({
                    id: `${w.id}-inside`,
                    pos: insidePos,
                    rot,
                    text,
                    side: 'inside'
                });
            }
        }

        return result;
    }, [walls, unit, scalePixel, wallRuleMode]);

    const fontSize = scalePixel(12);
    const outline = scalePixel(4);

    return (
        <g id="wall-lengths" style={{ pointerEvents: 'none' }}>
            {items.map((it) => (
                <g key={it.id} transform={`translate(${it.pos.x} ${it.pos.y}) rotate(${it.rot})`}>
                    <text
                        x={0}
                        y={0}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontFamily="Figtree, sans-serif"
                        fontWeight={800}
                        fontSize={fontSize}
                        fill={it.side === 'inside' ? '#2563eb' : '#444444'}
                        stroke="#ffffff"
                        strokeWidth={outline}
                        paintOrder="stroke"
                        opacity={0.9}
                    >
                        {it.text}
                    </text>
                </g>
            ))}
        </g>
    );
}
