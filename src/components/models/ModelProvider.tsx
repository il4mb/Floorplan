import { ReactNode, useMemo, useState } from 'react';
import { Model } from '../../utils/model';
import Object from './defauls/Object';
import { ModelContext, ModelDraggingContext } from '../../hooks/useModels';
import Polygon from './defauls/Polygon';
import Text from './defauls/Text';

export interface ModelProviderProps {
    children?: ReactNode;
    customNodes?: Model[];
    loadBuildinNode?: boolean;
}

export default function ModelProvider({ children, customNodes = [], loadBuildinNode = true }: ModelProviderProps) {

    const [dragging, setDragging] = useState<Model | null>(null);
    const buildinNode = useMemo(() => [Polygon, Text, Object], []);
    const models = useMemo(() => {
        const all = [
            ...(loadBuildinNode ? buildinNode : []),
            ...customNodes
        ];
        const map = new Map<string, Model<any>>();
        all.forEach(model => map.set(model.type, model));
        return map;
    }, [customNodes, loadBuildinNode]);

    return (
        <ModelContext.Provider value={models}>
            <ModelDraggingContext.Provider value={{ dragging, setDragging }}>
                {children}
            </ModelDraggingContext.Provider>
        </ModelContext.Provider>
    );
}