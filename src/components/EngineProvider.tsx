import { EngineContext, EngineState } from '@/hooks/useEngine';
import { GridContext, GridPoint, GridState } from '@/hooks/useGrid';
import { Engine } from '@/types';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import SnapProvider from './SnapProvider';

export interface EngineProviderProps {
    children?: ReactNode;
}
export default function EngineProvider({ children }: EngineProviderProps) {

    const [mode, setMode] = useState<string>('pan');
    const [view, setView] = useState<Engine['view']>({ zoom: 1, x: 0, y: 0 });
    const [gridSize, setGridSize] = useState<Engine['gridSize']>(10);
    const [unit, setUnit] = useState<Engine['unit']>('meters');
    const [gridPoints, setGridPoints] = useState<GridPoint[]>([]);
    const [gridDisabled, setGridDisabled] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);

    const updateView = useCallback((patch: Partial<Engine['view']>) => {
        setView(prev => ({ ...prev, ...patch }));
    }, []);

    const scalePixel = useCallback((pixel: number, min = 1, max = 100) => {
        return Math.min(Math.max(pixel / view.zoom, min), max);
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
        scalePixel,
        isInteracting,
        setIsInteracting,
    }), [view, gridSize, unit, mode, updateView, scalePixel, isInteracting]);

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