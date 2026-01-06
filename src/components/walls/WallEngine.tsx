import { useEditor } from '@/hooks/useEditor';
import { useEffect, useMemo, useState } from 'react';
import { useEngine } from '@/hooks/useEngine';
import WallDrawer from './WallDrawer';
import { useWallGeometry, WallEngineContext, WallEngineState } from '@/hooks/useWallEngine';
import WallVerticlesManager from './WallVerticlesManager';
import Poly2 from '@/utils/polygon2d';
import WallLinesManager from './WallLinesManager';
import WallSlicer from './WallSlicer';
import WallEraser from './WallEraser';


export default function WallEngine() {

    const { mode } = useEngine();
    const { data } = useEditor();
    const walls = useMemo(() => data.walls, [data.walls]);
    const { wallsPolygon } = useWallGeometry(walls);
    const [wMode, setWMode] = useState<WallEngineState['mode']>(undefined);

    const value = useMemo<WallEngineState>(() => ({
        wallsPolygon,
        mode: wMode,
        setMode(newMode) {
            setWMode(newMode);
        }
    }), [wallsPolygon, wMode]);

    return (
        <WallEngineContext.Provider value={value}>

            <g id='walls'>
                {walls.map((wall, i) => (
                    <path
                        key={i}
                        d={Poly2.toPath(wallsPolygon.get(wall.id) || [])}
                        fill='#666'
                        stroke='#999'
                        strokeWidth="0"
                        strokeLinecap="butt"
                        strokeLinejoin="miter"
                        strokeMiterlimit="4"
                        fillRule="nonzero" />
                ))}
            </g>

            <WallLinesManager walls={walls} />
            {mode == "slice-wall" && (
                <WallSlicer walls={walls} />
            )}
            {mode == "eraser" && (
                <WallEraser walls={walls} />
            )}

            <WallVerticlesManager walls={walls} />
            {mode == "wall" && (
                <>
                    <WallDrawer />
                </>
            )}
        </WallEngineContext.Provider>
    );
}