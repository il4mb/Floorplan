// src/components/FloorplanProvider.tsx
import React, { useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import { FloorplanData, FloorplanState, FloorplanActions, Node, Tool, ViewState } from '../types';
import { exportToJSON, importFromJSON, exportToSVG } from '../utils/exportImport';
import { FloorplanContext, floorplanReducer, initialState } from '@/hooks/useFloorplan';
import ModelProvider from './models/ModelProvider';


interface FloorplanProviderProps {
    children: React.ReactNode;
    initialData?: FloorplanData;
    value?: FloorplanData;
    onChange?: (data: FloorplanData) => void;
    onSelectionChange?: (selection: string[]) => void;
    onToolChange?: (tool: Tool) => void;
    onViewChange?: (view: ViewState) => void;
}

export const FloorplanProvider: React.FC<FloorplanProviderProps> = ({
    children,
    initialData,
    value,
    onChange,
    onSelectionChange,
    onToolChange,
    onViewChange
}) => {


    // Use controlled data if provided, otherwise use reducer state
    const [internalState, dispatch] = useReducer(floorplanReducer, {
        ...initialState,
        data: value || initialData || initialState.data
    });

    // If controlled mode (value prop provided), use that data, otherwise use internal state
    const state = value ? { ...internalState, data: value } : internalState;

    // Notify parent when data changes (for uncontrolled mode)
    useEffect(() => {
        if (!value && onChange) {
            onChange(internalState.data);
        }
    }, [internalState.data, value, onChange]);

    // Notify parent when selection changes
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(state.selection);
        }
    }, [state.selection, onSelectionChange]);

    // Notify parent when tool changes
    useEffect(() => {
        if (onToolChange) {
            onToolChange(state.tool);
        }
    }, [state.tool, onToolChange]);

    // Notify parent when view changes
    useEffect(() => {
        if (onViewChange) {
            onViewChange(state.view);
        }
    }, [state.view, onViewChange]);

    const actions: FloorplanActions = {

        addNode: useCallback((node: Omit<Node, 'id'>) => {
            const id = `node-${Date.now()}`;
            if (!value) {
                dispatch({
                    type: 'ADD_NODE',
                    payload: { ...node, id }
                });
            } else if (onChange) {
                const newNode: Node = { ...node, id };
                const newData = {
                    ...value,
                    nodes: [...value.nodes, newNode],
                    meta: {
                        ...value.meta,
                        updatedAt: new Date().toISOString()
                    }
                };
                onChange(newData);
            }
            dispatch({
                type: 'SELECT',
                payload: [id]
            });
            return id;
        }, [value, onChange]),

        updateNode: useCallback((id: string, patch: Partial<Node>) => {
            if (!value) {
                dispatch({
                    type: 'UPDATE_NODE',
                    payload: { id, patch }
                });
            } else if (onChange) {
                const newData = {
                    ...value,
                    nodes: value.nodes.map(n => n.id === id ? { ...n, ...patch } : n),
                    meta: {
                        ...value.meta,
                        updatedAt: new Date().toISOString()
                    }
                };
                onChange(newData);
            }
        }, [value, onChange]),

        removeItems: useCallback((ids: string[]) => {
            if (!value) {
                dispatch({
                    type: 'REMOVE_ITEMS',
                    payload: ids
                });
            } else if (onChange) {
                const newData = {
                    ...value,
                    // walls: value.walls.filter(w => !ids.includes(w.id)),
                    nodes: value.nodes.filter(n => !ids.includes(n.id)),
                    meta: {
                        ...value.meta,
                        updatedAt: new Date().toISOString()
                    }
                };
                onChange(newData);
            }
        }, [value, onChange]),

        select: useCallback((ids: string[]) => {
            dispatch({
                type: 'SELECT',
                payload: ids
            });
        }, []),

        setTool: useCallback((tool: Tool) => {
            dispatch({
                type: 'SET_TOOL',
                payload: tool
            });
            if (tool == "draw") {
                dispatch({
                    type: "SELECT",
                    payload: []
                })
            }
        }, []),

        updateView: useCallback((view: Partial<ViewState>) => {
            dispatch({
                type: 'UPDATE_VIEW',
                payload: view
            });
        }, []),

        undo: useCallback(() => {
            if (!value) {
                dispatch({ type: 'UNDO' });
            }
            // Note: undo/redo not supported in controlled mode
        }, [value]),

        redo: useCallback(() => {
            if (!value) {
                dispatch({ type: 'REDO' });
            }
            // Note: redo not supported in controlled mode
        }, [value]),

        exportJSON: useCallback(() => {
            return exportToJSON(state.data);
        }, [state.data]),

        importJSON: useCallback((json: string) => {
            if (!value) {
                dispatch({
                    type: 'IMPORT_JSON',
                    payload: json
                });
            } else if (onChange) {
                const importedData = importFromJSON(json);
                onChange(importedData);
            }
        }, [value, onChange]),

        exportSVG: useCallback(() => {
            return exportToSVG(state.data);
        }, [state.data]),

    };

    return (
        <FloorplanContext.Provider value={{ state, actions }}>
            <ModelProvider>
                {children}
            </ModelProvider>
        </FloorplanContext.Provider>
    );
};

export const useFloorplanContext = () => {
    const context = useContext(FloorplanContext);
    if (!context) {
        throw new Error('useFloorplanContext must be used within a FloorplanProvider');
    }
    return context;
};

export const useStateData = () => {
    const { state } = useFloorplanContext();
    return useMemo(() => state.data, [state.data]);
}