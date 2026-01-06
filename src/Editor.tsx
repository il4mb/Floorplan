import { ReactNode, useState, useEffect } from 'react';
import { EditorContext } from './hooks/useEditor';
import Canvas from './components/Canvas';
import EngineProvider from './components/EngineProvider';
import "@/styles.css";
import Sidebar from './components/Sidebar';
import { PlanData } from './types';

export interface EditorProps {
    children?: ReactNode;
}

const STORAGE_KEY = "floorplan:data";

export default function Editor({ children }: EditorProps) {
    const [data, setData] = useState<PlanData>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return { walls: [], node: [] };
            const parsed = JSON.parse(saved);
            // tolerate older shapes (e.g. `nodes` instead of `node`)
            const node = Array.isArray(parsed?.node)
                ? parsed.node
                : (Array.isArray(parsed?.nodes) ? parsed.nodes : []);
            const walls = Array.isArray(parsed?.walls) ? parsed.walls : [];
            const roomsMeta = Array.isArray(parsed?.roomsMeta) ? parsed.roomsMeta : undefined;
            return { walls, node, roomsMeta };
        } catch {
            return { walls: [], node: [] };
        }
    });





    // sync to localStorage when data changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch { }
    }, [data]);

    return (
        <EditorContext.Provider value={{ data, setData }}>
            <EngineProvider>
                <div className='floorplan-editor'>
                    <Sidebar />
                    <Canvas />
                    {children}
                </div>
            </EngineProvider>
        </EditorContext.Provider>
    );
}
