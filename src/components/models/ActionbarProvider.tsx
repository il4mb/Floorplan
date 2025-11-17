import { ActionsContext, Event } from '@/hooks/useActionbars';
import { useSelectedNode } from '@/hooks/useFloorplan';
import { useModelMap } from '@/hooks/useModels';
import { Actionbar } from '@/utils/model';
import { Dispatch, ReactNode, SetStateAction, useCallback, useRef } from 'react';

export interface ActionbarProviderProps {
    children?: ReactNode;
    setListeners: Dispatch<SetStateAction<Map<string, (event: any) => void>>>;
    activeToggles: Record<string, string>;
    setActiveToggles: Dispatch<SetStateAction<Record<string, string>>>;
    toggled: Actionbar | null;
    onEvent?: (evt: Event) => void
}
export default function ActionbarProvider({ children, setListeners, activeToggles, setActiveToggles, toggled, onEvent }: ActionbarProviderProps) {

    const modelMap = useModelMap();
    const selected = useSelectedNode();
    const listenerIdCounter = useRef(0);

    const generateId = useCallback(() => {
        return `listener-${++listenerIdCounter.current}-${Date.now()}`;
    }, []);

    const toggleById = useCallback((itemId: string) => {
        if (!selected?.[0]?.type) return;
        const model = modelMap.get(selected[0]?.type);
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
                        type: "untoggled",
                        toolbar: previousToolbar,
                        context
                    });
                }
            }

            // Toggle new item
            if (onEvent) {
                onEvent({
                    type: "toggled",
                    toolbar,
                    context
                });
            }
        }
    }, [modelMap, activeToggles, onEvent]);

    const isToggled = useCallback((itemId: string) => {
        if (!selected?.[0]?.type) return false;
        const model = modelMap.get(selected[0]?.type);
        if (!model?.actionbars) return false;

        const toolbar = model.actionbars.find(t => t.id === itemId);
        if (!toolbar) return false;

        const context = toolbar.context || 'default';
        return activeToggles[context] === itemId;
    }, [modelMap, activeToggles]);

    const addToggledListener = useCallback((listener: (event: any) => void) => {
        const id = generateId();
        const listenerId = `toggled-${id}`;
        setListeners(prev => new Map(prev).set(listenerId, listener));
        return () => {
            setListeners(prev => {
                const newMap = new Map(prev);
                newMap.delete(listenerId);
                return newMap;
            });
        };
    }, [generateId]);

    const addClickListener = useCallback((listener: (event: any) => void) => {
        const id = generateId();
        const listenerId = `click-${id}`;
        setListeners(prev => new Map(prev).set(listenerId, listener));
        return () => {
            setListeners(prev => {
                const newMap = new Map(prev);
                newMap.delete(listenerId);
                return newMap;
            });
        };
    }, [generateId]);

    const addUntoggledListener = useCallback((listener: (event: any) => void) => {
        const id = generateId();
        const listenerId = `untoggled-${id}`;
        setListeners(prev => new Map(prev).set(listenerId, listener));
        return () => {
            setListeners(prev => {
                const newMap = new Map(prev);
                newMap.delete(listenerId);
                return newMap;
            });
        };
    }, [generateId]);

    

    return (
        <ActionsContext.Provider
            value={{
                addClickListener,
                addToggledListener,
                addUntoggledListener,
                toggleById,
                isToggled,
                toggled
            }}>
            {children}
        </ActionsContext.Provider>
    );
}