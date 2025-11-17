import { ReactNode } from 'react';
import { ToolButton } from '../ui/ToolButton';
import { CirclePlus, MousePointerClick, X } from 'lucide-react';

export interface ToolbarProps {
    children?: ReactNode;
}
export default function NodeToolbox({ }: ToolbarProps) {
    
    return (
        <div className={`toolbox absolute z-100 top-0 right-0 p-5`}>
            <div className={`flex flex-row gap-2`}>
                <ToolButton title='Select Node'>
                    <MousePointerClick size={16} />
                </ToolButton>
                <ToolButton title='Add node'>
                    <CirclePlus size={16} />
                </ToolButton>
                <ToolButton title='Remode node'>
                    <X color='red' size={16}/>
                </ToolButton>
            </div>
        </div>
    );
}