// src/components/SelectionBox.tsx
import React, { useEffect } from 'react';
import { Vert, BoundingBox } from '../types';
import { boundingBox, pointInBoundingBox } from '../utils/geometry';
import { useFloorplanContext } from './FloorplanProvider';

interface SelectionBoxProps {
    start: Vert;
    end: Vert;
    onSelect: (ids: string[]) => void;
}

const SelectionBox: React.FC<SelectionBoxProps> = ({ start, end, onSelect }) => {
    const { state } = useFloorplanContext();

    useEffect(() => {
        const selectionBox: BoundingBox = boundingBox([start, end]);

        const selectedIds: string[] = [];

        // Check walls
        state.data.walls.forEach(wall => {
            if (pointInBoundingBox(wall.from, selectionBox) &&
                pointInBoundingBox(wall.to, selectionBox)) {
                selectedIds.push(wall.id);
            }
        });

        // Check nodes
        state.data.nodes.forEach(node => {
            if (pointInBoundingBox({ x: node.x, y: node.y }, selectionBox)) {
                selectedIds.push(node.id);
            }
        });

        onSelect(selectedIds);
    }, [start, end, state.data, onSelect]);

    const box = boundingBox([start, end]);

    return (
        <rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="4,2"
        />
    );
};

export default SelectionBox;