import { useCanvas, useMouseMove, useMouseUp } from "@/hooks/useCanvas";
import { useEditor } from "@/hooks/useEditor";
import { useEngine } from "@/hooks/useEngine";
import { useSnap } from "@/hooks/useSnap";
import { Point } from "@/types";
import { useMemo, useState } from "react";
import { getObjectDefinition } from "./objectRegistry";
import { findNearestWallAttachment, getWallAngleDeg, pointOnWall } from "./wallAttach";
import { ObjectSvg } from "./objectShapes";

export default function NodeEngine() {
    const { data, updateNode, removeNode } = useEditor();
    const { clientToWorldPoint } = useCanvas();
    const { scalePixel, mode } = useEngine();
    const { snapGrid } = useSnap();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragging, setDragging] = useState<{ id: string; offset: Point } | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const walls = useMemo(() => data.walls ?? [], [data.walls]);
    const nodes = useMemo(() => data.node ?? [], [data.node]);

    const nodePoses = useMemo(() => {
        const map = new Map<string, { coordinate: Point; rotation: number }>();
        for (const node of nodes) {
            if (node.kind === 'door' && node.wallId && typeof node.wallT === 'number') {
                const wall = walls.find(w => w.id === node.wallId);
                if (wall) {
                    map.set(node.id, {
                        coordinate: pointOnWall(wall, node.wallT),
                        rotation: getWallAngleDeg(wall),
                    });
                    continue;
                }
            }
            map.set(node.id, { coordinate: node.coordinate, rotation: node.rotation ?? 0 });
        }
        return map;
    }, [nodes, walls]);

    const beginDrag = (nodeId: string, world: Point) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        const pose = nodePoses.get(node.id);
        const center = pose?.coordinate ?? node.coordinate;

        setSelectedId(node.id);
        setDragging({
            id: node.id,
            offset: { x: world.x - center.x, y: world.y - center.y },
        });
    };

    useMouseMove((e) => {
        if (!dragging) return;
        e.preventDefault();

        const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        const draggedNode = nodes.find(n => n.id === dragging.id);
        if (draggedNode?.kind === 'door') {
            const nearest = findNearestWallAttachment(world, walls);
            const threshold = scalePixel(30);
            if (!nearest || nearest.distance > threshold) return;
            updateNode(dragging.id, {
                wallId: nearest.wallId,
                wallT: nearest.t,
                coordinate: nearest.point,
                rotation: nearest.angleDeg,
            });
        } else {
            const next = snapGrid({ x: world.x - dragging.offset.x, y: world.y - dragging.offset.y });
            updateNode(dragging.id, { coordinate: next });
        }
        e.currentTarget.style.cursor = "move";
    }, [dragging, clientToWorldPoint, snapGrid, updateNode, nodes, walls, scalePixel]);

    useMouseUp((e) => {
        if (!dragging) return;
        e.preventDefault();
        setDragging(null);
        e.currentTarget.style.cursor = "default";
    }, [dragging]);

    const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
        if (mode === 'delete') {
            e.preventDefault();
            e.stopPropagation();
            removeNode(nodeId);
        }
    };

    return (
        <g id="nodes">
            {nodes.map((node) => {
                const def = getObjectDefinition(node.kind);
                const w = def.size.width;
                const h = def.size.height;
                const isSelected = selectedId === node.id;
                const isHovered = hoveredId === node.id;
                const isDeleteMode = mode === 'delete';

                // Keep object outline visually consistent on screen (world units are mm).
                const strokeWidth = scalePixel(30);

                const pose = nodePoses.get(node.id);
                const coordinate = pose?.coordinate ?? node.coordinate;
                const rotation = pose?.rotation ?? (node.rotation ?? 0);

                return (
                    <g
                        key={node.id}
                        transform={`translate(${coordinate.x} ${coordinate.y}) rotate(${rotation})`}
                        style={{ opacity: isDeleteMode && isHovered ? 0.5 : 1 }}>
                        {/* Hit target: captures mouse down so walls don't steal drags */}
                        <rect
                            x={-(w / 2) - (node.kind === 'door' ? scalePixel(22) : scalePixel(10))}
                            y={-(h / 2) - (node.kind === 'door' ? scalePixel(22) : scalePixel(10))}
                            width={w + (node.kind === 'door' ? scalePixel(44) : scalePixel(20))}
                            height={h + (node.kind === 'door' ? scalePixel(44) : scalePixel(20))}
                            fill={isDeleteMode && isHovered ? "rgba(239,68,68,0.2)" : "rgba(0,0,0,0)"}
                            stroke={isDeleteMode && isHovered ? "#ef4444" : "rgba(0,0,0,0)"}
                            strokeWidth={isDeleteMode && isHovered ? scalePixel(4) : 0}
                            style={{ cursor: isDeleteMode ? 'pointer' : 'move' }}
                            onMouseEnter={() => setHoveredId(node.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onMouseDown={(e) => {
                                if (e.button !== 0) return;
                                e.preventDefault();
                                e.stopPropagation();
                                
                                if (isDeleteMode) {
                                    handleNodeClick(node.id, e);
                                    return;
                                }
                                
                                const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });
                                beginDrag(node.id, world);
                            }}
                        />

                        <ObjectSvg kind={node.kind} width={w} height={h} selected={isSelected} strokeWidth={strokeWidth} />

                        {(node.kind === 'door' || isSelected) && (
                            <text
                                x={0}
                                y={-h / 2 - scalePixel(14)}
                                textAnchor="middle"
                                fontFamily="Figtree, sans-serif"
                                fontSize={scalePixel(14)}
                                fill="#262626"
                                opacity={0.85}>
                                {def.label}
                            </text>
                        )}
                    </g>
                );
            })}
        </g>
    );
}
