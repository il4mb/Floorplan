import { useMemo } from 'react';
import { useFloorplanContext } from '../FloorplanProvider';
import { useLayers } from '../LayersProvider';
import NodeLabel from './NodeLabel';
import ModelRender from '../models/ModelRender';

export default function NodeRender() {

    const { state } = useFloorplanContext();
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

    return (
        <>
            {orderedLayers.map(layer => {
                const locked = layer.locked;
                const nodes = nodesByLayer[layer.id];
                if (!nodes) return null;

                return (
                    <g
                        key={`layer-${layer.id}-${layer.order}`}
                        id={`layer-${layer.id}`}
                        style={{ opacity: locked ? 0.5 : 1 }}>
                        {nodes.map(node => {
                            
                            const isSelected = state.selection.includes(node.id);
                            const zoom = state.view.zoom;
                            const outlineWidth = Math.max(0.1, Math.min(10, 5 / zoom));

                            return (
                                <g key={node.id} style={{ outline: isSelected ? `${outlineWidth}px dashed orange` : 'none', }}>
                                    <ModelRender node={node} selected={isSelected} />
                                    {node.label && (
                                        <NodeLabel label={node.label} anchor={{ x: node.x, y: node.y }} />
                                    )}
                                </g>
                            );
                        })}
                    </g>
                );
            })}
        </>
    );
}
