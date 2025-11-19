import { useSelectedNode } from '@/hooks/useFloorplan';
import { Rect } from '@/types';
import { ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import ModelActionbar from './models/ModelActionbar';
import { Actionbar } from '@/utils/model';
import ActionbarProvider from './models/ActionbarProvider';
import { Event, MapListener } from '@/hooks/useActionbars';
import { waitForListener } from '@/utils/wait';

export interface Props {
    children?: ReactNode;
    rect: Rect;
}

export default function SpotsProvider({ children }: Props) {

    const selected = useSelectedNode();
    const [activeToggles, setActiveToggles] = useState<Record<string, string>>({});
    const [listeners, setListeners] = useState<MapListener>(new Map());
    const [toggled, setToggled] = useState<Actionbar | null>(null);
    const listenerRef = useRef(listeners);

    // sync
    useEffect(() => {
        listenerRef.current = listeners;
    }, [listeners]);

    // event handler
    const handleEvent = useCallback(async (event: Event) => {
        if (event.type === "toggled") setToggled(event.toolbar);
        else if (event.type === "untoggled") setToggled(null);

        try {
            const listenersMap = await waitForListener(listenerRef, event.nodeId, event.toolbar.id, 2000);
            // call each listener
            listenersMap.forEach((cb) => {
                try { cb(event); }
                catch (err) { console.error("Listener error", err); }
            });

        } catch (err) {
            console.warn("No listener found in 1 second");
        }
    }, []);


    useEffect(() => {
        return () => {
            setActiveToggles({});
            setToggled(null);
        };
    }, [selected]);

    return (
        <>
            <ActionbarProvider
                activeToggles={activeToggles}
                setActiveToggles={setActiveToggles}
                toggled={toggled}
                onEvent={handleEvent}
                setListeners={setListeners}>
                {children}

                <div className='absolute top-0 left-0 w-full h-full'>
                    {selected.length === 1 && (
                        <ModelActionbar
                            node={selected[0]!}
                            onEvent={handleEvent}
                            activeToggles={activeToggles}
                            setActiveToggles={setActiveToggles} />
                    )}
                </div>
            </ActionbarProvider>
        </>
    );
}