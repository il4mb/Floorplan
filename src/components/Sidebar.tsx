import { useEngine } from '@/hooks/useEngine';
import { Eraser, HandGrab, Slice, SplinePointer } from "lucide-react";
import ActionButton from './ActionButton';
import ObjectGallery from './objects/ObjectGallery';
import RoomList from './rooms/RoomList';

export default function Sidebar() {
    const { mode, setMode } = useEngine();
    return (
        <div className='floorplan-sidebar'>
            <div className='fp-panel' style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <ActionButton active={mode == "wall"} onClick={() => setMode("wall")}>
                    <SplinePointer size={16} />
                </ActionButton>
                <ActionButton active={mode == "pan"} onClick={() => setMode("pan")}>
                    <HandGrab size={16} />
                </ActionButton>
                <ActionButton active={mode == "slice-wall"} onClick={() => setMode("slice-wall")}>
                    <Slice size={16} />
                </ActionButton>
                <ActionButton active={mode == "eraser"} onClick={() => setMode("eraser")}>
                    <Eraser size={16} />
                </ActionButton>
            </div>

            <ObjectGallery />

            <RoomList />
        </div>
    );
}