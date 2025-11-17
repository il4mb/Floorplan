// examples/BasicEditor.tsx
import React from 'react';
import { FloorplanProvider, useFloorplanContext } from '../src/hooks/useFloorplan';
import FloorplanCanvas from '../src/components/FloorplanCanvas';
import Toolbox from '../src/components/Toolbox';
import ToolbarShortcuts from '../src/components/ToolbarShortcuts';
import Inspector from '../src/components/inspector/Inspector';
import { FloorplanData } from '../src/types';

const samplePlan: FloorplanData = {
    meta: {
        version: '1.0',
        createdAt: '2025-11-16T00:00:00Z',
        updatedAt: '2025-11-16T00:00:00Z'
    },
    units: 'meters',
    gridSize: 0.1,
    walls: [
        { id: 'w1', from: { x: 0, y: 0 }, to: { x: 4, y: 0 }, thickness: 0.15 },
        { id: 'w2', from: { x: 4, y: 0 }, to: { x: 4, y: 3 }, thickness: 0.15 },
        { id: 'w3', from: { x: 4, y: 3 }, to: { x: 0, y: 3 }, thickness: 0.15 },
        { id: 'w4', from: { x: 0, y: 3 }, to: { x: 0, y: 0 }, thickness: 0.15 }
    ],
    nodes: []
};

const EditorContent: React.FC = () => {
    const { actions } = useFloorplanContext();

    return (
        <div className="flex flex-col h-screen">
            <header className="bg-white border-b border-gray-200 p-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold">Floorplan Editor</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => console.log(actions.exportJSON())}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                            Export JSON
                        </button>
                        <button
                            onClick={actions.undo}
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                            Undo
                        </button>
                        <button
                            onClick={actions.redo}
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                            Redo
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 bg-white border-r border-gray-200">
                    <Toolbox />
                </aside>

                <main className="flex-1">
                    <FloorplanCanvas
                        width={1200}
                        height={800}
                        gridSize={0.1}
                        snap
                    />
                </main>

                <aside className="w-80 bg-white border-l border-gray-200">
                    <Inspector />
                </aside>
            </div>

            <ToolbarShortcuts />
        </div>
    );
};

const BasicEditor: React.FC = () => {
    return (
        <FloorplanProvider initialData={samplePlan}>
            <EditorContent />
        </FloorplanProvider>
    );
};

export default BasicEditor;