import { useSelectedNode } from '@/hooks/useFloorplan';
import { Rect } from '@/types';
import { ReactNode, useEffect, useState, useCallback } from 'react';
import ModelActionbar from './models/ModelActionbar';
import { Actionbar } from '@/utils/model';
import ActionbarProvider from './models/ActionbarProvider';

export interface Props {
    children?: ReactNode;
    rect: Rect;
}

export default function SpotsProvider({ children }: Props) {

    const selected = useSelectedNode();
    const [activeToggles, setActiveToggles] = useState<Record<string, string>>({});
    const [listeners, setListeners] = useState<Map<string, (event: any) => void>>(new Map());
    const [toggled, setToggled] = useState<Actionbar | null>(null);

    const handleEvent = useCallback((event: any) => {
        // console.log(event);

        // Update toggled state based on events
        if (event.type === "toggled") {
            setToggled(event.toolbar);
        } else if (event.type === "untoggled") {
            setToggled(null);
        }

        // Notify only relevant listeners based on event type
        listeners.forEach((listener, id) => {
            try {
                if (id.startsWith(`${event.type}-`)) {
                    listener(event);
                }
            } catch (error) {
                console.error(`Error in listener ${id}:`, error);
            }
        });
    }, [listeners]);

    useEffect(() => {
        return () => {
            setActiveToggles({});
            setListeners(new Map());
            setToggled(null);
        };
    }, [selected]);

    return (
        <>
            <ActionbarProvider
                activeToggles={activeToggles}
                setActiveToggles={setActiveToggles}
                setListeners={setListeners}
                toggled={toggled}
                onEvent={handleEvent}>

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