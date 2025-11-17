import { useModel } from '@/hooks/useModels';
import { Node } from '@/types';
import { Dispatch, SetStateAction, useState } from 'react';
import { ToolButton } from '../ui/ToolButton';
import { Actionbar } from '@/utils/model';
import { Event } from '@/hooks/useActionbars';

export interface ModelToolbarProps {
    node: Node;
    onEvent?: (evt: Event) => void;
    activeToggles: Record<string, string>;
    setActiveToggles: Dispatch<SetStateAction<Record<string, string>>>;
}

export default function ModelActionbar({ node, onEvent, activeToggles, setActiveToggles }: ModelToolbarProps) {

    const model = useModel(node.type);
    if (!model || !model.actionbars) return null;

    // Group toolbars by context
    const groupedToolbars = model.actionbars.reduce((acc, item) => {
        const context = item.context || 'default';
        if (!acc[context]) {
            acc[context] = [];
        }
        acc[context]!.push(item);
        return acc;
    }, {} as Record<string, typeof model.actionbars>);

    const handleToggle = (context: string, itemId: string) => {
        setActiveToggles(prev => {
            const previousActiveId = prev[context];
            const isCurrentlyActive = previousActiveId === itemId;

            // If clicking the same item that's already active, untoggle it
            if (isCurrentlyActive) {
                const newState = { ...prev };
                delete newState[context];
                return newState;
            }
            // If clicking a different item in the same context
            else {
                return {
                    ...prev,
                    [context]: itemId
                };
            }
        });

        // Emit events outside of setState to avoid double invocation
        const previousActiveId = activeToggles[context];
        const isCurrentlyActive = previousActiveId === itemId;

        if (isCurrentlyActive) {
            // Untoggle current item
            if (onEvent && previousActiveId) {
                const toolbar = model.actionbars!.find(t => t.id === previousActiveId);
                if (toolbar) {
                    onEvent({
                        type: "untoggled",
                        toolbar,
                        context
                    });
                }
            }
        } else {
            // First untoggle previous item if it exists
            if (onEvent && previousActiveId) {
                const previousToolbar = model.actionbars!.find(t => t.id === previousActiveId);
                if (previousToolbar) {
                    onEvent({
                        type: "untoggled",
                        toolbar: previousToolbar,
                        context
                    });
                }
            }

            // Then toggle new item
            if (onEvent) {
                const newToolbar = model.actionbars!.find(t => t.id === itemId);
                if (newToolbar) {
                    onEvent({
                        type: "toggled",
                        toolbar: newToolbar,
                        context
                    });
                }
            }
        }
    };

    const handleClick = (item: Actionbar) => () => {
        const context = item.context || 'default';

        if (item.toggle) {
            handleToggle(context, item.id);
        } else {
            if (onEvent) {
                onEvent({
                    type: "click",
                    toolbar: item,
                    context
                });
            }
        }
    };

    return (
        <div className={`toolbox absolute z-100 top-0 right-0 p-5`}>
            <div className={`flex flex-row gap-2`}>
                {Object.entries(groupedToolbars).map(([context, items]) => (
                    <div key={context} className="flex flex-row gap-2">
                        {items.map((item) => (
                            <ToolButton
                                key={item.id}
                                title={item.title!}
                                active={activeToggles[context] === item.id}
                                onClick={handleClick(item)}>
                                {item.icon}
                            </ToolButton>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}