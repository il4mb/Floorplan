import { useCanvas, useMouseDown, useMouseMove, useMouseUp } from '@/hooks/useCanvas';
import { NodeUpdateHandler } from '@/utils/model';
import { PolygonNode } from '../Polygon';
import { usePointer } from '@/hooks/usePointer';
import { useMemo, useState, useCallback, MouseEvent } from 'react';
import { useNodeGeometry } from '@/hooks/useNode';
import { distance, getCenterPoints, getClosestEdgeFromVerts } from '@/utils/geometry';
import { Vert } from '@/types';
import PolyPoints from './PolyPoints';

export interface PolygonDrawerProps {
    selected: boolean;
    node: PolygonNode;
    worldVerts: Vert[];
    updateNode: NodeUpdateHandler;
}

const HOVER_THRESHOLD = 15;
const SNAP_DISTANCE = 15;

export default function PolygonDrawer({ selected, node, worldVerts, updateNode }: PolygonDrawerProps) {

    const { clientToWorldPoint, snapPoint } = useCanvas();
    const { localToWorld, worldToLocal } = useNodeGeometry();
    const pointer = usePointer();


    const [pointDown, setPointDown] = useState<Vert>();
    const [isMoving, setIsMoving] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const [moveIndex, setMoveIndex] = useState(-1);
    const closestEdge = useMemo(() => {
        if (!pointer || moveIndex > -1 || hoveredIndex > -1) return;
        const result = getClosestEdgeFromVerts(pointer, worldVerts, 15);
        if (result && !worldVerts.some(vert => distance(vert, result.point) <= 15)) {
            return result;
        }
        return null;
    }, [pointer, worldVerts, moveIndex, hoveredIndex]);

    // Memoized point calculations
    const { hoveredPoint } = useMemo(() => {
        const points = node.points;
        return {
            hoveredPoint: hoveredIndex > -1 && points[hoveredIndex]
                ? localToWorld(points[hoveredIndex])
                : null
        };
    }, [node.points, hoveredIndex, localToWorld]);

    // Update points with proper center calculation
    // const updatePoints = useCallback((newPoints: Vert[]) => {
    //     const worldPoints = newPoints.map(localToWorld);
    //     const center = getCenterPoints(worldPoints);
    //     const localPoints = worldPoints.map(point => worldToLocal(point, center));

    //     updateNode({
    //         ...center,
    //         points: localPoints
    //     });
    // }, [localToWorld, worldToLocal, updateNode]);

    // Handle point addition
    const handleAddPoint = useCallback(() => {
        if (!closestEdge) return;
        const { index, point } = closestEdge;
        const local = worldToLocal(point);
        const pts = [...node.points];
        pts.splice(index + 1, 0, local);
        updateNode("points", pts);
    }, [node.points, worldToLocal, closestEdge,  updateNode]);


    // Handle point movement
    const handleMovePoint = useCallback((index: number, worldPoint: Vert) => {
        const snappedPoint = worldToLocal(snapPoint(worldPoint));
        const newPoints = node.points.map((point, i) =>
            index === i ? snappedPoint : point
        );
        updateNode("points", newPoints);
    }, [node.points, worldToLocal, snapPoint, updateNode]);

    // Handle point deletion
    const handleDeletePoint = useCallback((index: number) => {
        if (node.points.length <= 2) return; // Prevent deleting when only 2 points remain

        const newPoints = node.points.filter((_, i) => i !== index);
        updateNode("points", newPoints);
    }, [node.points, updateNode]);

    // Mouse event handlers
    const handleMouseDown = useCallback((e: MouseEvent) => {
        if (e.button !== 0) return;

        if (hoveredIndex > -1) {
            e.preventDefault();
            setMoveIndex(hoveredIndex);
        }

        const worldPoint = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        setPointDown(worldPoint);
    }, [hoveredIndex, clientToWorldPoint]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (e.button !== 0 || !pointDown) return;

        if (isMoving) {
            e.preventDefault();
            setMoveIndex(-1);
            setIsMoving(false);
            return;
        }


        const worldPoint = clientToWorldPoint({ x: e.clientX, y: e.clientY });

        if (distance(pointDown, worldPoint) <= SNAP_DISTANCE) {
            e.preventDefault();
            handleAddPoint();
        }
    }, [
        pointDown, isMoving, clientToWorldPoint,
        handleAddPoint, updateNode
    ]);

    const handleRightClick = useCallback((e: MouseEvent) => {
        if (e.button === 2 && hoveredIndex > -1) {
            e.preventDefault();
            handleDeletePoint(hoveredIndex);
        }
    }, [hoveredIndex, handleDeletePoint]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!selected) return;

        const worldPoint = clientToWorldPoint({ x: e.clientX, y: e.clientY });

        if (moveIndex > -1) {
            e.preventDefault();
            handleMovePoint(moveIndex, worldPoint);
            setIsMoving(true);
            return;
        }

        // Find hovered point
        const newHoveredIndex = node.points.findIndex(point =>
            distance(worldPoint, localToWorld(point)) <= HOVER_THRESHOLD
        );
        setHoveredIndex(newHoveredIndex);

        // Initialize node position if no points
        if (node.points.length === 0) {
            updateNode(worldPoint);
        }
    }, [
        selected, node.points, moveIndex, clientToWorldPoint,
        localToWorld, handleMovePoint, updateNode
    ]);

    // Effects
    useMouseDown(handleMouseDown, [handleMouseDown]);
    useMouseUp(handleMouseUp, [handleMouseUp]);
    useMouseUp(handleRightClick, [handleRightClick]);
    useMouseMove(handleMouseMove, [handleMouseMove]);



    const renderHoverIndicator = () => {
        if (!hoveredPoint) return null;

        return (
            <g
                transform={`translate(${hoveredPoint.x}, ${hoveredPoint.y})`}
                style={{ cursor: "move" }}>
                <circle r={12} fill="#29a116" opacity={0.8} />
                <text fill="white" x={10} y={20} fontSize="10">
                    Move Vertex
                </text>
            </g>
        );
    };

    return (
        <>
            <PolyPoints points={node.points.map(localToWorld)} />
            {renderHoverIndicator()}
            {closestEdge && (
                <g
                    transform={`translate(${closestEdge.point.x}, ${closestEdge.point.y})`}
                    style={{ cursor: "move" }}>
                    <circle r={12} fill="#29a116" opacity={0.8} />
                    <text fill="white" x={10} y={20} fontSize="10">
                        Add Vertex
                    </text>
                </g>
            )}
        </>
    );
}