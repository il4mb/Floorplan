import { createContext, useContext } from "react";
import { Model } from "utils/model";

export const ModelContext = createContext<Map<string, Model> | null>(null);

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
