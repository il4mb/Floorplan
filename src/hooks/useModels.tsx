import { createContext, useContext } from "react";
import { Model } from "utils/model";

type DraggingState = {
    dragging: Model | null;
    setDragging(model: Model | null): void;
}

export const ModelContext = createContext<Map<string, Model> | null>(null);
export const ModelDraggingContext = createContext<DraggingState | undefined>(undefined);

export function useModelMap() {
    const ctx = useContext(ModelContext);
    if (!ctx) throw new Error("useNodeModels must be used inside <ModelProvider>");
    return ctx;
}

export function useModelsArray() {
    const models = useModelMap();
    return Array.from(models.values());
}

export function useModel(type: string) {
    const models = useModelMap();
    return models.get(type);
}


const useDraggingContext = () => {
    const ctx = useContext(ModelDraggingContext);
    if (!ctx) throw new Error("useDraggingContext should call inside ModelProvider");
    return ctx;
}
export const useDragging = () => useDraggingContext().dragging;
export const useSetDragging = () => useDraggingContext().setDragging;