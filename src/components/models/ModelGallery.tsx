import { useModelsArray, useSetDragging } from '@/hooks/useModels';
import { createElement, useCallback } from 'react';

export default function ModelGallery() {

    const setDragging = useSetDragging();
    const modelArray = useModelsArray();


    const onClick = (type: string) => useCallback(() => {
        const model = modelArray.find(m => m.type == type);
        if (!model) return;
        setDragging(model);
    }, [modelArray]);


    return (
        <div className='p-3'>
            <h3 className='mb-3 text-[1.1em] font-bold'>Block Gallery</h3>
            <div className="grid grid-cols-2 gap-2 select-none">
                {modelArray.map(model => (
                    <div key={model.type}
                        onClick={onClick(model.type)}
                        className="bg-gray-900 flex flex-col items-center p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer group">
                        <div className="flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors">
                            {createElement(model.icon, { width: 20, height: 20, color: 'currentColor' })}
                        </div>
                        <span className="text-[0.8em] text-gray-400 group-hover:text-blue-800 text-center font-medium">
                            {model.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}