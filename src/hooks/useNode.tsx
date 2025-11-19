import { Node, Vert } from "@/types";
import { createContext, useCallback, useContext } from "react";

type NodeContextState = {
    node: Node;
    setData(key: string, value: any): void;
}
export const NodeContext = createContext<NodeContextState | undefined>(undefined);

export const useLocalNode = () => {
    const ctx = useContext(NodeContext);
    if (!ctx) throw new Error("useNode should call inside NodeComponent");
    return ctx;
}

export const useNodeGeometry = () => {

    const { node } = useLocalNode();
    const localToWorld = useCallback(({ x, y }: Vert) => {
        return { x: x + node.x, y: y + node.y }
    }, [node.x, node.y]);

    const worldToLocal = useCallback((point: Vert, anchor?: Vert) => {
        const { x, y } = anchor ? anchor : node;
        return { x: point.x - x, y: point.y - y }
    }, [node.x, node.y]);

    return {
        localToWorld,
        worldToLocal
    }
}