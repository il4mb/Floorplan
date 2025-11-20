import { Waypoints } from "lucide-react";
import { Model } from "@/utils/model";
import { MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import Verticle from "@/icon/Verticle";
import { Node, Vert } from "@/types";
import { useNodeGeometry } from "@/hooks/useNode";
import PolylineDrawer from "./components/PolylineDrawer";
import PolygonDrawer from "./components/PolygonDrawer";
import { useStateActions } from "@/components/FloorplanProvider";


export type PolygonNode = Node & {
    points: Vert[];
    join: boolean;
}

export default {

    type: "polygon",
    name: "Polygon",
    icon: (props) => <Waypoints {...props} />,

    actionbars: [
        {
            icon: <Verticle width={22} height={22} varian="add" />,
            id: "point",
            context: "polygon",
            toggle: true,
            tooltip: "Add Points"
        },
        {
            icon: <Verticle width={22} height={22} varian="move" />,
            id: "move",
            context: "polygon",
            toggle: true,
            tooltip: "Move Points"
        },
        {
            icon: <Verticle width={22} height={22} varian="delete" />,
            id: "delete",
            context: "polygon",
            toggle: true,
            tooltip: "Delete Points"
        }
    ],
    properties: [
        {
            type: "compose",
            name: "points",
            label: "Points",
            properties: []
        },
    ],

    render({ node, selected, updateNode }) {

        const actions = useStateActions();
        const [editing, setEditing] = useState(false);
        const { localToWorld } = useNodeGeometry();
        const rotatedWorldPoints = useMemo(() => {
            if (!node.points) return [];

            const angle = node.rotation * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            return node.points.map(p => {
                const rx = p.x * cos - p.y * sin;
                const ry = p.x * sin + p.y * cos;

                const world = {
                    x: node.x + rx,
                    y: node.y + ry,
                };

                return world;
            });
        }, [node.points, node.x, node.y, node.rotation, localToWorld]);

        const points = useMemo(() => rotatedWorldPoints.map(e => [e.x, e.y].join(",")).join(" "), [rotatedWorldPoints]);

        const handleDoubleClick = useCallback(() => {
            if (!selected) return;
            actions.select([node.id]);
            setEditing(true);
        }, [selected]);
        const handleMouseDown = useCallback((e: MouseEvent) => {
            if (selected && !editing) e.preventDefault();
        }, [editing, selected]);

        useEffect(() => {
            setEditing(false);
        }, [selected]);

        useEffect(() => {
            if (!selected || editing) return;
            setEditing(node.points.length <= 1);
        }, [node.points, selected]);

        return (
            <g onDoubleClick={handleDoubleClick} onMouseDown={handleMouseDown}>
                {/* Main polygon */}
                {(node.points.length > 2 && node.join) ? (
                    <>
                        <polygon points={points}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            strokeWidth={`${node.thickness || 10}px`}
                            stroke={selected ? '#e68200' : '#fff'}
                            fill={"#0000"}
                            opacity={selected ? 0.8 : 1} />
                        {editing && (
                            <PolygonDrawer
                                selected={selected}
                                worldVerts={rotatedWorldPoints}
                                node={node}
                                updateNode={updateNode} />
                        )}

                    </>
                ) : (
                    <>
                        <polyline
                            points={points}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            strokeWidth={`${node.thickness || 10}px`}
                            stroke={selected ? '#e68200' : '#fff'}
                            fill={node.points.length >= 3 ? "#3468eb88" : "none"}
                            opacity={selected ? 0.8 : 1}
                        />
                        {editing && (
                            <PolylineDrawer
                                selected={selected}
                                node={node}
                                updateNode={updateNode} />
                        )}
                    </>
                )}

                {/* Center point */}
                {selected && (
                    <circle
                        cx={node.x}
                        cy={node.y}
                        r={4}
                        fill="#fca103"
                        opacity={0.8}
                    />
                )}
            </g>
        );
    }
} as Model<PolygonNode>;