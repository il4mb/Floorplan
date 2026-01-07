export interface Point {
    x: number;
    y: number;
}

export type LineSegment = [Point, Point];

export interface Rect extends Point {
    width: number;
    height: number;
}


export interface Engine {
    mode: string;
    view: {
        zoom: number;
        x: number;
        y: number;
    },
    gridSize: number;
    unit: 'meters' | 'feet' | 'pixels';
}

export interface Wall {
    id: string;
    points: LineSegment,
    thickness: number;
    floor: number;
}
export interface Node {
    id: string;
    kind?: string;
    coordinate: Point;
    rotation: number;
    // Optional: when an object must be attached to a wall (e.g. door)
    wallId?: string;
    wallT?: number;
}

export interface RoomMeta {
    key: string;
    name: string;
    color: string; // hex or css color
}
export interface PlanData {
    walls: Wall[];
    node: Node[];
    roomsMeta?: RoomMeta[];
}