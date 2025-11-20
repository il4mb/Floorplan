import { useCanvas, useMouseDown, useMouseMove, useMouseUp } from '@/hooks/useCanvas';
import { NodeUpdateHandler } from '@/utils/model';
import { PolygonNode } from '../Polygon';
import { usePointer } from '@/hooks/usePointer';
import { useEffect, useMemo, useState, useCallback, MouseEvent } from 'react';
import { useNodeGeometry } from '@/hooks/useNode';
import { distance, getCenterPoints } from '@/utils/geometry';
import { Vert } from '@/types';
import PolyPoints from './PolyPoints';
import { useStateActions } from '@/components/FloorplanProvider';

export interface PolylineDrawerProps {
    selected: boolean;
    node: PolygonNode;
    updateNode: NodeUpdateHandler;
}

const HOVER_THRESHOLD = 15;
const JOIN_THRESHOLD = 25;
const SNAP_DISTANCE = 15;

export default function PolylineDrawer({ selected, node, updateNode }: PolylineDrawerProps) {

    const actions = useStateActions();
    const { clientToWorldPoint, snapPoint } = useCanvas();
    const { localToWorld, worldToLocal } = useNodeGeometry();
    const pointer = usePointer();

    const [pointDown, setPointDown] = useState<Vert>();
    const [isMoving, setIsMoving] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const [moveIndex, setMoveIndex] = useState(-1);
    const [shouldJoin, setShouldJoin] = useState(false);

    // Memoized point calculations
    const { startPoint, endPoint, hoveredPoint } = useMemo(() => {
        const points = node.points;
        const hasPoints = points.length > 0;

        return {
            startPoint: hasPoints ? localToWorld(points[0]!) : null,
            endPoint: hasPoints ? localToWorld(points[points.length - 1]!) : null,
            hoveredPoint: !shouldJoin && hoveredIndex > -1 && points[hoveredIndex]
                ? localToWorld(points[hoveredIndex])
                : null
        };
    }, [node.points, hoveredIndex, shouldJoin, localToWorld]);

    // Update points with proper center calculation
    const updatePoints = useCallback((newPoints: Vert[]) => {
        const worldPoints = newPoints.map(localToWorld);
        const center = getCenterPoints(worldPoints);
        const localPoints = worldPoints.map(point => worldToLocal(point, center));

        updateNode({
            ...center,
            points: localPoints
        });
    }, [localToWorld, worldToLocal, updateNode]);

    // Handle point addition
    const handleAddPoint = useCallback((worldPoint: Vert) => {
        const snappedPoint = worldToLocal(snapPoint(worldPoint));
        const newPoints = [...node.points, snappedPoint];
        updatePoints(newPoints);
    }, [node.points, worldToLocal, snapPoint, updatePoints]);

    // Handle point movement
    const handleMovePoint = useCallback((index: number, worldPoint: Vert) => {
        const snappedPoint = worldToLocal(snapPoint(worldPoint));
        const newPoints = node.points.map((point, i) =>
            index === i ? snappedPoint : point
        );
        updatePoints(newPoints);
    }, [node.points, worldToLocal, snapPoint, updatePoints]);

    // Handle point deletion
    const handleDeletePoint = useCallback((index: number) => {
        if (node.points.length <= 2) return; // Prevent deleting when only 2 points remain

        const newPoints = node.points.filter((_, i) => i !== index);
        updatePoints(newPoints);
    }, [node.points, updatePoints]);

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

        if (shouldJoin) {
            e.preventDefault();
            updateNode("join", true);
            return;
        }

        const worldPoint = clientToWorldPoint({ x: e.clientX, y: e.clientY });

        if (distance(pointDown, worldPoint) <= SNAP_DISTANCE) {
            e.preventDefault();
            handleAddPoint(worldPoint);
        }
    }, [
        pointDown, isMoving, shouldJoin, clientToWorldPoint,
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

    useEffect(() => {
        if (!pointer || !startPoint || node.points.length <= 2) {
            setShouldJoin(false);
            return;
        }
        setShouldJoin(distance(pointer, startPoint) < JOIN_THRESHOLD);
    }, [pointer, startPoint, node.points.length]);

    useEffect(() => {
        if (selected && node.points.length === 0) {
            updateNode("points", [{ x: 0, y: 0 }]);
        } else if (!selected && node.points.length == 1) {
            actions.removeItems([node.id]);
        }
    }, [node.points, selected]);

    // Render methods
    const renderConnectionLine = () => {
        if (!pointer || hoveredPoint || !endPoint) return null;

        return (
            <line
                x1={endPoint.x}
                y1={endPoint.y}
                x2={pointer.x}
                y2={pointer.y}
                stroke="#29a116"
                strokeDasharray={shouldJoin ? "" : "5 5"}
                strokeWidth={shouldJoin ? 10 : 2}
                opacity={0.6}
            />
        );
    };

    const renderPointer = () => {
        if (!pointer || hoveredPoint) return null;

        return (
            <circle
                cx={pointer.x}
                cy={pointer.y}
                r={8}
                fill="#29a116"
                opacity={0.8}
            />
        );
    };

    const renderJoinIndicator = () => {
        if (!shouldJoin || !startPoint) return null;

        return (
            <g>
                <circle
                    cx={startPoint.x}
                    cy={startPoint.y}
                    r={16}
                    fill="#29a116"
                    opacity={0.6}
                />
                <circle
                    cx={startPoint.x}
                    cy={startPoint.y}
                    r={10}
                    fill="#29a116"
                    opacity={1}
                />
                <text
                    x={startPoint.x}
                    y={startPoint.y - 25}
                    textAnchor="middle"
                    fill="#29a116"
                    fontSize="12"
                    fontWeight="bold">
                    Join
                </text>
            </g>
        );
    };

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
            {renderConnectionLine()}
            <PolyPoints points={node.points.map(localToWorld)} />
            {renderPointer()}
            {renderJoinIndicator()}
            {renderHoverIndicator()}
        </>
    );
}