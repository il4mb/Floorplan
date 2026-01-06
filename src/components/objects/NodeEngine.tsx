import { useCanvas, useMouseDown, useMouseMove, useMouseUp } from "@/hooks/useCanvas";
import { useEditor } from "@/hooks/useEditor";
import { useEngine } from "@/hooks/useEngine";
import { useSnap } from "@/hooks/useSnap";
import { Point } from "@/types";
import { useMemo, useState } from "react";
import { getObjectDefinition } from "./objectRegistry";
import { findNearestWallAttachment, getWallAngleDeg, pointOnWall } from "./wallAttach";
import { ObjectSvg } from "./objectShapes";

export default function NodeEngine() {
    const { data, updateNode } = useEditor();
    const { clientToWorldPoint } = useCanvas();
    const { scalePixel } = useEngine();
    const { snapGrid } = useSnap();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragging, setDragging] = useState<{ id: string; offset: Point } | null>(null);

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

    const pickNodeAtPoint = (world: Point) => {
        // Later items render on top; iterate reverse for hit-test.
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            if (!node) continue;
            const def = getObjectDefinition(node.kind);
            const halfW = def.size.width / 2;
            const halfH = def.size.height / 2;

            const pose = nodePoses.get(node.id);
            const center = pose?.coordinate ?? node.coordinate;

            // Simple axis-aligned hit test (ignores rotation)
            const dx = world.x - center.x;
            const dy = world.y - center.y;
            if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) return node;
        }
        return null;
    };

    useMouseDown((e) => {
        const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        const node = pickNodeAtPoint(world);
        if (!node) return;

        e.preventDefault();
        setSelectedId(node.id);
        setDragging({
            id: node.id,
            offset: { x: world.x - node.coordinate.x, y: world.y - node.coordinate.y },
        });
    }, [clientToWorldPoint, nodes]);

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

    return (
        <g id="nodes">
            {nodes.map((node) => {
                const def = getObjectDefinition(node.kind);
                const w = def.size.width;
                const h = def.size.height;
                const isSelected = selectedId === node.id;

                const pose = nodePoses.get(node.id);
                const coordinate = pose?.coordinate ?? node.coordinate;
                const rotation = pose?.rotation ?? (node.rotation ?? 0);

                return (
                    <g
                        key={node.id}
                        transform={`translate(${coordinate.x} ${coordinate.y}) rotate(${rotation})`}>
                        <ObjectSvg kind={node.kind} width={w} height={h} selected={isSelected} />

                        {(node.kind === 'door' || isSelected) && (
                            <text
                                x={0}
                                y={-h / 2 - 10}
                                textAnchor="middle"
                                fontFamily="Figtree, sans-serif"
                                fontSize={12}
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
