import React from 'react';
import { FloorplanData, FloorplanState, FloorplanActions } from '../types';
export declare const FloorplanProvider: React.FC<{
    children: React.ReactNode;
    initialData?: FloorplanData;
}>;
export declare const useFloorplanContext: () => {
    state: FloorplanState;
    actions: FloorplanActions;
};
//# sourceMappingURL=FloorplanProvider.d.ts.map