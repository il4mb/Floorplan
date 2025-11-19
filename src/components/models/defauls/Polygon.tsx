import { MousePointerClick, Waypoints } from "lucide-react";
import { Model } from "@/utils/model";
import { useEffect, useMemo, useState } from "react";
import { distance, rotatePoint } from "@/utils/geometry";
import { useActionListener, useToggleById } from "@/hooks/useActionbars";
import { usePointer } from "@/hooks/usePointer";
import { useCanvas, useMouseDown, useMouseMove, useMouseUp } from "@/hooks/useCanvas";
import Verticle from "@/icon/Verticle";

export default {

    type: "polygon",
    name: "Polygon",
    icon: (props) => <Waypoints {...props} />,
    actionbars: [
        {
            icon: <Verticle width={22} height={22} varian="add" />,
            id: "point",
            context: "polygon",
            toggle: true
        },
        {
            icon: <Verticle width={22} height={22} varian="move" />,
            id: "move",
            context: "polygon",
            toggle: true
        },
        {
            icon: <Verticle width={22} height={22} varian="delete" />,
            id: "delete",
            context: "polygon",
            toggle: true
        }
    ],
    properties: [
        {
            type: "compose",
            name: "points",
            label: "Points",
            properties: [

            ]
        },

    ],

    render({ node, selected, updateNode }) {

        const { clientToWorldPoint, snapPoint } = useCanvas();
        const [mode, setMode] = useState<string>();
        const toggleById = useToggleById();
        const pointer = usePointer();

        const rotated = useMemo(() =>
            node.points.map(p =>
                rotatePoint(p, { x: node.x, y: node.y }, node.rotation * (Math.PI / 180))),
            [node.points, node.x, node.y, node.rotation]);
        const translated = useMemo(() => rotated.map(e => ({ x: e.x - node.x, y: e.y - node.y })), [rotated]);
        const endPoint = useMemo(() => translated.length > 0 && translated[translated.length - 1], [translated])
        const points = useMemo(() => translated.map(e => [e.x, e.y].join(",")).join(" "), [translated]);
        const [moveIndex, setMoveIndex] = useState(-1);

        useMouseMove((e) => {
            if (!selected || moveIndex < 0 || mode !== "move") return;
            e.preventDefault();
            const worldPoint = clientToWorldPoint({ x: e.clientX, y: e.clientY });
            updateNode("points", node.points.map((point, index) => (index != moveIndex ? point : snapPoint(worldPoint))));
        }, [moveIndex, selected, mode, snapPoint]);

        useMouseDown((e) => {
            if (!selected || mode !== "move") return;

            const worldPoint = clientToWorldPoint({ x: e.clientX, y: e.clientY });
            const closed = rotated.findIndex(e => distance(worldPoint, e) <= 35);
            if (closed > -1) {
                e.preventDefault();
                setMoveIndex(closed);
            }
        }, [selected, rotated, mode]);

        useMouseUp((e) => {
            if (!selected) return;
            setMoveIndex(-1);
            if (e.button === 0 && mode == "point") {
                e.preventDefault();
                updateNode("points", [...node.points, pointer]);
            }
        }, [selected, mode, pointer]);

        useActionListener(["point", "move", "delete"], (event) => {
            if (event.type == "toggled") {
                setMode(event.toolbar.id);
            }
        }, [selected]);

        useEffect(() => {
            return () => {
                setMode(undefined);
            }
        }, [selected]);

        useEffect(() => {
            if (!selected) return;
            if (node.points.length == 0 && typeof mode == "undefined") {
                toggleById("point");
            } else {
                toggleById("move");
            }
        }, [selected]);

        return (
            <>
                <polyline
                    points={points}
                    strokeLinejoin='round'
                    strokeWidth={`${node.thickness || 10}px`}
                    stroke={selected ? '#e68200' : '#fff'}
                    fill="#3468eb8" />
                <circle
                    cx={node.x}
                    cy={node.y}
                    r={4}
                    fill="#fca103"
                    opacity={0.8}
                />
                {selected && mode == "point" && pointer != null && (
                    <>
                        <circle
                            cx={pointer.x}
                            cy={pointer.y}
                            r={8}
                            fill="#29a116"
                            opacity={0.8}
                        />
                        {endPoint && (
                            <line x1={endPoint.x} y1={endPoint.y} x2={pointer.x} y2={pointer.y} stroke="#29a116" strokeDasharray={"10 10"} strokeWidth={4} />
                        )}
                    </>
                )}
                {selected && translated.map(({ x, y }, index) => (
                    <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r={8}
                        fill="#29a116"
                        opacity={0.8}
                    />
                ))}
            </>
        );
    }
} as Model;