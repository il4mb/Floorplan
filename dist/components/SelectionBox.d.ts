import React from 'react';
import { Point } from '../types';
interface SelectionBoxProps {
    start: Point;
    end: Point;
    onSelect: (ids: string[]) => void;
}
declare const SelectionBox: React.FC<SelectionBoxProps>;
export default SelectionBox;
//# sourceMappingURL=SelectionBox.d.ts.map