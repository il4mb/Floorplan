
import { useEngine } from '@/hooks/useEngine';
import { Wall, Point } from '@/types';
import Vec2 from '@/utils/vec2d';
import { formatLength } from '@/utils/units';
import { useMemo } from 'react';

export interface WallLengthsOverlayProps {
    walls: Wall[];
}

export default function WallLengthsOverlay({ walls }: WallLengthsOverlayProps) {
    const { unit, scalePixel, showWallRules } = useEngine();

    if (!showWallRules) return null;

    // Helper: find straight chains (collinear walls)
    function findStraightChains(walls: Wall[]): Array<{ ids: string[], points: Point[] }> {
        const chains: Array<{ ids: string[], points: Point[] }> = [];
        const used = new Set<string>();
        for (const wall of walls) {
            if (used.has(wall.id)) continue;
            const chain = [wall];
            let dir = Vec2.normalize(Vec2.sub(wall.points[1], wall.points[0]));
            let last = wall;
            let changed = true;
            while (changed) {
                changed = false;
                for (const next of walls) {
                    if (used.has(next.id) || chain.includes(next)) continue;
                    // Check if next is collinear and shares endpoint
                    const nextDir = Vec2.normalize(Vec2.sub(next.points[1], next.points[0]));
                    if (Math.abs(Vec2.cross(dir, nextDir)) < 0.01) {
                        if (Vec2.dist(last.points[1], next.points[0]) < 1) {
                            chain.push(next);
                            dir = nextDir;
                            last = next;
                            changed = true;
                            break;
                        }
                    }
                }
            }
            if (chain.length > 1) {
                for (const w of chain) used.add(w.id);
                chains.push({ ids: chain.map(w => w.id), points: [chain[0]!.points[0], chain[chain.length-1]!.points[1]] });
            }
        }
        return chains;
    }

    const items = useMemo(() => {
        const result: Array<{ id: string, pos: { x: number; y: number }, rot: number, text: string }> = [];
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
            const rot = angle > 90 || angle < -90 ? angle + 180 : angle;
            const text = formatLength(len, unit);
            // Move labels further away from wall so rule is not inside the wall
            const labelOffset = (w.thickness ?? 0) + scalePixel(0);
            result.push({ id: `${w.id}-a`, pos: { x: mid.x + nx * labelOffset, y: mid.y + ny * labelOffset }, rot, text });
            result.push({ id: `${w.id}-b`, pos: { x: mid.x - nx * labelOffset, y: mid.y - ny * labelOffset }, rot, text });
        }
        return result;
    }, [walls, unit, scalePixel]);

    // Find straight chains for total length
    const chains = useMemo(() => findStraightChains(walls), [walls]);

    const fontSize = scalePixel(12);
    const outline = scalePixel(4);

    return (
        <g id="wall-lengths" style={{ pointerEvents: 'none' }}>
            {/* Individual wall lengths (both sides) */}
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
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth={outline}
                        paintOrder="stroke"
                        opacity={0.9}>
                        {it.text}
                    </text>
                </g>
            ))}

            {/* Total length for straight chains */}
            {chains.map((chain, i) => {
                const a = chain.points[0]! as Point;
                const b = chain.points[1]! as Point;
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                const rot = angle > 90 || angle < -90 ? angle + 180 : angle;
                const totalLen = formatLength(Vec2.dist(a, b), unit);
                // Offset above chain
                const segLen = Math.hypot(dx, dy) || 1;
                const nx = -dy / segLen;
                const ny = dx / segLen;
                // Move rule line further outside wall
                const ruleOffset = (walls.find(w => w.id === chain.ids[0])?.thickness ?? 0) + scalePixel(32);
                const a2 = { x: a.x + nx * ruleOffset, y: a.y + ny * ruleOffset };
                const b2 = { x: b.x + nx * ruleOffset, y: b.y + ny * ruleOffset };
                const labelOffset = ruleOffset + scalePixel(8);
                const pos = { x: mid.x + nx * labelOffset, y: mid.y + ny * labelOffset };
                return (
                    <g key={`chain-${i}`}>
                        {/* Rule line (outside wall) */}
                        <line x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} stroke="#2563eb" strokeWidth={scalePixel(4)} opacity={0.5} />
                        {/* Total length label */}
                        <g transform={`translate(${pos.x} ${pos.y}) rotate(${rot})`}>
                            <text
                                x={0}
                                y={0}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontFamily="Figtree, sans-serif"
                                fontWeight={800}
                                fontSize={fontSize + 2}
                                fill="#2563eb"
                                stroke="#ffffff"
                                strokeWidth={outline}
                                paintOrder="stroke"
                                opacity={0.95}
                            >
                                {totalLen}
                            </text>
                        </g>
                    </g>
                );
            })}
        </g>
    );
}
