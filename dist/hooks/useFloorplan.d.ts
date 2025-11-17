import { FloorplanData, FloorplanState, FloorplanActions, Tool, ViewState } from '../types';
export declare function useFloorplan(initialData?: FloorplanData): {
    state: {
        data: FloorplanData;
        selection: string[];
        tool: Tool;
        view: ViewState;
        history: {
            past: FloorplanData[];
            future: FloorplanData[];
        };
    };
    actions: FloorplanActions;
};
export declare const FloorplanProvider: React.FC<{
    children: React.ReactNode;
    initialData?: FloorplanData;
}>;
export declare const useFloorplanContext: () => {
    state: FloorplanState;
    actions: FloorplanActions;
};
//# sourceMappingURL=useFloorplan.d.ts.map