// src/components/FixedGridCanvas.tsx
import React, { useRef, useEffect } from 'react';
import { Point } from '@/types';
import { GridPoint, useGrid } from '@/hooks/useGrid';

interface FixedGridCanvasProps {
    width: number;
    height: number;
    zoom: number;
    viewOffset: Point;
    pxPerMm: number;
    gridSize?: number;
}


const FixedGridCanvas: React.FC<FixedGridCanvasProps> = ({ width, height, zoom, viewOffset, pxPerMm, gridSize = 10 }) => {

    const { setPoints, disabled } = useGrid();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    useEffect(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = width;
            canvas.height = height;
            ctx.clearRect(0, 0, width, height);

            if (disabled || width <= 0 || height <= 0) {
                // Grid off: also stop publishing old grid points.
                setPoints([] as GridPoint[]);
                return;
            }

            // We no longer publish all grid intersection points (O(n^2) and
            // unused by snapping). Keeping this empty avoids huge allocations.
            setPoints([] as GridPoint[]);

            // World units are mm; convert to screen pixels.
            const worldScale = zoom * pxPerMm;
            if (worldScale <= 0) return;

            const effectiveGridSize = gridSize * worldScale;
            if (!Number.isFinite(effectiveGridSize) || effectiveGridSize <= 0) return;

            const majorGridMultiple = 10;
            const majorGridSize = effectiveGridSize * majorGridMultiple;

            // Cap the amount of work during interaction; if too dense, skip.
            const minorCountX = effectiveGridSize > 0 ? (width / effectiveGridSize) : Infinity;
            const minorCountY = effectiveGridSize > 0 ? (height / effectiveGridSize) : Infinity;
            const majorCountX = majorGridSize > 0 ? (width / majorGridSize) : Infinity;
            const majorCountY = majorGridSize > 0 ? (height / majorGridSize) : Infinity;

            const MAX_LINES = 2500;

            const canDrawMinor =
                effectiveGridSize >= 8 &&
                minorCountX + minorCountY <= MAX_LINES;

            const canDrawMajor =
                majorGridSize >= 12 &&
                majorCountX + majorCountY <= MAX_LINES;

            if (!canDrawMinor && !canDrawMajor) return;

            // Starting positions
            const startX = -((viewOffset.x * worldScale) % effectiveGridSize);
            const startY = -((viewOffset.y * worldScale) % effectiveGridSize);

            if (canDrawMinor) {
                // Minor grid lines
                ctx.strokeStyle = '#777777';
                ctx.lineWidth = 0.5;
                ctx.globalAlpha = 0.6;

                for (let x = startX; x <= width; x += effectiveGridSize) {
                    if (Math.abs((x - startX) % majorGridSize) < 1) continue;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, height);
                    ctx.stroke();
                }

                for (let y = startY; y <= height; y += effectiveGridSize) {
                    if (Math.abs((y - startY) % majorGridSize) < 1) continue;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                }
            }

            if (canDrawMajor) {
                // Major line alpha
                const pct = (zoom - 0.1) / (5 - 0.1);
                const clamped = Math.min(1, Math.max(0.15, pct));
                const alpha = Math.round(clamped * 255)
                    .toString(16)
                    .padStart(2, "0");

                ctx.strokeStyle = '#444444' + alpha;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.8;

                const majorStartX = -((viewOffset.x * worldScale) % majorGridSize);
                const majorStartY = -((viewOffset.y * worldScale) % majorGridSize);

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
            }
        });

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [width, height, zoom, viewOffset, pxPerMm, gridSize, disabled, setPoints]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className='grid-canvas'
        />
    );
};

export default FixedGridCanvas;