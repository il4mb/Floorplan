// src/components/Layers.tsx
import { Layer } from '@/types';
import { Dispatch, ReactNode, SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStateData } from './FloorplanProvider';
import { debounce } from 'lodash';

export interface LayerContextType {
    // Layer management
    layers: Layer[];
    selected: string[];
    createLayer: (partial: Partial<Omit<Layer, 'id'>>) => string;
    updateLayer: (id: string, updates: Partial<Layer>) => void;
    removeLayer: (id: string) => void;
    moveLayer: (id: string, newOrder: number) => void;
    selectLayers: (ids: string[]) => void;

    // Layer visibility and locking
    toggleLayerVisibility: (id: string) => void;
    toggleLayerLock: (id: string) => void;

    // Bulk operations
    showAllLayers: () => void;
    hideAllLayers: () => void;
    unlockAllLayers: () => void;
}

const LayerContext = createContext<LayerContextType | null>(null);

export interface LayersProps {
    children?: ReactNode;
    layers: Layer[];
    onChange: Dispatch<SetStateAction<Layer[]>>
}

export default function LayersProvider({ children, layers, onChange }: LayersProps) {

    const [mounted, setMounted] = useState(false);
    const data = useStateData();
    const [selected, setSelected] = useState<string[]>([]);

    const nextId = useMemo(() => {
        let max = -Infinity;
        for (const layer of layers) {
            const digits = layer.id.match(/\d+/g);
            if (!digits) continue;
            for (const d of digits) {
                const num = Number(d);
                if (num > max) max = num;
            }
        }

        return max === -Infinity ? null : max;
    }, [layers]);

    const createLayer = useCallback((partial: Partial<Omit<Layer, 'id'>>): string => {
        const id = String((nextId || layers.length) + 1);
        onChange(prev => {
            const newLayer: Layer = {
                id,
                name: `Layer ${prev.length + 1}`,
                order: prev.length + 1,
                visible: true,
                locked: false,
                ...partial
            };
            return [...prev, newLayer];
        });
        return id;
    }, [layers])

    const updateLayer = (id: string, updates: Partial<Layer>) => {
        onChange(prev =>
            prev.map(layer =>
                layer.id === id ? { ...layer, ...updates } : layer
            )
        );
    };

    const removeLayer = (id: string) => {
        onChange(prev => {
            const filtered = prev.filter(layer => layer.id !== id);
            // Reorder remaining layers
            return filtered.map((layer, index) => ({
                ...layer,
                order: index + 1
            }));
        });
    };

    const moveLayer = (id: string, newOrder: number) => {
        onChange(prev => {
            const sorted = [...prev].sort((a, b) => a.order - b.order);
            const currentIndex = sorted.findIndex(layer => layer.id === id);

            if (currentIndex === -1 || newOrder < 1 || newOrder > sorted.length) {
                return prev;
            }

            const [movedLayer] = sorted.splice(currentIndex, 1);
            sorted.splice(newOrder - 1, 0, movedLayer!);

            // Reassign orders based on new positions
            return sorted.map((layer, index) => ({
                ...layer,
                order: index + 1
            }));
        });
    };

    const toggleLayerVisibility = (id: string) => {
        onChange(prev =>
            prev.map(layer =>
                layer.id === id ? { ...layer, visible: !layer.visible } : layer
            )
        );
    };

    const toggleLayerLock = (id: string) => {
        onChange(prev =>
            prev.map(layer =>
                layer.id === id ? { ...layer, locked: !layer.locked } : layer
            )
        );
    };

    const getLayerOrder = (id: string) => {
        const layer = layers.find(layer => layer.id === id);
        return layer?.order;
    };

    const showAllLayers = () => {
        onChange(prev => prev.map(layer => ({ ...layer, visible: true })));
    };

    const hideAllLayers = () => {
        onChange(prev => prev.map(layer => ({ ...layer, visible: false })));
    };

    const unlockAllLayers = () => {
        onChange(prev => prev.map(layer => ({ ...layer, locked: false })));
    };

    const selectLayers = (ids: string[]) => {
        setSelected(ids);
    }

    useEffect(() => {
        if (selected.length <= 0 && layers.length > 0) {
            setSelected([layers[0]!.id]);
        }
    }, [layers, selected]);

    useEffect(() => {

        if (!mounted) return;
        const nodesLayerIds = data.nodes
            .map(n => n.layerId)
            .filter(Boolean) as string[];

        if (nodesLayerIds.length === 0) return;

        const uniqueIds = [...new Set(nodesLayerIds)];

        onChange(prev => {
            const missing = uniqueIds.filter(
                layerId => !prev.some(layer => layer.id === layerId)
            );
            if (missing.length === 0) return prev;

            const newLayers = missing.map((layerId, index) => ({
                id: layerId,
                name: "Layer " + layerId.slice(0, 8),
                order: prev.length + index,
                visible: true,
                locked: false,
            }));

            return [...prev, ...newLayers];
        });
    }, [data.nodes, mounted]);

    const handleMounted = debounce(() => {
        setMounted(true);
    }, 200);

    useEffect(() => {
        if (mounted) return;

        handleMounted();

        return () => {
            handleMounted.cancel();
        }
    }, [layers, mounted]);

    const contextValue: LayerContextType = useMemo(() => ({
        layers: layers.sort((a, b) => a.order - b.order),
        selected,
        createLayer,
        updateLayer,
        removeLayer,
        selectLayers,
        moveLayer,
        toggleLayerVisibility,
        toggleLayerLock,
        getLayerOrder,
        showAllLayers,
        hideAllLayers,
        unlockAllLayers
    }), [layers, selected]);

    return (
        <LayerContext.Provider value={contextValue}>
            {children}
        </LayerContext.Provider>
    );
}

// Hook to use layer context
export const useLayers = () => {
    const context = useContext(LayerContext);
    if (!context) {
        throw new Error('useLayers must be used within a LayersProvider');
    }
    return context;
};


export const useSelectedLayerId = () => {
    const { selected, layers } = useLayers();
    return useMemo(() =>
        selected?.[0] ||
        layers.sort((a, b) => b.order - a.order)[0]?.id,
        [layers, selected]);
}