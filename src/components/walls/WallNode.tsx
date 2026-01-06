import { useCanvas, useMouseMove, useMouseUp } from '@/hooks/useCanvas';
import { useEditor } from '@/hooks/useEditor';
import { useEngine } from '@/hooks/useEngine';
import { useSnap } from '@/hooks/useSnap';
import { Point, Wall as TypeWall } from '@/types';
import { useMemo, useState } from 'react';
import Line2 from '@/utils/line2d';
import WallUtils from '@/utils/wallUtils';
import Poly2 from '@/utils/polygon2d';
import { useWallsPolygon } from '@/hooks/useWallEngine';
import Vec2 from '@/utils/vec2d';

export interface WallProps {
    wall: TypeWall;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;

}
export default function WallNode({ wall }: WallProps) {

    const { scalePixel } = useEngine();
    const { snapGrid } = useSnap();
    const { updateWall, data } = useEditor();
    const { clientToWorldPoint } = useCanvas();
    const wallsPolygon = useWallsPolygon();
    const polygon = useMemo(() => wallsPolygon.get(wall.id) || [], [wall.id, wallsPolygon]);

    const [isHovered, setIsHovered] = useState(false);
    const [hoverIndex, setHoverIndex] = useState(-1);
    const [moveIndex, setMoveIndex] = useState(-1);
    const movePoint = useMemo<Point | null>(() => {
        if (moveIndex < 0) return null;
        return wall.points[moveIndex] as Point;
    }, [moveIndex, wall.points]);

    const nearests = useMemo(() => {
        if (moveIndex < 0) return [];
        const neighbors = data.walls.filter(other => other.id !== wall.id);
        return WallUtils.findNearest(wall, neighbors, wall.thickness * 2);
    }, [data.walls, wall.points]);

    const neighbors = useMemo(() => {
        if (nearests.length <= 0) return [];
        return nearests.map(nearest => nearest.wall);
    }, [nearests]);

    const neighborsPoints = useMemo(() => {
        return Poly2.removeDuplicate(neighbors.reduce((acc, cur) => {
            cur.points.map(point => {
                acc.push(point)
            })
            return acc;
        }, [] as Point[]));
    }, [neighbors]);
    const nearestPoint = useMemo(() => {
        if (!movePoint || neighborsPoints.length === 0) return null;

        let min = Infinity;
        let result: Point | null = null;

        for (const p of neighborsPoints) {
            const d = Vec2.dist(movePoint, p);
            if (d < min) {
                min = d;
                result = p;
            }
        }

        return min < 50 ? result : null; // threshold 50
    }, [neighborsPoints, movePoint]);





    const overlaps = useMemo(() => {
        if (moveIndex < 0) return [];
        const polygons = neighbors.map(neg => wallsPolygon.get(neg.id)).filter(e => e != null);
        return polygons.map(neighborPolygon => {

            const overlapPolygon = Poly2.getIntersec(neighborPolygon, polygon);
            if (overlapPolygon.length < 3) return null;
            const area = Poly2.calculateArea(overlapPolygon);
            const point = Poly2.findIntersecPoints(neighborPolygon, polygon)

            return {
                polygon: overlapPolygon,
                area,
                point
            };
        }).filter(e => e != null);
    }, [wall.points, moveIndex, neighbors, wallsPolygon]);


    const intersections = useMemo(() => {
        if (moveIndex < 0) return [];
        const walls = data.walls.filter(other => other.id !== wall.id);
        return walls.map(other => {
            return {
                result: Line2.getLineIntersection(other.points, wall.points),
                wall: other
            }
        }).filter(intersec => {
            if (!intersec.result) return false;
            return true;
        });
    }, [wall.points, moveIndex]);

    const pointsPath = useMemo(() => {
        return wall.points.map(e => [e.x, e.y].join(",")).join(" ");
    }, [wall.points]);

    const mouseDown = (index: number) => () => {
        setMoveIndex(index);
    }

    useMouseUp(() => {
        setMoveIndex(-1);
    }, [intersections, wall.points]);

    useMouseMove((e) => {
        if (moveIndex < 0) return;
        const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        let snaped = snapGrid(world);

        if (overlaps.length > 0 && nearestPoint && Vec2.dist(nearestPoint, snaped) < 25) {
            snaped = nearestPoint;
        }

        const points = wall.points.map((point, i) => i == moveIndex ? snaped : point) as TypeWall['points'];
        updateWall(wall.id, { points });
    }, [moveIndex, wall.id, wall.points, overlaps, nearestPoint, clientToWorldPoint, updateWall, snapGrid]);

    return (
        <g onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}>
            <path
                d={Poly2.toPath(polygon)}
                fill='#666'
                stroke='#999'
                strokeWidth="0"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeMiterlimit="4"
                fillRule="nonzero"
            />

            {isHovered && moveIndex == -1 && (
                <polyline
                    points={pointsPath}
                    stroke='green'
                    strokeWidth={scalePixel(8)}
                    strokeLinejoin={"round"}
                    strokeLinecap={"round"} />
            )}
            {wall.points.map((point, index) => (
                <g key={index} onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(-1)}>
                    <circle
                        onMouseDown={mouseDown(index)}
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r={scalePixel(5, 3, 150) + (hoverIndex == index || moveIndex == index ? scalePixel(2) : 0)}
                        fill='green'
                        style={{
                            transition: moveIndex < 0 ? 'all .2s ease' : 'none',
                            opacity: hoverIndex == index || moveIndex == index ? 1 : 0
                        }} />
                </g>
            ))}

            {intersections.map((intersection, index) => (
                <circle
                    key={index}
                    cx={intersection.result!.x}
                    cy={intersection.result!.y}
                    r={scalePixel(5, 3, 150)}
                    fill='green' />
            ))}

            {overlaps.map((overlap, i) => (
                <g key={i}>
                    <path d={Poly2.toPath(overlap.polygon)} fill='red' />
                    {overlap.point.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={scalePixel(5, 3, 150)}
                            fill='orange' />
                    ))}
                </g>
            ))}

            {nearestPoint && (
                <g >
                    <circle
                        cx={nearestPoint.x}
                        cy={nearestPoint.y}
                        r={scalePixel(5, 3, 150)}
                        fill='orange' />
                    <line x1={nearestPoint.x} y1={nearestPoint.y} x2={movePoint?.x} y2={movePoint?.y} stroke='orange' strokeWidth={2} />
                </g>
            )}
        </g>
    );
}