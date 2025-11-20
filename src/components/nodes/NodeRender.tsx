import { useCallback, useMemo } from 'react';
import { useFloorplanContext } from '../FloorplanProvider';
import { useLayers } from '../LayersProvider';
import NodeLabel from './NodeLabel';
import ModelRender from '../models/ModelRender';
import { NodeContext } from '@/hooks/useNode';

export default function NodeRender() {

    const { state, actions } = useFloorplanContext();
    const { layers } = useLayers();
    type NodeType = typeof state.data.nodes[number];

    const nodesByLayer = useMemo(() => {
        return state.data.nodes.reduce((acc, node) => {
            (acc[node.layerId] ??= []).push(node);
            return acc;
        }, {} as Record<string, NodeType[]>);
    }, [state.data.nodes]);

    const orderedLayers = useMemo(() => {
        return layers
            .filter(l => l.visible)
            .sort((a, b) => a.order - b.order);
    }, [layers]);


    const handleSetData = useCallback((nodeId: string) => (keyOrData: string | Record<string, any>, value?: any) => {
        if (typeof keyOrData === "object") {
            // bulk update
            actions.updateNode(nodeId, keyOrData);
        } else {
            // single field update
            actions.updateNode(nodeId, { [keyOrData]: value });
        }
    }, [actions]);

    return (
        <>
            {orderedLayers.map(layer => {
                const locked = layer.locked;
                const nodes = nodesByLayer[layer.id];
                if (!nodes) return null;

                // ⬇️ sort di dalam setiap layer
                const sortedNodes = nodes.slice().sort((a, b) => {
                    const aSel = state.selection.includes(a.id);
                    const bSel = state.selection.includes(b.id);
                    return Number(aSel) - Number(bSel);
                });

                return (
                    <g
                        key={`layer-${layer.id}-${layer.order}`}
                        id={`layer-${layer.id}`}
                        style={{ opacity: locked ? 0.5 : 1 }}>

                        {sortedNodes.map(node => {
                            const isSelected = state.selection.includes(node.id);

                            return (
                                <NodeContext.Provider key={node.id} value={{ node, setData: handleSetData(node.id) }}>
                                    <g>
                                        <ModelRender
                                            node={node}
                                            selected={isSelected}
                                            updateNode={handleSetData(node.id)}
                                        />
                                        {node.label && (
                                            <NodeLabel label={node.label} anchor={{ x: node.x, y: node.y }} />
                                        )}
                                    </g>
                                </NodeContext.Provider>
                            );
                        })}

                    </g>
                );
            })}

        </>
    );
}
