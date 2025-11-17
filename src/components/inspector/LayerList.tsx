// src/components/LayerListDnd.tsx
import { Layer } from '@/types';
import { useLayers } from '../LayersProvider';
import {
    Eye,
    EyeOff,
    Lock,
    Unlock,
    GripVertical,
    Trash2,
    Plus
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { motion, Reorder } from 'framer-motion';

// Sortable Layer Item Component
function SortableLayerItem({
    layer,
    onSelect,
    selected,
    onUpdate,
    onRemove,
    onToggleVisibility,
    onToggleLock
}: {
    layer: Layer;
    onSelect?: (id: string) => void;
    selected: boolean;
    onUpdate: (id: string, updates: Partial<Layer>) => void;
    onRemove: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
}) {
    return (
        <Reorder.Item
            value={layer}
            whileDrag={{
                scale: 1.02,
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                zIndex: 50
            }}
        >
            <motion.div
                layout
                className={`
                    flex items-center gap-2 p-2 rounded-md border transition-all
                    ${selected ? 'bg-blue-50 border-blue-200' : 'border-transparent'}
                    hover:bg-gray-50 cursor-pointer group
                `}
                onClick={() => onSelect?.(layer.id)}
            >
                {/* Drag Handle */}
                <motion.div
                    className="drag-handle text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <GripVertical size={16} />
                </motion.div>

                {/* Visibility Toggle */}
                <motion.button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(layer.id);
                    }}
                    className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </motion.button>

                {/* Lock Toggle */}
                <motion.button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(layer.id);
                    }}
                    className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    {layer.locked ? <Lock size={16} /> : <Unlock size={16} />}
                </motion.button>

                {/* Layer Name Input */}
                <motion.input
                    type="text"
                    value={layer.name}
                    onChange={(e) => onUpdate(layer.id, { name: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className={`
                        flex-1 bg-transparent border-none outline-none text-sm
                        ${!layer.visible ? 'text-gray-400' : 'text-gray-900'}
                        ${layer.locked ? 'cursor-not-allowed' : ''}
                    `}
                    disabled={layer.locked}
                    title={layer.locked ? 'Layer is locked' : 'Rename layer'}
                    whileFocus={{ scale: 1.02 }}
                />

                {/* Layer Order Badge */}
                <motion.div
                    className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded min-w-8 text-center"
                    layout
                >
                    {layer.order}
                </motion.div>

                {/* Delete Button */}
                <motion.button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(layer.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Layer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Trash2 size={14} />
                </motion.button>
            </motion.div>
        </Reorder.Item>
    );
}

// Main Component with Framer Motion Reorder
export default function LayerList() {
    const {
        layers,
        selected,
        createLayer,
        updateLayer,
        removeLayer,
        moveLayer,
        selectLayers,
        toggleLayerVisibility,
        toggleLayerLock,
        showAllLayers,
        hideAllLayers
    } = useLayers();

    const isAllVisible = useMemo(() => layers.every(e => e.visible), [layers]);
    const [reorderItems, setReorderItems] = useState(layers);

    const handleToggleVisibility = useCallback(() => {
        (isAllVisible ? hideAllLayers: showAllLayers)();
    }, [isAllVisible]);

    const handleReorder = (newOrder: Layer[]) => {
        setReorderItems(newOrder);
        newOrder.forEach((layer, index) => {
            const newPosition = newOrder.length - index;
            if (layer.order !== newPosition) {
                moveLayer(layer.id, newPosition);
            }
        });
    };

    const handleSelect = (id: string) => {
        selectLayers([id]);
    }

    const handleAddLayer = () => {
        createLayer({
            name: `Layer ${layers.length + 1}`,
            visible: true,
            locked: false
        });
    };

    const sortedLayers = [...layers].sort((a, b) => b.order - a.order);

    return (
        <div className={`bg-white border-gray-200 flex-1 flex flex-col`}>
            <motion.div
                className="p-4 border-gray-200"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Layers</h3>
                    <div className="flex gap-2">
                        <motion.button
                            onClick={handleToggleVisibility}
                            className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                            title={isAllVisible ? "Hide All Layers" : "Show All Layers"}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}>
                            {isAllVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </motion.button>
                        <motion.button
                            onClick={handleAddLayer}
                            className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                            title="Add New Layer"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}>
                            <Plus size={16} />
                        </motion.button>
                    </div>
                </div>
            </motion.div>
            <div className='flex-1 flex flex-col'>
                <div className="p-2 overflow-y-auto flex-1">
                    {sortedLayers.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8 text-gray-500">
                            No layers yet. Click + to add one.
                        </motion.div>
                    ) : (
                        <Reorder.Group
                            axis="y"
                            values={sortedLayers}
                            onReorder={handleReorder}
                            className="space-y-1">
                            {sortedLayers.map((layer) => (
                                <SortableLayerItem
                                    key={layer.id}
                                    layer={layer}
                                    selected={selected.includes(layer.id)}
                                    onSelect={handleSelect}
                                    onUpdate={updateLayer}
                                    onRemove={removeLayer}
                                    onToggleVisibility={toggleLayerVisibility}
                                    onToggleLock={toggleLayerLock}
                                />
                            ))}
                        </Reorder.Group>
                    )}
                </div>
            </div>

            {/* Footer Stats */}
            <motion.div
                className="p-3 border-t border-gray-200 bg-gray-50 basis-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}>
                <div className="text-xs text-gray-600">
                    {layers.filter(l => l.visible).length} of {layers.length} layers visible
                </div>
            </motion.div>
        </div>
    );
}