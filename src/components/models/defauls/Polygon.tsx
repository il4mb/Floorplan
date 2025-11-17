import { MousePointerClick, Waypoints } from "lucide-react";
import { Model } from "@/utils/model";
import { useEffect, useMemo, useState } from "react";
import { rotatePoint } from "@/utils/geometry";
import { useActionToggled, useToggleById } from "@/hooks/useActionbars";
import { usePointer } from "@/hooks/usePointer";

export default {

    type: "polygon",
    name: "Polygon",
    icon: (props) => <Waypoints {...props} />,
    actionbars: [
        {
            icon: <MousePointerClick size={16} />,
            id: "point",
            context: "polygon",
            toggle: true
        },
        {
            icon: <MousePointerClick size={16} />,
            id: "move",
            context: "polygon",
            toggle: true
        },
        {
            icon: <MousePointerClick size={16} />,
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

    render({ node, selected }) {

        const [mode, setMode] = useState<string>();
        const toggleById = useToggleById();
        const pointer = usePointer();

        const rotated = useMemo(() =>
            node.points.map(p =>
                rotatePoint(p, { x: node.x, y: node.y }, node.rotation * (Math.PI / 180))),
            [node.points, node.x, node.y, node.rotation]);
        const points = useMemo(() => rotated.map(e => [e.x + node.x, e.y + node.y].join(",")).join(" "), [rotated]);

        useActionToggled((event) => {
            console.log(event);
            setMode(event.toolbar.id);
        }, [selected]);

        useEffect(() => {
            if (mode != "point" && node.points.length == 0) {
                toggleById("point");
            }
        }, [node.points]);


        return (
            <polyline
                points={points}
                strokeLinejoin='round'
                strokeWidth={`${node.thickness || 10}px`}
                stroke={selected ? '#0352fc' : '#fff'}
                fill="#3468eb8" />
        );
    }
} as Model;