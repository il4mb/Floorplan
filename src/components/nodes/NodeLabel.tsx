import { NodeLabel as LabelType, Vert } from '@/types';

export interface NodeLabelProps {
    label?: LabelType;
    anchor: Vert;
}
export default function NodeLabel({ label, anchor }: NodeLabelProps) {
    return (
        <text>
        </text>
    );
}