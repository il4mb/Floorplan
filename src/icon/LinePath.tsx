import { ReactNode, SVGProps } from 'react';

export interface LinePathProps {
    children?: ReactNode;
}
export default function LinePath(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox='0 0 6.3499999 6.3499998' width={'1rem'} height={'1rem'} {...props}>
            <path d='M 5.09,0.41 A 0.89,0.89 0 0 0 4.2,1.3 0.89,0.89 0 0 0 5.09,2.19 0.89,0.89 0 0 0 5.98,1.3 0.89,0.89 0 0 0 5.09,0.41 Z M 3.95,1.83 1.84,3.94 2.37,4.47 4.48,2.36 Z M 1.31,4.06 c -0.1,0 -0.2,0.04 -0.27,0.11 L 0.48,4.73 c -0.15,0.15 -0.15,0.4 0,0.55 l 0.55,0.55 c 0.15,0.15 0.4,0.15 0.55,0 L 2.13,5.28 c 0.15,-0.15 0.15,-0.4 0,-0.55 L 1.58,4.18 C 1.51,4.1 1.41,4.06 1.31,4.06 Z m 0,0.45 L 1.8,5 1.31,5.49 0.82,5 Z'/>
        </svg>
    );
}