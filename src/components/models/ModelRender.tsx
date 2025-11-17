import { useModel } from '@/hooks/useModels';
import { Node } from '@/types';

export interface ModelRenderProps {
    node: Node;
    selected: boolean;
}
export default function ModelRender({ node, selected }: ModelRenderProps) {

    const model = useModel(node.type);
    if (!model) return;

    return (
        <>
            <model.render
                node={node}
                selected={selected} />
        </>
    );
}