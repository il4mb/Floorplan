// src/components/FixedGridCanvas.tsx
import React, { useRef, useEffect, RefObject } from 'react';
import { Vert } from '../types';

export type GridPoint = Vert & {
    type: "major" | "minor";
}
interface FixedGridCanvasProps {
    width: number;
    height: number;
    zoom: number;
    viewOffset: Vert;
    gridSize?: number;
    pointsRef: RefObject<GridPoint[]>
}


const FixedGridCanvas: React.FC<FixedGridCanvasProps> = ({ width, height, zoom, viewOffset, gridSize = 10, pointsRef }) => {

    const gridPointsRef = pointsRef || useRef<GridPoint[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        // Fill transparent background
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, width, height);

        // Fixed grid size that scales with zoom
        const effectiveGridSize = gridSize * zoom;

        // Starting positions
        const startX = -((viewOffset.x * zoom) % effectiveGridSize);
        const startY = -((viewOffset.y * zoom) % effectiveGridSize);

        const majorGridMultiple = 10;
        const majorGridSize = effectiveGridSize * majorGridMultiple;

        // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        // COLLECT GRID POINTS
        // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        const points: GridPoint[] = [];

        // minor points
        for (let x = startX; x <= width; x += effectiveGridSize) {
            for (let y = startY; y <= height; y += effectiveGridSize) {

                const isMajor =
                    Math.abs((x - startX) % majorGridSize) < 1 &&
                    Math.abs((y - startY) % majorGridSize) < 1;

                points.push({
                    x,
                    y,
                    type: isMajor ? "major" : "minor"
                });
            }
        }

        // write to ref
        gridPointsRef.current = points;
        // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

        // -----------------------
        // DRAW THE GRID (same as before)
        // -----------------------

        // Minor grid lines
        ctx.strokeStyle = '#e5e7eb99';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.6;

        if (effectiveGridSize > 7) {
            for (let x = startX; x <= width; x += effectiveGridSize) {
                if (Math.abs((x - startX) % majorGridSize) < 1) continue;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }

            for (let y = startY; y <= height; y += effectiveGridSize) {
                if (Math.abs((y - startY) % majorGridSize) < 0.1) continue;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }

        // Major line alpha
        const pct = (zoom - 0.1) / (10 - 0.1);
        const clamped = Math.min(1, Math.max(0.15, pct));
        const alpha = Math.round(clamped * 255)
            .toString(16)
            .padStart(2, "0");

        ctx.strokeStyle = '#d1d5db' + alpha;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;

        const majorStartX = -((viewOffset.x * zoom) % majorGridSize);
        const majorStartY = -((viewOffset.y * zoom) % majorGridSize);

        for (let x = majorStartX; x <= width; x += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = majorStartY; y <= height; y += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }, [width, height, zoom, viewOffset, gridSize]);


    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
            }}
        />
    );
};

export default FixedGridCanvas;