import React, { ChangeEvent } from 'react';
import { useFloorplanContext } from '../FloorplanProvider';

const Inspector: React.FC = () => {

    const { state, actions } = useFloorplanContext();
    const selectedItems = state.selection;
    const selectedId = selectedItems[0];
    const selectedNode = state.data.nodes.find(node => node.id === selectedId);

    const changeHandler = (key: string) => {
        return (e: ChangeEvent<HTMLInputElement>) => {
            if (!selectedNode) return;
            const value = e.target.value;
            if (!Number.isNaN(parseInt(value))) {
                actions.updateNode(selectedNode.id, { [key]: parseInt(value) });
            }
        }
    }


    return (
        <div className="inspector p-4 border-l border-gray-200 h-full overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Inspector</h3>

            <div className="mb-4">
                <p className="text-sm">
                    Selected: {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
                </p>
                {selectedItems.length > 1 && (
                    <p className="text-xs text-gray-500 mt-1">
                        Multi-selection editing coming soon
                    </p>
                )}
            </div>

            {selectedNode && (
                <div className="space-y-3">
                    <h4 className="font-medium capitalize">{
                        // @ts-ignore
                        selectedNode.type} Properties</h4>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm">X Position</label>
                            <input
                                type="number"
                                value={selectedNode.x}
                                onChange={changeHandler("x")}
                                className="w-full p-1 border rounded text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm">Y Position</label>
                            <input
                                type="number"
                                value={selectedNode.y}
                                onChange={changeHandler("y")}
                                className="w-full p-1 border rounded text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm">Rotation</label>
                        <input
                            type="number"
                            step="1"
                            value={selectedNode.rotation}
                            onChange={changeHandler("rotation")}
                            className="w-full p-1 border rounded text-sm"
                        />
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <button
                            onClick={() => actions.removeItems(selectedItems)}
                            className="w-full p-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}


        </div>
    );
};

export default Inspector;