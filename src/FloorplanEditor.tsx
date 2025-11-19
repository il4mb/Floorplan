import { useEffect, useState } from 'react';
import ToolbarShortcuts from './components/ToolbarShortcuts';
import FloorplanCanvas from './components/FloorplanCanvas';
import { FloorplanProvider } from './components/FloorplanProvider';
import Toolbox from './components/Toolbox';
// @ts-ignore
import "./styles.css";
import { FloorplanData } from './types';
import LayersProvider from './components/LayersProvider';
import LayerList from './components/inspector/LayerList';
import Inspector from './components/inspector/Inspector';
import ModelGallery from './components/models/ModelGallery';


const samplePlan: FloorplanData = {
    meta: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    units: 'meters' as const,
    gridSize: 10,
    nodes: [
        {
            type: "polygon",
            label: {
                text: "Aula Kampus",
                x: 0,
                y: 0
            },
            points: [
                { x: -100, y: -100 },
                { x: 100, y: -100 },
                { x: 100, y: 100 },
                { x: -100, y: 100 },
            ],
            id: 'node1',
            layerId: '1',
            x: 0,
            y: 100,
            rotation: 180,
            thickness: 10
        }
    ],
};

const STORAGE_KEY = 'floorplan-editor-data';

export default function FloorplanEditor() {

    const [floorplanData, setFloorplanData] = useState<FloorplanData>(samplePlan);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Load on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setFloorplanData(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
        }
        setHasLoaded(true);
    }, []);

    // Auto-save on changes
    useEffect(() => {
        if (hasLoaded) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(floorplanData));
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
            }
        }
    }, [floorplanData, hasLoaded]);

    return (
        <FloorplanProvider
            value={floorplanData}
            onChange={setFloorplanData}>
            <LayersProvider>
                <div className="flex flex-col h-screen bg-neutral-600 text-white text-[0.8rem]">
                    {/* Simple status indicator */}
                    <div className="p-1 bg-neutral-700 text-xs text-center">
                        {hasLoaded ? 'Auto-save enabled' : 'Loading...'}
                    </div>

                    {/* Rest of your JSX remains the same */}
                    <div className="flex flex-row flex-1 overflow-hidden">
                        <div className='basis-[140px] flex flex-col items-start justify-start'>
                            <ModelGallery />
                        </div>
                        <main className="flex-1 relative">
                            <FloorplanCanvas
                                gridSize={0.1}
                                className="absolute inset-0"
                                background='transparent'
                            />
                            <Toolbox />
                            {/* <NodeToolbox /> */}
                        </main>
                        <aside className='basis-[250px] flex flex-col'>
                            <div className='basis-100'>
                                <Inspector />
                            </div>
                            <LayerList />
                        </aside>
                    </div>
                    <ToolbarShortcuts />
                </div>
            </LayersProvider>
        </FloorplanProvider>
    );
}