export interface Point {
    x: number;
    y: number;
}
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Wall {
    id: string;
    from: Point;
    to: Point;
    thickness: number;
}
export interface NodeBase {
    id: string;
    type: string;
    x: number;
    y: number;
    rotation: number;
}
export interface DoorNode extends NodeBase {
    type: 'door';
    props: {
        width: number;
        swing: 'left' | 'right' | 'double';
    };
}
export interface WindowNode extends NodeBase {
    type: 'window';
    props: {
        width: number;
        height: number;
    };
}
export interface FurnitureNode extends NodeBase {
    type: 'furniture';
    props: {
        width: number;
        height: number;
        variant: 'chair' | 'table' | 'sofa' | 'bed' | 'desk' | 'cabinet';
    };
}
export type Node = DoorNode | WindowNode | FurnitureNode;
export interface FloorplanData {
    meta: {
        version: string;
        createdAt: string;
        updatedAt: string;
    };
    units: 'meters' | 'feet' | 'pixels';
    gridSize: number;
    walls: Wall[];
    nodes: Node[];
}
export interface ViewState {
    x: number;
    y: number;
    zoom: number;
}
export type Tool = 'select' | 'pan' | 'wall' | 'door' | 'window' | 'furniture' | 'measure' | 'erase';
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
    addWall: (from: Point, to: Point, opts?: {
        thickness?: number;
    }) => string;
    addNode: (node: Omit<Node, 'id'>) => string;
    updateNode: (id: string, patch: Partial<Node>) => void;
    updateWall: (id: string, patch: Partial<Wall>) => void;
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
//# sourceMappingURL=index.d.ts.map