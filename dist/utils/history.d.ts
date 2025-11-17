import { FloorplanData } from '../types';
export declare class HistoryManager {
    past: FloorplanData[];
    future: FloorplanData[];
    maxSize: number;
    constructor(maxSize?: number);
    push(state: FloorplanData): void;
    undo(current: FloorplanData): FloorplanData | null;
    redo(current: FloorplanData): FloorplanData | null;
    canUndo(): boolean;
    canRedo(): boolean;
    clear(): void;
}
//# sourceMappingURL=history.d.ts.map