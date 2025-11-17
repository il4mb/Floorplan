import { ReactNode, useMemo } from 'react';
import { Model } from '../../utils/model';
import Object from './defauls/Object';
import { ModelContext } from '../../hooks/useModels';
import Polygon from './defauls/Polygon';
import Text from './defauls/Text';

export interface ModelProviderProps {
    children?: ReactNode;
    customNodes?: Model[];
    loadBuildinNode?: boolean;
}

export default function ModelProvider({ children, customNodes = [], loadBuildinNode = true }: ModelProviderProps) {

    const buildinNode = useMemo(() => [Polygon, Text, Object], []);
    const models = useMemo(() => {
        const all = [
            ...(loadBuildinNode ? buildinNode : []),
            ...customNodes
        ];
        const map = new Map<string, Model>();
        all.forEach(m => map.set(m.type, m));
        return map;
    }, [customNodes, loadBuildinNode]);

    return (
        <ModelContext.Provider value={models}>
            {children}
        </ModelContext.Provider>
    );
}