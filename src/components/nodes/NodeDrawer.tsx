import { Point } from '@/types';

export interface NodeDrawerProps {
    currentPoint: Point;
    zoom: number;
    points: Point[];
}
export default function NodeDrawer({ currentPoint, zoom, points }: NodeDrawerProps) {

    return (
        <>
            {points.length == 0 ? (
                <circle
                    cx={currentPoint?.x}
                    cy={currentPoint?.y}
                    r={5 / zoom}
                    fill="#f56565"
                />
            ) : (
                <>
                    <polyline
                        stroke='#fff'
                        strokeWidth={10}
                        points={points.map(e => [e.x, e.y].join(",")).join(" ")} />

                    <line
                        y1={points[points.length - 1]?.y}
                        x1={points[points.length - 1]?.x}
                        y2={currentPoint?.y}
                        x2={currentPoint?.x}
                        stroke='#ebde34'
                        stroke-dasharray="5,5" />

                    <circle
                        cy={points[points.length - 1]?.y}
                        cx={points[points.length - 1]?.x}
                        r={5 / zoom}
                        fill="#ebde34"
                    />

                    <circle
                        cx={currentPoint?.x}
                        cy={currentPoint?.y}
                        r={5 / zoom}
                        fill="#ebde34"
                    />
                </>
            )}
        </>
    );
}