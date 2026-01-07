import { EngineContext, EngineState } from '@/hooks/useEngine';
import { GridContext, GridPoint, GridState } from '@/hooks/useGrid';
import { Engine } from '@/types';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import SnapProvider from './SnapProvider';

export interface EngineProviderProps {
    children?: ReactNode;
}
export default function EngineProvider({ children }: EngineProviderProps) {

    // World units are millimeters, but the original editor logic assumed
    // "world ~= screen pixels". This keeps the old visual feel: 1m = 100px.
    const pxPerMm = 0.1;

    const [mode, setMode] = useState<string>('pan');
    const [view, setView] = useState<Engine['view']>({ zoom: 1, x: 0, y: 0 });
    const [gridSize, setGridSize] = useState<Engine['gridSize']>(10);
    const [unit, setUnit] = useState<Engine['unit']>('meters');
    const [gridPoints, setGridPoints] = useState<GridPoint[]>([]);
    const [gridDisabled, setGridDisabled] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);
    const [selectedWallId, setSelectedWallId] = useState<string | null>(null);

    const updateView = useCallback((patch: Partial<Engine['view']>) => {
        setView(prev => ({ ...prev, ...patch }));
    }, []);

    // Convert a screen-pixel size into world millimeters at the current zoom.
    const scalePixel = useCallback((pixel: number, min = 1, max = 100) => {
        const denom = view.zoom * pxPerMm;
        const world = denom > 0 ? (pixel / denom) : pixel;
        return Math.min(Math.max(world, min), max);
    }, [view.zoom]);


    const value = useMemo<EngineState>(() => ({
        view,
        gridSize,
        unit,
        mode,
        updateView,
        setGridSize,
        setUnit,
        setMode,
        pxPerMm,
        scalePixel,
        isInteracting,
        setIsInteracting,
        selectedWallId,
        setSelectedWallId,
    }), [view, gridSize, unit, mode, updateView, scalePixel, isInteracting, selectedWallId]);

    const gridValue = useMemo<GridState>(() => ({
        points: gridPoints,
        disabled: gridDisabled,
        setDisabled: setGridDisabled,
        setPoints: setGridPoints
    }), [gridDisabled, gridPoints]);

    return (
        <EngineContext.Provider value={value}>
            <GridContext value={gridValue}>
                <SnapProvider>
                    {children}
                </SnapProvider>
            </GridContext>
        </EngineContext.Provider>
    );
}