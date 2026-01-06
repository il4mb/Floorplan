import { useEngine } from '@/hooks/useEngine';
import { useGrid } from '@/hooks/useGrid';
import { Eraser, HandGrab, Slice, SplinePointer } from "lucide-react";
import ActionButton from './ActionButton';
import ObjectGallery from './objects/ObjectGallery';
import RoomList from './rooms/RoomList';

export default function Sidebar() {
    const { mode, setMode, unit, setUnit } = useEngine();
    const { disabled, setDisabled } = useGrid();
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

            <div className="fp-panel fp-stack">
                <div className="fp-title">Editor</div>

                <div className="fp-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="fp-muted" style={{ fontSize: 12 }}>Unit</label>
                    <select
                        className="fp-input"
                        style={{ width: 140 }}
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as any)}
                        aria-label="Unit"
                    >
                        <option value="meters">meters</option>
                        <option value="feet">feet</option>
                        <option value="pixels">pixels</option>
                    </select>
                </div>

                <label className="fp-row" style={{ alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={!disabled}
                        onChange={(e) => setDisabled(!e.target.checked)}
                        aria-label="Enable snap"
                    />
                    <span style={{ fontSize: 12 }}>Snap enabled</span>
                </label>
            </div>

            <ObjectGallery />

            <RoomList />
        </div>
    );
}