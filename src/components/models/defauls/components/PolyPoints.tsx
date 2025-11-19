import { Vert } from '@/types';

export interface PolyPointsProps {
    points: Vert[];
}
export default function PolyPoints({ points }: PolyPointsProps) {
    return (
        <>
            {points.map(({ x, y }, index) => (
                <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={8}
                    fill={"#888"}
                    style={{ pointerEvents: 'none' }}
                />
            ))}
        </>
    );
}