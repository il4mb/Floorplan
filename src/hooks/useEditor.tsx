import { Node as PlanNode, PlanData, Wall } from "@/types";
import { createContext, Dispatch, SetStateAction, useCallback, useContext } from "react";
import { nanoid } from "nanoid";
export type EditorState = {
    data: PlanData;
    setData: Dispatch<SetStateAction<PlanData>>
}

export const EditorContext = createContext<EditorState | undefined>(undefined);

export const useEditor = () => {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error("useEditor should call inside EditorProvider");
    const { data, setData } = ctx;

    const addWall = (patch: Omit<Wall, 'id'>) => setData(prev => ({ ...prev, walls: [...prev.walls, { ...patch, id: nanoid() }] }));
    const addWalls = (patches: Omit<Wall, 'id'>[]) => setData(prev => ({ ...prev, walls: [...prev.walls, ...(patches.map(wall => ({ ...wall, id: nanoid() })))] }));

    const updateWall = useCallback((id: string, partial: Partial<Wall>) =>
        setData(prev => ({
            ...prev,
            walls: prev.walls.map(w => w.id === id ? { ...w, ...partial } : w)
        })), []);

    const updateWalls = useCallback((ids: string[], partials: Partial<Wall>[]) =>
        setData(prev => ({
            ...prev,
            walls: prev.walls.map(w => {
                const index = ids.indexOf(w.id);
                return index !== -1 ? { ...w, ...partials[index] } : w;
            })
        })), []);


    const removeWalls = useCallback((id: string | string[]) => {
        const ids = Array.isArray(id) ? id : [id];
        setData(prev => ({
            ...prev,
            walls: prev.walls.filter(w => !ids.includes(w.id))
        }));
    }, []);

    const addNode = useCallback((node: PlanNode) =>
        setData(prev => ({ ...prev, node: [...prev.node, node] })), []);

    const updateNode = useCallback((id: string, partial: Partial<PlanNode>) =>
        setData(prev => ({
            ...prev,
            node: prev.node.map(n => n.id === id ? { ...n, ...partial } : n)
        })), []);

    const removeNode = useCallback((id: string) =>
        setData(prev => ({
            ...prev,
            node: prev.node.filter(n => n.id !== id)
        })), []);

    return {
        data,
        setData,
        addWall,
        addWalls,
        updateWall,
        updateWalls,
        removeWalls,
        addNode,
        updateNode,
        removeNode
    };
};
