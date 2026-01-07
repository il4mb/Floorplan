import { Engine } from "@/types";
import { createContext, Dispatch, SetStateAction, useContext } from "react";
export type EngineState = Engine & {
    updateView: (patch: Partial<Engine['view']>) => void;
    setGridSize: Dispatch<SetStateAction<number>>;
    setUnit: Dispatch<SetStateAction<Engine['unit']>>;
    setMode: Dispatch<SetStateAction<Engine['mode']>>;
    // Screen pixels per millimeter (world units are mm). Use to keep the old
    // px-based feel while the world model stays in mm.
    pxPerMm: number;
    scalePixel: (pixel: number, min?: number, max?: number) => number;
    // Global UI interaction flag (e.g. dragging). Used to pause expensive
    // computations like room detection during active manipulation.
    isInteracting: boolean;
    setIsInteracting: Dispatch<SetStateAction<boolean>>;

    // Currently selected wall (for editing per-wall properties like thickness).
    selectedWallId: string | null;
    setSelectedWallId: Dispatch<SetStateAction<string | null>>;

    // Guideline snapping/visual guides toggle (independent from Snap enabled).
    guidelinesEnabled: boolean;
    setGuidelinesEnabled: Dispatch<SetStateAction<boolean>>;
}

export const EngineContext = createContext<EngineState | undefined>(undefined);

export const useEngine = () => {
    const ctx = useContext(EngineContext);
    if (!ctx) throw new Error("useEngine should call inside EngineProvider");
    return ctx;
}
