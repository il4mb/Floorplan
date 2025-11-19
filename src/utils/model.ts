import { FC, ReactNode } from "react";
import { Node } from "types";

export type NodeState = {
    node: Node;
    updateNode(key: string, value: any): void;
    property: Property;
}

export type SingleProperty = {
    type: "text" | "number" | "color";
    label: string;
    name: string;
    value?: string;
    onChange?(this: NodeState): void;
}
export type ComposeProperty = Omit<SingleProperty, 'type'> & {
    type: "compose";
    properties: Property[];
}
export type Property = SingleProperty | ComposeProperty;
export type Actionbar = {
    id: string;
    title?: string;
    icon: ReactNode;
    context: string;
    toggle?: boolean;
    tooltip?: string;
}

export type NodeUpdateHandler = {
    (key: string, value: any): void;
    (data: Record<string, any>): void;
};

export type Model<T extends Node = Node> = {

    type: string;
    name: string;
    icon: FC<{ width: number; height: number; color: string; }>;
    actionbars?: Actionbar[];
    render: FC<{ node: T, selected: boolean; updateNode: NodeUpdateHandler }>;
    properties?: Property[];
    onPropsChange?(this: NodeState): void;

}