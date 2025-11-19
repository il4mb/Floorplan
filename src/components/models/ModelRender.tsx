import { useModel } from '@/hooks/useModels';
import { Node } from '@/types';

export interface ModelRenderProps {
    node: Node;
    selected: boolean;
    updateNode: (key: string, value: any) => void;
}
export default function ModelRender({ node, selected, updateNode }: ModelRenderProps) {

    const model = useModel(node.type);
    if (!model) return;

    return (
        <>
            <model.render
                key={node.id}
                node={node}
                selected={selected}
                updateNode={updateNode} />
        </>
    );
}