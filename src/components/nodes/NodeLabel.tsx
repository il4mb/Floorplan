import { NodeLabel as LabelType, Point } from '@/types';

export interface NodeLabelProps {
    label?: LabelType;
    anchor: Point;
}
export default function NodeLabel({ label, anchor }: NodeLabelProps) {
    return (
        <text>
        </text>
    );
}