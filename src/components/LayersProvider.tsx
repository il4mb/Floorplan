// src/components/Layers.tsx
import { Layer } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStateData } from './FloorplanProvider';

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
}

export default function LayersProvider({ children }: LayersProps) {

    const data = useStateData();
    const [selected, setSelected] = useState<string[]>([]);
    const [layers, setLayers] = useState<Layer[]>(() => {
        return [{
            id: '1',
            name: "Layer 1",
            order: 0,
            visible: true,
            locked: false
        }] as Layer[];
    });

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
        setLayers(prev => {
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
        setLayers(prev =>
            prev.map(layer =>
                layer.id === id ? { ...layer, ...updates } : layer
            )
        );
    };

    const removeLayer = (id: string) => {
        setLayers(prev => {
            const filtered = prev.filter(layer => layer.id !== id);
            // Reorder remaining layers
            return filtered.map((layer, index) => ({
                ...layer,
                order: index + 1
            }));
        });
    };

    const moveLayer = (id: string, newOrder: number) => {
        setLayers(prev => {
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
        setLayers(prev =>
            prev.map(layer =>
                layer.id === id ? { ...layer, visible: !layer.visible } : layer
            )
        );
    };

    const toggleLayerLock = (id: string) => {
        setLayers(prev =>
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
        setLayers(prev => prev.map(layer => ({ ...layer, visible: true })));
    };

    const hideAllLayers = () => {
        setLayers(prev => prev.map(layer => ({ ...layer, visible: false })));
    };

    const unlockAllLayers = () => {
        setLayers(prev => prev.map(layer => ({ ...layer, locked: false })));
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
        const nodesLayerIds = data.nodes
            .map(n => n.layerId)
            .filter(Boolean) as string[];

        if (nodesLayerIds.length === 0) return;

        const uniqueIds = [...new Set(nodesLayerIds)];

        setLayers(prev => {
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
    }, [data.nodes]);

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