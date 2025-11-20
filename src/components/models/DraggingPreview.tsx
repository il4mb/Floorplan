import { useCanvas, useMouseDown } from "@/hooks/useCanvas";
import { useDragging, useSetDragging } from "@/hooks/useModels";
import { usePointer } from "@/hooks/usePointer";
import { createElement, useMemo } from "react";
import { useStateActions } from "../FloorplanProvider";
import { useSelectedLayerId } from "../LayersProvider";

export default function DraggingPreview() {

    const layerId = useSelectedLayerId();
    const actions = useStateActions();
    const { worldToScreenPoint, clientToWorldPoint, snapPoint } = useCanvas();
    const pointer = usePointer();
    const setDragging = useSetDragging();
    const dragging = useDragging();

    const worldPoint = useMemo(() => {
        if (!pointer) return null;
        return worldToScreenPoint(pointer);
    }, [worldToScreenPoint, pointer]);


    useMouseDown((e) => {
        if (!dragging || !layerId) return;
        if (e.button == 2) {
            e.preventDefault();
            setDragging(null);
        } else if (e.button == 0) {

            e.preventDefault();
            const worldPoint = snapPoint(clientToWorldPoint({ x: e.clientX, y: e.clientY }));
            actions.addNode({
                ...worldPoint,
                type: dragging.type,
                layerId: layerId,
                rotation: 0,
                points: []
            });
            setDragging(null);
        }
    }, [dragging, layerId, clientToWorldPoint]);


    if (!dragging || !worldPoint) return;

    return (
        <div key={dragging.type}
            style={{
                position: "absolute",
                top: worldPoint.y - (35 / 2),
                left: worldPoint.x - (35 / 2),
                zIndex: 9999,
                pointerEvents: 'none',
                opacity: 0.5,
                width: 35,
                height: 35
            }}
            className="bg-gray-900 flex flex-col items-center p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors">
                {createElement(dragging.icon, { width: 20, height: 20, color: 'currentColor' })}
            </div>
        </div>
    );
}