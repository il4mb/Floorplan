import { useFloorplanContext } from "../components/FloorplanProvider";

export const useSelection = () => {
    const { state } = useFloorplanContext();
    return state.selection;
}