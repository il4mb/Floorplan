// src/utils/history.ts
import { FloorplanData } from '../types';

export class HistoryManager {

    past: FloorplanData[] = [];
    future: FloorplanData[] = [];
    maxSize: number;

    constructor(maxSize: number = 100) {
        this.maxSize = maxSize;
    }

    push(state: FloorplanData): void {
        this.past.push(JSON.parse(JSON.stringify(state)));
        this.future = []; // Clear redo stack on new action

        // Limit history size
        if (this.past.length > this.maxSize) {
            this.past.shift();
        }
    }

    undo(current: FloorplanData): FloorplanData | null {
        if (this.past.length === 0) return null;

        this.future.push(JSON.parse(JSON.stringify(current)));
        const previous = this.past.pop()!;

        return previous;
    }

    redo(current: FloorplanData): FloorplanData | null {
        if (this.future.length === 0) return null;

        this.past.push(JSON.parse(JSON.stringify(current)));
        const next = this.future.pop()!;

        return next;
    }

    canUndo(): boolean {
        return this.past.length > 0;
    }

    canRedo(): boolean {
        return this.future.length > 0;
    }

    clear(): void {
        this.past = [];
        this.future = [];
    }
}