import { useEngine } from '@/hooks/useEngine';
import { Wall } from '@/types';
import Vec2 from '@/utils/vec2d';
import { formatLength } from '@/utils/units';
import { useMemo } from 'react';

export interface WallLengthsOverlayProps {
    walls: Wall[];
}

export default function WallLengthsOverlay({ walls }: WallLengthsOverlayProps) {
    const { unit, scalePixel } = useEngine();

    const items = useMemo(() => {
        return walls
            .map((w) => {
                const a = w.points?.[0];
                const b = w.points?.[1];
                if (!a || !b) return null;

                const len = Vec2.dist(a, b);
                if (len < 50) return null;

                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                const segLen = Math.hypot(dx, dy) || 1;
                const nx = -dy / segLen;
                const ny = dx / segLen;

                const offset = (w.thickness ?? 0) / 2 + scalePixel(10);
                const pos = { x: mid.x + nx * offset, y: mid.y + ny * offset };

                // Keep text upright.
                const rot = angle > 90 || angle < -90 ? angle + 180 : angle;

                return {
                    id: w.id,
                    pos,
                    rot,
                    text: formatLength(len, unit),
                };
            })
            .filter((x): x is NonNullable<typeof x> => Boolean(x));
    }, [walls, unit, scalePixel]);

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
                        fill="#444444"
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
