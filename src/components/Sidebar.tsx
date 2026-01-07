import { useEngine } from '@/hooks/useEngine';
import { useGrid } from '@/hooks/useGrid';
import { Eraser, HandGrab, MousePointer2, Slice, SplinePointer, Trash2, Move, Package } from "lucide-react";
import { useEditor } from '@/hooks/useEditor';
import ActionButton from './ActionButton';
import ObjectGallery from './objects/ObjectGallery';
import RoomList from './rooms/RoomList';
import { useMemo } from 'react';

export default function Sidebar() {
    const { mode, setMode, unit, setUnit, selectedWallId, guidelinesEnabled, setGuidelinesEnabled, wallRuleMode, setWallRuleMode } = useEngine();
    const { disabled, setDisabled } = useGrid();
    const { data, updateWalls } = useEditor();

    const selectedWall = useMemo(() => {
        if (!selectedWallId) return undefined;
        return data.walls.find(w => w.id === selectedWallId);
    }, [data.walls, selectedWallId]);

    return (
        <div className='floorplan-sidebar'>
            <div className='fp-panel' style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <ActionButton active={mode == "wall"} onClick={() => setMode("wall")}>
                    <SplinePointer size={16} />
                </ActionButton>
                <ActionButton active={mode == "wall-edit"} onClick={() => setMode("wall-edit")}>
                    <MousePointer2 size={16} />
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
                <ActionButton active={mode == "delete"} onClick={() => setMode("delete")}>
                    <Trash2 size={16} />
                </ActionButton>
                <ActionButton active={mode == "resize"} onClick={() => setMode("resize")}>
                    <Move size={16} />
                </ActionButton>
                <ActionButton active={mode == "object"} onClick={() => setMode("object")}>
                    <Package size={16} />
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

                <label className="fp-row" style={{ alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={guidelinesEnabled}
                        onChange={(e) => setGuidelinesEnabled(e.target.checked)}
                        aria-label="Enable guidelines"
                    />
                    <span style={{ fontSize: 12 }}>Guidelines</span>
                </label>

                <div className="fp-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="fp-muted" style={{ fontSize: 12 }}>Wall ruler</label>
                    <select
                        className="fp-input"
                        style={{ width: 140 }}
                        value={wallRuleMode}
                        onChange={(e) => setWallRuleMode(e.target.value as 'inside' | 'outside' | 'both')}
                        aria-label="Wall ruler mode"
                    >
                        <option value="outside">Outside</option>
                        <option value="inside">Inside</option>
                        <option value="both">Both</option>
                    </select>
                </div>

                <div className="fp-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="fp-muted" style={{ fontSize: 12 }}>Wall width (mm)</label>
                    <input
                        className="fp-input"
                        style={{ width: 140 }}
                        type="number"
                        min={1}
                        step={10}
                        value={selectedWall ? selectedWall.thickness : ''}
                        placeholder={selectedWallId ? '—' : 'Select wall'}
                        disabled={!selectedWall}
                        onChange={(e) => {
                            if (!selectedWall) return;
                            const next = Number(e.target.value);
                            if (!Number.isFinite(next)) return;
                            updateWalls([selectedWall.id], [{ thickness: Math.max(1, next) }]);
                        }}
                        aria-label="Wall width in millimeters"
                    />
                </div>
            </div>

            <ObjectGallery />

            <RoomList />
        </div>
    );
}