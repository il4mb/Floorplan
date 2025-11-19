import { ActionsContext, Callback, Event } from '@/hooks/useActionbars';
import { useSelectedNode } from '@/hooks/useFloorplan';
import { useModelMap } from '@/hooks/useModels';
import { Actionbar } from '@/utils/model';
import { nanoid } from 'nanoid';
import { Dispatch, ReactNode, SetStateAction, useCallback } from 'react';

export interface ActionbarProviderProps {
    children?: ReactNode;
    setListeners: Dispatch<SetStateAction<Map<string, Map<string, Map<string, Callback>>>>>;
    activeToggles: Record<string, string>;
    setActiveToggles: Dispatch<SetStateAction<Record<string, string>>>;
    toggled: Actionbar | null;
    onEvent?: (evt: Event) => void
}
export default function ActionbarProvider({ children, setListeners, activeToggles, setActiveToggles, toggled, onEvent }: ActionbarProviderProps) {

    const modelMap = useModelMap();
    const selected = useSelectedNode();

    const getOnlyOneNode = useCallback(() => {
        return selected.length === 1 ? selected[0] : null;
    }, [selected])


    const toggleById = useCallback((itemId: string) => {
        const node = getOnlyOneNode();
        if (!node) return;
        
        const model = modelMap.get(node?.type);
        if (!model?.actionbars) return;

        // Find the toolbar item by ID
        const toolbar = model.actionbars.find(t => t.id === itemId);
        if (!toolbar) return;

        const context = toolbar.context || 'default';
        const previousActiveId = activeToggles[context];
        const isCurrentlyActive = previousActiveId === itemId;

        if (isCurrentlyActive) {
            // Untoggle
            setActiveToggles(prev => {
                const newState = { ...prev };
                delete newState[context];
                return newState;
            });

            if (onEvent) {
                onEvent({
                    nodeId: node.id,
                    type: "untoggled",
                    toolbar,
                    context
                });
            }
        } else {
            // Toggle
            setActiveToggles(prev => ({
                ...prev,
                [context]: itemId
            }));

            // Untoggle previous item in same context
            if (previousActiveId && onEvent) {
                const previousToolbar = model.actionbars.find(t => t.id === previousActiveId);
                if (previousToolbar) {
                    onEvent({
                        nodeId: node.id,
                        type: "untoggled",
                        toolbar: previousToolbar,
                        context
                    });
                }
            }

            // Toggle new item
            if (onEvent) {
                onEvent({
                    nodeId: node.id,
                    type: "toggled",
                    toolbar,
                    context
                });
            }
        }
    }, [modelMap, activeToggles, getOnlyOneNode, onEvent]);

    const isToggled = useCallback((itemId: string) => {
        if (!selected?.[0]?.type) return false;
        const model = modelMap.get(selected[0]?.type);
        if (!model?.actionbars) return false;

        const toolbar = model.actionbars.find(t => t.id === itemId);
        if (!toolbar) return false;

        const context = toolbar.context || 'default';
        return activeToggles[context] === itemId;
    }, [modelMap, activeToggles]);

    const addActionListener = useCallback((actionId: string, callback: (event: any) => void) => {
        
        const node = getOnlyOneNode();
        if (!node) return;
        let listenerId = nanoid();

        setListeners(prev => {

            const mapListener = new Map(prev);
            if (!mapListener.has(node.id)) {
                mapListener.set(node.id, new Map());
            }

            const actionMap = mapListener.get(node.id)!;
            if (!actionMap.has(actionId)) {
                actionMap.set(actionId, new Map());
            }

            const listenersForAction = actionMap.get(actionId)!;
            listenersForAction.set(listenerId, callback);
            return mapListener;
        });

        return () => {
            // unsubscribe
            setListeners(prev => {
                const mapListener = new Map(prev);
                const actionMap = mapListener.get(node.id);
                if (!actionMap) return prev;

                const listenersForAction = actionMap.get(actionId);
                if (!listenersForAction) return prev;

                listenersForAction.delete(listenerId);
                if (listenersForAction.size === 0) {
                    actionMap.delete(actionId);
                }
                if (actionMap.size === 0) {
                    mapListener.delete(node.id);
                }
                return mapListener;
            });
        };
    }, [getOnlyOneNode]);

    return (
        <ActionsContext.Provider value={{
                addActionListener,
                toggleById,
                isToggled,
                toggled
            }}>
            {children}
        </ActionsContext.Provider>
    );
}