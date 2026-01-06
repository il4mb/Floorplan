import { useEditor } from "@/hooks/useEditor";
import { useEngine } from "@/hooks/useEngine";
import { detectRoomsFromWalls } from "@/utils/rooms";
import { useEffect, useMemo } from "react";

export default function RoomList() {
    const { data, upsertRoomMeta, updateRoomMeta } = useEditor();
    const { unit } = useEngine();

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

    // Ensure every detected room gets an initial name + color (persisted)
    useEffect(() => {
        for (const room of rooms) {
            if (!metaByKey.has(room.key)) {
                upsertRoomMeta({
                    key: room.key,
                    name: room.id,
                    color: room.defaultColor,
                });
            }
        }
    }, [rooms, metaByKey, upsertRoomMeta]);

    const unitSuffix = `${unit}²`;

    return (
        <div className="fp-panel fp-stack">
            <div className="fp-title">
                <span>Rooms</span>
                <span className="fp-muted">{rooms.length}</span>
            </div>

            {rooms.length === 0 ? (
                <div className="fp-muted">
                    No rooms detected (needs closed loops).
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="fp-card">
                            <div className="fp-row" style={{ flex: 1, minWidth: 0 }}>
                                <input
                                    className="fp-color"
                                    type="color"
                                    value={(metaByKey.get(room.key)?.color ?? room.defaultColor)}
                                    onChange={(e) => updateRoomMeta(room.key, { color: e.target.value })}
                                    aria-label="Room color"
                                />
                                <input
                                    className="fp-input"
                                    value={(metaByKey.get(room.key)?.name ?? room.id)}
                                    onChange={(e) => updateRoomMeta(room.key, { name: e.target.value })}
                                    aria-label="Room name"
                                />
                            </div>

                            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#374151", whiteSpace: 'nowrap' }}>
                                {Math.round(room.area)} {unitSuffix}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
