import { Node } from "@/types";
import { createContext } from "react";

type NodeContextState = {
    node: Node;
    setData(key: string, value: any): void;
}
export const NodeContext = createContext<NodeContextState|undefined>(undefined);
