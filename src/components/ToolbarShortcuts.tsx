// src/components/ToolbarShortcuts.tsx
import React, { useEffect } from 'react';
import { useFloorplanContext } from './FloorplanProvider';

const ToolbarShortcuts: React.FC = () => {
    const { state, actions } = useFloorplanContext();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const { key, ctrlKey, metaKey, shiftKey } = event;
            const isModifier = ctrlKey || metaKey;

            // Prevent default for all handled shortcuts
            if (isModifier || ['Delete', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
                event.preventDefault();
            }

            // Undo/Redo
            if (isModifier && key === 'z' && !shiftKey) {
                actions.undo();
                return;
            }

            if ((isModifier && key === 'y') || (isModifier && shiftKey && key === 'Z')) {
                actions.redo();
                return;
            }

            // Delete selected items
            if (key === 'Delete' && state.selection.length > 0) {
                actions.removeItems(state.selection);
                return;
            }

            // Escape clears selection
            if (key === 'Escape') {
                actions.select([]);
                return;
            }

            // Nudge selected items with arrow keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
                const nudgeStep = shiftKey ? 1 : 0.1; // Larger step with shift

                state.selection.forEach(id => {
                    // const wall = state.data.walls.find(w => w.id === id);
                    const node = state.data.nodes.find(n => n.id === id);

                    // if (wall) {
                    //     let deltaX = 0;
                    //     let deltaY = 0;

                    //     switch (key) {
                    //         case 'ArrowUp': deltaY = -nudgeStep; break;
                    //         case 'ArrowDown': deltaY = nudgeStep; break;
                    //         case 'ArrowLeft': deltaX = -nudgeStep; break;
                    //         case 'ArrowRight': deltaX = nudgeStep; break;
                    //     }

                    //     // actions.updateWall(wall.id, {
                    //     //     from: { x: wall.from.x + deltaX, y: wall.from.y + deltaY },
                    //     //     to: { x: wall.to.x + deltaX, y: wall.to.y + deltaY }
                    //     // });
                    // }

                    if (node) {
                        let deltaX = 0;
                        let deltaY = 0;

                        switch (key) {
                            case 'ArrowUp': deltaY = -nudgeStep; break;
                            case 'ArrowDown': deltaY = nudgeStep; break;
                            case 'ArrowLeft': deltaX = -nudgeStep; break;
                            case 'ArrowRight': deltaX = nudgeStep; break;
                        }

                        actions.updateNode(node.id, {
                            x: node.x + deltaX,
                            y: node.y + deltaY
                        });
                    }
                });
            }

            // Tool shortcuts (number keys)
            if (key >= '1' && key <= '8') {
                const tools = ['select', 'pan', 'wall', 'door', 'window', 'furniture', 'measure', 'erase'];
                const toolIndex = parseInt(key) - 1;
                if (toolIndex < tools.length) {
                    actions.setTool(tools[toolIndex] as any);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [state.selection, state.data, actions]);

    // This component doesn't render anything
    return null;
};

export default ToolbarShortcuts;