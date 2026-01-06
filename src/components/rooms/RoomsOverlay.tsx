import { useEditor } from "@/hooks/useEditor";
import { useEngine } from "@/hooks/useEngine";
import { detectRoomsFromWalls } from "@/utils/rooms";
import Poly2 from "@/utils/polygon2d";
import { useMemo } from "react";

function polygonCentroid(poly: { x: number; y: number }[]) {
    // Area-weighted centroid (works for simple polygons). Fallback to average if degenerate.
    let a = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < poly.length; i++) {
        const p0 = poly[i]!;
        const p1 = poly[(i + 1) % poly.length]!;
        const cross = p0.x * p1.y - p1.x * p0.y;
        a += cross;
        cx += (p0.x + p1.x) * cross;
        cy += (p0.y + p1.y) * cross;
    }

    if (Math.abs(a) < 1e-9) {
        const avg = poly.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        return { x: avg.x / poly.length, y: avg.y / poly.length };
    }

    a *= 0.5;
    return { x: cx / (6 * a), y: cy / (6 * a) };
}

export default function RoomsOverlay() {
    const { data } = useEditor();
    const { unit, scalePixel } = useEngine();

    const rooms = useMemo(() => {
        return detectRoomsFromWalls(data.walls, {
            epsilon: 1e-3,
            minArea: 2500,
        });
    }, [data.walls]);

    const metaByKey = useMemo(() => {
        const entries = data.roomsMeta ?? [];
        const map = new Map<string, { name: string; color: string }>();
        for (const m of entries) map.set(m.key, { name: m.name, color: m.color });
        return map;
    }, [data.roomsMeta]);

    return (
        <g id="rooms" style={{ pointerEvents: 'none' }}>
            {rooms.map((room) => {
                const meta = metaByKey.get(room.key);
                const color = meta?.color ?? room.defaultColor;
                const name = meta?.name ?? room.id;
                const center = polygonCentroid(room.polygon);
                const fontSize = scalePixel(14, 10, 22);
                const subFontSize = scalePixel(12, 9, 18);
                const strokeW = scalePixel(4, 2, 10);

                const areaText = `${Math.round(room.area)} ${unit}²`;

                return (
                    <g key={room.key}>
                        <path
                            d={Poly2.toPath(room.polygon)}
                            fill={color}
                            fillOpacity={0.10}
                            stroke={color}
                            strokeOpacity={0.55}
                            strokeWidth={2}
                        />

                        <g transform={`translate(${center.x} ${center.y})`}>
                            {/* Outline for readability on colored fill */}
                            <text
                                x={0}
                                y={0}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontFamily="Figtree, sans-serif"
                                fontWeight={800}
                                fontSize={fontSize}
                                fill="#111827"
                                stroke="#ffffff"
                                strokeWidth={strokeW}
                                paintOrder="stroke"
                                opacity={0.9}
                            >
                                {name}
                            </text>
                            <text
                                x={0}
                                y={fontSize * 1.2}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontFamily="Figtree, sans-serif"
                                fontWeight={700}
                                fontSize={subFontSize}
                                fill="#374151"
                                stroke="#ffffff"
                                strokeWidth={strokeW}
                                paintOrder="stroke"
                                opacity={0.85}
                            >
                                {areaText}
                            </text>
                        </g>
                    </g>
                );
            })}
        </g>
    );
}
