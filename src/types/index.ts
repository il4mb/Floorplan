export type Rect = { width: number, height: number; x: number; y: number };


export interface Vert {
    x: number;
    y: number;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Line {
    id: string;
    points: Vert[];
    thickness: number;
}

export interface NodeLabel {
    text: string;
    x: number;
    y: number;
    color?: string;
    size?: number;
}
export interface Node {
    id: string;
    type: string;
    layerId: string;
    x: number;
    y: number;
    rotation: number;
    points: Vert[];
    thickness?: number;
    label?: NodeLabel;
}

// export type Node<T = Record<string, any>> = NodeBase & { data: T };

export interface FloorplanData {
    meta: {
        version: string;
        createdAt: string;
        updatedAt: string;
    };
    units: 'meters' | 'feet' | 'pixels';
    gridSize: number;
    nodes: Node[];
}

export interface ViewState {
    x: number;
    y: number;
    zoom: number;
}

export type Tool = 'select' | 'pan' | 'measure' | 'erase';

export interface FloorplanState {
    data: FloorplanData;
    selection: string[];
    tool: Tool;
    view: ViewState;
    history: {
        past: FloorplanData[];
        future: FloorplanData[];
    };
}

export interface FloorplanActions {
    addNode: (node: Omit<Node, 'id'>) => string;
    updateNode: (id: string, patch: Partial<Node>) => void;
    removeItems: (ids: string[]) => void;
    select: (ids: string[]) => void;
    setTool: (tool: Tool) => void;
    updateView: (view: Partial<ViewState>) => void;
    undo: () => void;
    redo: () => void;
    exportJSON: () => string;
    importJSON: (json: string) => void;
    exportSVG: () => string;
}

export type FloorplanContextValue = {
    state: FloorplanState;
    actions: FloorplanActions;
};


export type Layer = {
    name: string;
    id: string;
    order: number;
    visible: boolean;
    locked: boolean;
    opacity?: number;
    color?: string;
}