import { createContext, useContext, useMemo } from 'react';
import { FloorplanData, FloorplanState, FloorplanActions, Node } from '../types';
import { HistoryManager } from '../utils/history';
import { importFromJSON } from '../utils/exportImport';

export interface FloorplanAction {
    type: string;
    payload?: any;
}

export const initialData: FloorplanData = {
    meta: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    units: 'meters',
    gridSize: 0.1,
    nodes: []
};

export const initialState: FloorplanState = {
    data: initialData,
    selection: [],
    tool: 'select',
    view: { x: 0, y: 0, zoom: 1 },
    history: {
        past: [],
        future: []
    }
};

export function floorplanReducer(state: FloorplanState, action: FloorplanAction): FloorplanState {

    const history = new HistoryManager();
    history.past = state.history.past;
    history.future = state.history.future;

    switch (action.type) {

        case 'SET_DATA':
            history.push(state.data);
            return {
                ...state,
                data: action.payload,
                history: {
                    past: history.past,
                    future: history.future
                }
            };

        case 'ADD_NODE': {
            const newNode: Node = {
                ...action.payload,
                id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };

            const newData = {
                ...state.data,
                nodes: [...state.data.nodes, newNode],
                meta: {
                    ...state.data.meta,
                    updatedAt: new Date().toISOString()
                }
            };

            history.push(state.data);
            return {
                ...state,
                data: newData,
                selection: [newNode.id],
                history: {
                    past: history.past,
                    future: history.future
                }
            };
        }

        case 'UPDATE_NODE': {
            const { id, patch } = action.payload;
            const newData = {
                ...state.data,
                nodes: state.data.nodes.map(node =>
                    node.id === id ? { ...node, ...patch } : node
                ),
                meta: {
                    ...state.data.meta,
                    updatedAt: new Date().toISOString()
                }
            };

            history.push(state.data);
            return {
                ...state,
                data: newData,
                history: {
                    past: history.past,
                    future: history.future
                }
            };
        }

        case 'REMOVE_ITEMS': {
            const ids = action.payload;
            const newData = {
                ...state.data,
                // walls: state.data.walls.filter(wall => !ids.includes(wall.id)),
                nodes: state.data.nodes.filter(node => !ids.includes(node.id)),
                meta: {
                    ...state.data.meta,
                    updatedAt: new Date().toISOString()
                }
            };

            history.push(state.data);
            return {
                ...state,
                data: newData,
                selection: state.selection.filter(id => !ids.includes(id)),
                history: {
                    past: history.past,
                    future: history.future
                }
            };
        }

        case 'SELECT':
            return {
                ...state,
                selection: action.payload
            };

        case 'SET_TOOL':
            return {
                ...state,
                tool: action.payload
            };

        case 'UPDATE_VIEW':
            return {
                ...state,
                view: { ...state.view, ...action.payload }
            };

        case 'UNDO': {
            const previous = history.undo(state.data);
            if (!previous) return state;

            return {
                ...state,
                data: previous,
                history: {
                    past: history.past,
                    future: history.future
                }
            };
        }

        case 'REDO': {
            const next = history.redo(state.data);
            if (!next) return state;

            return {
                ...state,
                data: next,
                history: {
                    past: history.past,
                    future: history.future
                }
            };
        }

        case 'IMPORT_JSON':
            const importedData = importFromJSON(action.payload);
            return {
                ...state,
                data: importedData,
                selection: []
            };


        default:
            return state;
    }
}


export const FloorplanContext = createContext<{ state: FloorplanState; actions: FloorplanActions } | null>(null);
export function useFloorplan() {
    const context = useContext(FloorplanContext);
    if (!context) throw new Error("useFloorplan should call inside FloorplanProvider");
    return context;
}


export function useSelected() {
    const { state } = useFloorplan();
    return useMemo(() => state.selection, [state.selection]);
}


export function useSelectedNode() {
    const { state } = useFloorplan();
    const selected = useSelected();
    return useMemo(() => state.data.nodes.filter(node => selected.includes(node.id)), [state.data.nodes, selected])
}