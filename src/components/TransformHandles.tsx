// src/components/TransformHandles.tsx
import React, { useState } from 'react';
import { Vert } from '../types';
import { useFloorplanContext } from './FloorplanProvider';
import { rotatePoint } from '../utils/geometry';

interface TransformHandlesProps {
    selectedItems: string[];
    onTransformStart?: () => void;
    onTransformEnd?: () => void;
}

type TransformMode = 'move' | 'rotate' | 'scale' | null;

const TransformHandles: React.FC<TransformHandlesProps> = ({
    selectedItems,
    onTransformStart,
    onTransformEnd
}) => {
    const { state, actions } = useFloorplanContext();
    const [transformMode, setTransformMode] = useState<TransformMode>(null);
    const [transformStart, setTransformStart] = useState<Vert | null>(null);
    const [originalPositions, setOriginalPositions] = useState<Map<string, any>>(new Map());

    if (selectedItems.length === 0) return null;

    // Calculate bounding box for selected items
    const getSelectionBounds = () => {
        const allPoints: Vert[] = [];

        selectedItems.forEach(id => {
            // const wall = state.data.walls.find(w => w.id === id);
            const node = state.data.nodes.find(n => n.id === id);

            // if (wall) {
            //     allPoints.push(wall.from, wall.to);
            // }
            if (node) {
                allPoints.push({ x: node.x, y: node.y });

                // Add bounding box points for furniture
                if (node.type === 'furniture') {
                    const halfWidth = node.props.width / 2;
                    const halfHeight = node.props.height / 2;
                    const corners = [
                        { x: -halfWidth, y: -halfHeight },
                        { x: halfWidth, y: -halfHeight },
                        { x: halfWidth, y: halfHeight },
                        { x: -halfWidth, y: halfHeight }
                    ].map(corner => rotatePoint(corner, { x: 0, y: 0 }, node.rotation));

                    corners.forEach(corner => {
                        allPoints.push({ x: node.x + corner.x, y: node.y + corner.y });
                    });
                }
            }
        });

        if (allPoints.length === 0) return null;

        const xs = allPoints.map(p => p.x);
        const ys = allPoints.map(p => p.y);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
        };
    };

    const bounds = getSelectionBounds();
    if (!bounds) return null;

    const handleMouseDown = (mode: TransformMode, e: React.MouseEvent) => {
        e.stopPropagation();
        setTransformMode(mode);
        setTransformStart({ x: e.clientX, y: e.clientY });

        // Store original positions
        const positions = new Map();
        selectedItems.forEach(id => {
            // const wall = state.data.walls.find(w => w.id === id);
            const node = state.data.nodes.find(n => n.id === id);

            // if (wall) {
            //     positions.set(id, { from: { ...wall.from }, to: { ...wall.to } });
            // }
            if (node) {
                positions.set(id, { x: node.x, y: node.y, rotation: node.rotation });
            }
        });
        setOriginalPositions(positions);

        onTransformStart?.();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!transformMode || !transformStart) return;

        const deltaX = e.clientX - transformStart.x;
        const deltaY = e.clientY - transformStart.y;
        const scale = 0.01; // Scale factor for mouse movement

        selectedItems.forEach(id => {
            const original = originalPositions.get(id);
            if (!original) return;

            if (transformMode === 'move') {
                // const wall = state.data.walls.find(w => w.id === id);
                const node = state.data.nodes.find(n => n.id === id);

                // if (wall) {
                //     actions.updateWall(id, {
                //         from: { x: original.from.x + deltaX * scale, y: original.from.y + deltaY * scale },
                //         to: { x: original.to.x + deltaX * scale, y: original.to.y + deltaY * scale }
                //     });
                // }

                if (node) {
                    actions.updateNode(id, {
                        x: original.x + deltaX * scale,
                        y: original.y + deltaY * scale
                    });
                }
            }

            if (transformMode === 'rotate') {
                const node = state.data.nodes.find(n => n.id === id);
                if (node) {
                    const angle = Math.atan2(deltaY, deltaX);
                    actions.updateNode(id, {
                        rotation: angle
                    });
                }
            }
        });
    };

    const handleMouseUp = () => {
        setTransformMode(null);
        setTransformStart(null);
        setOriginalPositions(new Map());
        onTransformEnd?.();
    };

    // Add global mouse event listeners
    React.useEffect(() => {
        if (transformMode) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [transformMode, transformStart, originalPositions]);

    return (
        <g>
            {/* Selection bounding box */}
            <rect
                x={bounds.x - 5}
                y={bounds.y - 5}
                width={bounds.width + 10}
                height={bounds.height + 10}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="4,2"
            />

            {/* Move handle (center) */}
            <circle
                cx={bounds.center.x}
                cy={bounds.center.y}
                r={4}
                fill="#3b82f6"
                stroke="#fff"
                strokeWidth={1}
                style={{ cursor: 'move' }}
                onMouseDown={(e) => handleMouseDown('move', e)}
            />

            {/* Rotate handle (top center) */}
            <circle
                cx={bounds.center.x}
                cy={bounds.y - 20}
                r={3}
                fill="#10b981"
                stroke="#fff"
                strokeWidth={1}
                style={{ cursor: 'grab' }}
                onMouseDown={(e) => handleMouseDown('rotate', e)}
            />

            {/* Scale handles (corners) */}
            {[
                { x: bounds.x, y: bounds.y }, // top-left
                { x: bounds.x + bounds.width, y: bounds.y }, // top-right
                { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // bottom-right
                { x: bounds.x, y: bounds.y + bounds.height } // bottom-left
            ].map((corner, index) => (
                <rect
                    key={index}
                    x={corner.x - 3}
                    y={corner.y - 3}
                    width={6}
                    height={6}
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth={1}
                    style={{ cursor: 'nwse-resize' }}
                    onMouseDown={(e) => handleMouseDown('scale', e)}
                />
            ))}
        </g>
    );
};

export default TransformHandles;