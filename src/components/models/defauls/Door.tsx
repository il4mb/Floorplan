import { ReactNode } from 'react';

export interface DoorProps {
    children?: ReactNode;
}
export default function Door({ children }: DoorProps) {

    const [x, y] = [0, 0];

    return (
        <g transform={`translate(${x}, ${y})`}>

            <defs>
                <mask id='mask-circle'>
                    <rect width={100} height={100} fill='#fff' />
                </mask>
            </defs>

            <g mask='url(#mask-circle)'>
                <circle r={100}
                    fill='#0000'
                    stroke='#555'
                    strokeWidth={5}
                    strokeDasharray={'10 10'} />
                <rect
                    rx={5}
                    width={100}
                    height={10}
                    fill='#555'
                    transform='translate(10, 0) rotate(90)' />
                <rect
                    rx={5}
                    width={100}
                    height={10}
                    fill='#aaa' />
            </g>
        </g>
    );
}