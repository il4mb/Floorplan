import { Callback, CanvasContext, CanvasState, EventListeners, EventName, Unsubscribe } from '@/hooks/useCanvas';
import { useEngine } from '@/hooks/useEngine';
import { Point, Rect } from '@/types';
import { MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FixedGridCanvas from './FixedGridCanvas';
import WallEngine from './walls/WallEngine';
import CanvasPortal from './CanvasPortal';
import NodeEngine from './objects/NodeEngine';
import RoomsOverlay from './rooms/RoomsOverlay';
import { OBJECT_DRAG_MIME, parseObjectDragPayload } from './objects/objectRegistry';
import { nanoid } from 'nanoid';
import { useEditor } from '@/hooks/useEditor';
import { findNearestWallAttachment } from './objects/wallAttach';

export interface canvasProps {
    children?: ReactNode;
}
export default function Canvas({ }: canvasProps) {

    const { gridSize, view, mode, updateView, scalePixel, pxPerMm } = useEngine();
    const { addNode, data } = useEditor();

    const listeners = useRef<EventListeners>(new Map());
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [pointer, setPointer] = useState<Point>();
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPivot, setDragPivot] = useState<Point>();
    const [rect, setRect] = useState<Rect>({ width: 0, height: 0, x: 0, y: 0 });

    const viewBox = useMemo(() => `0 0 ${rect.width} ${rect.height}`, [rect]);
    // World units are millimeters; convert to screen pixels using pxPerMm.
    const worldScale = useMemo(() => view.zoom * pxPerMm, [view.zoom, pxPerMm]);
    const viewTransform = useMemo(() =>
        `translate(${-view.x * worldScale}, ${-view.y * worldScale}) scale(${worldScale})`,
        [view.x, view.y, worldScale]
    );

    const invokeListeners = useCallback((event: EventName, e: MouseEvent) => {
        listeners.current.get(event)?.forEach((callback) => {
            try {
                callback(e as any);
            } catch (e) {
                console.error(e);
            }
        });
    }, []);

    const addListener = useCallback((event: EventName, callback: Callback): Unsubscribe => {
        let eventMap = listeners.current.get(event);
        if (!eventMap) {
            eventMap = new Map();
            listeners.current.set(event, eventMap);
        }

        const id = crypto.randomUUID();
        eventMap.set(id, callback);

        return () => {
            eventMap?.delete(id);
        };
    }, []);

    const clientToWorldPoint = useCallback(({ x, y }: Point): Point => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };

        const rect = svg.getBoundingClientRect();
        const screenX = x - rect.left;
        const screenY = y - rect.top;

        const s = worldScale || 1;
        const worldX = (screenX / s) + view.x;
        const worldY = (screenY / s) + view.y;

        return { x: worldX, y: worldY };
    }, [view.x, view.y, worldScale]);

    const worldToScreenPoint = useCallback(({ x, y }: Point): Point => {
        const s = worldScale || 1;
        const screenX = (x - view.x) * s;
        const screenY = (y - view.y) * s;
        return { x: screenX, y: screenY };
    }, [view.x, view.y, worldScale]);

    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        invokeListeners("contextmenu", e);
        setDragPivot(undefined);
        setIsDragging(false);
    }

    const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        invokeListeners("mousedown", e);
        if (e.isDefaultPrevented()) return;

        if (mode === 'pan' && e.button === 0) {
            setIsDragging(true);
            setDragPivot({ x: e.clientX, y: e.clientY });
            e.currentTarget.style.cursor = 'grabbing';
        }
    }, [mode, invokeListeners]);


    const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {

        const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        setPointer(world);

        e.currentTarget.style.cursor = mode === 'pan' ? 'grab' : 'default';
        if (isDragging && dragPivot) {
            e.currentTarget.style.cursor = 'grabbing';
        }

        invokeListeners("mousemove", e);
        if (e.isDefaultPrevented()) return;

        if (isDragging && dragPivot) {
            const s = worldScale || 1;
            const deltaX = (dragPivot.x - e.clientX) / s;
            const deltaY = (dragPivot.y - e.clientY) / s;

            updateView({
                x: view.x + deltaX,
                y: view.y + deltaY
            });
            setDragPivot({ x: e.clientX, y: e.clientY });
        }
    }, [clientToWorldPoint, invokeListeners, updateView, view, isDragging, dragPivot, mode, worldScale]);

    const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        setIsDragging(false);
        setDragPivot(undefined);
        invokeListeners("mouseup", e);
        e.currentTarget.style.cursor = mode === 'pan' ? 'grab' : 'default';
    }, [mode, invokeListeners]);

    const handleMouseLeave = useCallback((e: MouseEvent) => {
        setPointer(undefined);
        setIsDragging(false);
        setDragPivot(undefined);
        invokeListeners("mouseleave", e);
        if (e.isDefaultPrevented()) return;
    }, [clientToWorldPoint, invokeListeners]);

    const handleMouseEnter = useCallback((e: MouseEvent) => {
        invokeListeners("mouseenter", e);
        if (e.isDefaultPrevented()) return;
    }, [clientToWorldPoint, invokeListeners]);

    const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
        invokeListeners("wheel", e);
        if (e.isDefaultPrevented()) return;
        e.preventDefault();

        const rect = svgRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.001;
        const delta = -e.deltaY * zoomIntensity;

        // Apply zoom with exponential curve for smoother experience
        const zoomFactor = 1 + delta;
        const newZoom = Math.max(0.1, Math.min(5, view.zoom * zoomFactor));

        // Calculate zoom center in world coordinates
        const s = worldScale || 1;
        const worldX = (mouseX / s) + view.x;
        const worldY = (mouseY / s) + view.y;

        // Adjust view to zoom around mouse position
        const newS = newZoom * pxPerMm;
        const newX = worldX - (mouseX / newS);
        const newY = worldY - (mouseY / newS);

        updateView({
            zoom: newZoom,
            x: newX,
            y: newY
        });
    }, [view, updateView, invokeListeners, worldScale, pxPerMm]);

    const handleDragOver = useCallback((e: React.DragEvent<SVGSVGElement>) => {
        // Allow drop
        if (e.dataTransfer.types.includes(OBJECT_DRAG_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<SVGSVGElement>) => {
        const raw = e.dataTransfer.getData(OBJECT_DRAG_MIME);
        const payload = parseObjectDragPayload(raw);
        if (!payload) return;

        e.preventDefault();
        const world = clientToWorldPoint({ x: e.clientX, y: e.clientY });

        if (payload.kind === 'door') {
            const nearest = findNearestWallAttachment(world, data.walls);
            const threshold = scalePixel(30);
            if (!nearest || nearest.distance > threshold) return;

            addNode({
                id: nanoid(),
                kind: payload.kind,
                coordinate: nearest.point,
                rotation: nearest.angleDeg,
                wallId: nearest.wallId,
                wallT: nearest.t,
            });
            return;
        }

        addNode({
            id: nanoid(),
            kind: payload.kind,
            coordinate: world,
            rotation: 0,
        });
    }, [addNode, clientToWorldPoint, data.walls, scalePixel]);

    useEffect(() => {
        if (rect.width > 0 && rect.height > 0 && !isInitialized) {
            const s = worldScale || 1;
            const centerX = -rect.width / (2 * s);
            const centerY = -rect.height / (2 * s);
            updateView({
                x: centerX,
                y: centerY
            });
            setIsInitialized(true);
        }
    }, [rect, worldScale, isInitialized]);

    useEffect(() => {
        if (!containerRef.current) return;
        const updateRect = (container: HTMLElement) => {
            const rect = container.getBoundingClientRect()
            setRect(rect);
        }
        const observer = new ResizeObserver(() => {
            if (!containerRef.current) return;
            updateRect(containerRef.current);
        });
        updateRect(containerRef.current);
        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
        }
    }, [containerRef]);

    const value = useMemo<CanvasState>(() => ({
        pointer,
        rect,
        clientToWorldPoint,
        worldToScreenPoint,
        addListener
    }), [rect, pointer, clientToWorldPoint, worldToScreenPoint, addListener]);

    return (
        <CanvasContext.Provider value={value}>
            <div ref={containerRef} className='floorplan-canvas'>
                <FixedGridCanvas
                    width={rect.width}
                    height={rect.height}
                    zoom={view.zoom}
                    gridSize={gridSize}
                    pxPerMm={pxPerMm}
                    viewOffset={view} />
                <CanvasPortal>
                    <svg ref={svgRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onMouseEnter={handleMouseEnter}
                        onContextMenu={handleContextMenu}
                        onWheel={handleWheel}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        width={'100%'}
                        height={'100%'}
                        viewBox={viewBox}
                        xmlns="http://www.w3.org/2000/svg">
                        <g transform={viewTransform}>
                            {/* <GridPoints /> */}
                            <g style={{ transformOrigin: "center" }}>
                                <RoomsOverlay />
                                <WallEngine />
                            </g>

                            <NodeEngine />
                            <circle
                                cx={0}
                                cy={0}
                                r={4}
                                fill='orange'
                                opacity={0.4} />
                        </g>

                        {/* Debug info */}
                        <text x="10" y="20" fill="#888" fontSize="12" fontFamily="monospace">
                            Zoom: {view.zoom.toFixed(2)} | View: ({view.x.toFixed(1)}, {view.y.toFixed(1)})
                        </text>

                        <text x="10" y="50" fill="#10b981" fontSize="12" fontFamily="monospace">
                            Center: (0,0) is at center of canvas
                        </text>
                    </svg>
                </CanvasPortal>
            </div>
        </CanvasContext.Provider>
    );
}