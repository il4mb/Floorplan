import React, { useRef, useEffect, useState, useCallback, useMemo, MouseEvent } from 'react';
import { Vert, Rect } from '../types';
import { SnapEngine } from '../utils/snap';
import { useFloorplanContext } from './FloorplanProvider';
import GridCanvas, { GridPoint } from './GridCanvas';
import NodeRender from './nodes/NodeRender';
import { rotatePoint } from '../utils/geometry';
import { useLayers } from './LayersProvider';
import SpotsProvider from './SpotsProvider';
import { PointerContext } from '@/hooks/usePointer';
import { Callback, CanvasContext, EventListeners, EventName, Unsubscribe } from '@/hooks/useCanvas';

const DOUBLE_CLICK_MS = 250;

interface FloorplanCanvasProps {
    gridSize?: number;
    snap?: boolean;
    className?: string;
    background?: string;
}

const FloorplanCanvas: React.FC<FloorplanCanvasProps> = ({ gridSize = 10, snap = true, className = '', background = 'rgb(10, 17, 19)' }) => {

    const { layers } = useLayers();
    const [listeners,] = useState<EventListeners>(new Map());
    const [rect, setRect] = useState<Rect>({ width: 0, height: 0, x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const { state, actions } = useFloorplanContext();
    const svgRef = useRef<SVGSVGElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Vert | null>(null);
    const [currentPoint, setCurrentPoint] = useState<Vert | null>(null);
    const [selectionStart, setSelectionStart] = useState<Vert | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const gridPointsRef = useRef<GridPoint[]>([]);
    const snapEngine = useRef(new SnapEngine(gridSize));
    const viewBox = useMemo(() => `0 0 ${rect.width} ${rect.height}`, [rect]);

    const invokeListeners = useCallback((event: EventName, e: MouseEvent) => {
        listeners.get(event)?.forEach((callback) => {
            try {
                callback(e);
            } catch (e) {
                console.error(e);
            }
        });
    }, [listeners]);

    const addListener = useCallback((event: EventName, callback: Callback): Unsubscribe => {
        let eventMap = listeners.get(event);
        if (!eventMap) {
            eventMap = new Map();
            listeners.set(event, eventMap);
        }

        const id = crypto.randomUUID();
        eventMap.set(id, callback);

        return () => {
            eventMap?.delete(id);
        };
    }, [listeners]);


    // Convert screen coordinates to world coordinates
    const clientToWorldPoint = useCallback(({ x, y }: Vert): Vert => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };

        const rect = svg.getBoundingClientRect();
        const screenX = x - rect.left;
        const screenY = y - rect.top;

        // Convert screen coordinates to world coordinates
        const worldX = (screenX / state.view.zoom) + state.view.x;
        const worldY = (screenY / state.view.zoom) + state.view.y;

        return { x: worldX, y: worldY };
    }, [state.view.zoom, state.view.x, state.view.y]);

    // Convert world coordinates to screen coordinates
    const worldToScreenPoint = useCallback(({ x, y }: Vert): Vert => {
        const screenX = (x - state.view.x) * state.view.zoom;
        const screenY = (y - state.view.y) * state.view.zoom;
        return { x: screenX, y: screenY };
    }, [state.view.zoom, state.view.x, state.view.y]);


    const snapPoint = useCallback((point: Vert, threshold = 25) => {
        return snapEngine.current.snap(point, threshold, state.view.zoom)?.point || point;
    }, [state.view.zoom]);


    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        invokeListeners("contextmenu", e);
        actions.setTool("select");
    }

    const handleMouseDown = useCallback((e: MouseEvent) => {

        invokeListeners("mousedown", e);
        if (e.isDefaultPrevented()) return;

        const worldPoint = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        const snappedPoint = snap ? snapEngine.current.snap(worldPoint)?.point || worldPoint : worldPoint;

        if (state.tool === 'pan') {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            return;
        }

        if (state.tool === 'select') {
            setSelectionStart(snappedPoint);
            return;
        }
    }, [state.tool, currentPoint, actions, snap, clientToWorldPoint, invokeListeners]);


    const handleMouseMove = useCallback((e: React.MouseEvent) => {

        invokeListeners("mousemove", e);
        if (e.isDefaultPrevented()) return;

        const worldPoint = clientToWorldPoint({ x: e.clientX, y: e.clientY });
        const snappedPoint = snap ? snapPoint(worldPoint) : worldPoint;

        if (isDragging && dragStart) {
            const deltaX = (dragStart.x - e.clientX) / state.view.zoom;
            const deltaY = (dragStart.y - e.clientY) / state.view.zoom;

            actions.updateView({
                x: state.view.x + deltaX,
                y: state.view.y + deltaY
            });

            setDragStart({ x: e.clientX, y: e.clientY });
            return;
        }

        if (selectionStart && state.tool === 'select') {
            setCurrentPoint(snappedPoint);
            return;
        }

        setCurrentPoint(snappedPoint);
    }, [isDragging, dragStart, selectionStart, state.tool, state.view, actions, snap, clientToWorldPoint, invokeListeners, snapPoint]);

    // Then use it in handleMouseUp:
    const handleMouseUp = useCallback((e: MouseEvent) => {

        invokeListeners("mouseup", e);
        if (!e.isDefaultPrevented()) {

            setIsDragging(false);
            setDragStart(null);

            if (selectionStart && currentPoint && state.tool === "select") {

                const minX = Math.min(selectionStart.x, currentPoint.x);
                const maxX = Math.max(selectionStart.x, currentPoint.x);
                const minY = Math.min(selectionStart.y, currentPoint.y);
                const maxY = Math.max(selectionStart.y, currentPoint.y);

                const selectedIds: string[] = [];

                for (const node of state.data.nodes) {

                    const layer = layers.find(l => l.id === node.layerId);
                    if (layer?.locked || !layer?.visible) continue;

                    const center = { x: node.x, y: node.y };
                    const globalPoly = node.points.map(point => {
                        const r = rotatePoint(point, center, node.rotation * (Math.PI / 180));
                        return {
                            x: r.x + center.x,
                            y: r.y + center.y,
                        };
                    });

                    // check if ANY vertex inside rectangle
                    const anyInside = globalPoly.some(pt =>
                        pt.x >= minX && pt.x <= maxX &&
                        pt.y >= minY && pt.y <= maxY
                    ) || center.x >= minX && center.x <= maxX && center.y >= minY && center.y <= maxY;

                    if (anyInside) {
                        selectedIds.push(node.id);
                    }
                }
                actions.select(selectedIds);
            }
        }

        setSelectionStart(null);

    }, [selectionStart, currentPoint, state.tool, state.data, actions]);

    const handleMouseLeave = useCallback((e: MouseEvent) => {
        invokeListeners("mouseleave", e);
        if (e.isDefaultPrevented()) return;
        setCurrentPoint(null);
    }, []);

    const handleMouseEnter = useCallback((e: MouseEvent) => {
        invokeListeners("mouseenter", e);
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();

        const rect = svgRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.001;
        const delta = -e.deltaY * zoomIntensity;
        const newZoom = Math.max(0.1, Math.min(10, state.view.zoom + delta));

        // Get mouse position in world coordinates before zoom
        const mouseWorldPos = clientToWorldPoint({ x: e.clientX, y: e.clientY });

        // Calculate new view position to zoom to mouse pointer
        const newX = mouseWorldPos.x - (mouseX / newZoom);
        const newY = mouseWorldPos.y - (mouseY / newZoom);

        actions.updateView({
            zoom: newZoom,
            x: newX,
            y: newY
        });
    }, [state.view.zoom, state.view.x, state.view.y, actions, clientToWorldPoint]);


    const renderSelectionBox = () => {
        if (!selectionStart || !currentPoint || state.tool !== 'select') return null;

        const startScreen = worldToScreenPoint(selectionStart);
        const endScreen = worldToScreenPoint(currentPoint);

        const x = Math.min(startScreen.x, endScreen.x);
        const y = Math.min(startScreen.y, endScreen.y);
        const boxWidth = Math.abs(endScreen.x - startScreen.x);
        const boxHeight = Math.abs(endScreen.y - startScreen.y);

        return (
            <rect
                x={x}
                y={y}
                width={boxWidth}
                height={boxHeight}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="4,2"
            />
        );
    };

    const updateRect = (container: HTMLElement) => {
        const rect = container.getBoundingClientRect()
        setRect(rect);
    }

    useEffect(() => {
        if (rect.width > 0 && rect.height > 0 && !isInitialized) {
            const centerX = -rect.width / (2 * state.view.zoom);
            const centerY = -rect.height / (2 * state.view.zoom);

            actions.updateView({
                x: centerX,
                y: centerY
            });

            setIsInitialized(true);
            console.log('Centered view at:', { centerX, centerY, width: rect.width, height: rect.height, zoom: state.view.zoom });
        }
        snapEngine.current.enableAdaptiveGrid(true);
    }, [rect, state.view.zoom, actions, isInitialized]);

    useEffect(() => {
        if (!containerRef.current) return;
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

    useEffect(() => {
        snapEngine.current.enableAdaptiveGrid(true);
    }, []);

    // Add center indicator for debugging
    const renderCenterIndicator = () => {
        const centerScreen = worldToScreenPoint({ x: 0, y: 0 });
        return (
            <g>
                <circle
                    cx={centerScreen.x}
                    cy={centerScreen.y}
                    r={4}
                    fill="#10b981"
                    opacity={0.8}
                />
                <text
                    x={centerScreen.x + 10}
                    y={centerScreen.y - 10}
                    fill="#10b981"
                    fontSize="10"
                    fontFamily="monospace">
                    (0,0)
                </text>
            </g>
        );
    };

    return (
        <PointerContext.Provider value={currentPoint}>
            <SpotsProvider rect={rect}>
                <CanvasContext.Provider value={{ snapPoint, addListener, clientToWorldPoint, worldToScreenPoint }}>
                    <div ref={containerRef} className={`floorplan-canvas ${className}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, background }} />

                        <GridCanvas
                            pointsRef={gridPointsRef}
                            width={rect.width}
                            height={rect.height}
                            zoom={state.view.zoom}
                            viewOffset={state.view}
                        />

                        <svg
                            ref={svgRef}
                            width={'100%'}
                            height={'100%'}
                            viewBox={viewBox}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            onMouseEnter={handleMouseEnter}
                            onWheel={handleWheel}
                            onContextMenu={handleContextMenu}
                            style={{
                                cursor: isDragging ? 'grabbing' : (state.tool === 'pan' ? 'grab' : 'crosshair'),
                                background: 'transparent',
                                position: 'relative',
                                zIndex: 2
                            }}>

                            {/* Content transformed to world coordinates */}
                            <g transform={`translate(${-state.view.x * state.view.zoom}, ${-state.view.y * state.view.zoom}) scale(${state.view.zoom})`}>

                                <NodeRender />
                            </g>

                            {/* Selection box in screen coordinates */}
                            {renderSelectionBox()}

                            {/* Center indicator */}
                            {renderCenterIndicator()}

                            {/* Debug info */}
                            <text x="10" y="20" fill="white" fontSize="12" fontFamily="monospace">
                                Zoom: {state.view.zoom.toFixed(2)} | View: ({state.view.x.toFixed(1)}, {state.view.y.toFixed(1)})
                            </text>
                            {currentPoint && (
                                <text x="10" y="35" fill="white" fontSize="12" fontFamily="monospace">
                                    Cursor: ({currentPoint.x.toFixed(1)}, {currentPoint.y.toFixed(1)})
                                </text>
                            )}
                            <text x="10" y="50" fill="#10b981" fontSize="12" fontFamily="monospace">
                                Center: (0,0) is at center of canvas
                            </text>
                        </svg>
                    </div>
                </CanvasContext.Provider>
            </SpotsProvider>
        </PointerContext.Provider>
    );
};

export default FloorplanCanvas;