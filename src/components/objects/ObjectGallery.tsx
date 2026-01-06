import { OBJECT_DEFINITIONS, OBJECT_DRAG_MIME, serializeObjectDragPayload } from "./objectRegistry";
import { ObjectGlyph } from "./objectShapes";

export default function ObjectGallery() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#262626" }}>Objects</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {OBJECT_DEFINITIONS.map((def) => (
                    <button
                        key={def.kind}
                        className="action-button"
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData(
                                OBJECT_DRAG_MIME,
                                serializeObjectDragPayload({ kind: def.kind })
                            );
                            // fallback for browsers that only show text drags
                            e.dataTransfer.setData("text/plain", def.kind);
                            e.dataTransfer.effectAllowed = "copy";
                        }}
                        title="Drag onto canvas"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                            justifyContent: "flex-start",
                            padding: "10px 12px",
                        }}>
                        <span
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: "rgba(255,255,255,0.08)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flex: "0 0 auto",
                            }}>
                            <ObjectGlyph kind={def.kind} style={{ opacity: 0.95 }} />
                        </span>
                        <span style={{ fontWeight: 800, letterSpacing: 0.2 }}>{def.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
