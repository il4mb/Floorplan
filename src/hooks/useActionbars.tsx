import { Actionbar } from "@/utils/model";
import { createContext, useContext, useEffect } from "react";

export type MapListener = Map<string, Map<string, Map<string, Callback>>>;
export type Event = {
    nodeId: string;
    type: "click" | "toggled" | "untoggled";
    toolbar: Actionbar;
    context?: string;
}
export type Callback = (event: Event) => void;
export type Unsubscribe = (() => void) | undefined;
export type ActionsContextState = {
    addActionListener(actionId: string, callback: Callback): Unsubscribe;
    toggled: Actionbar | null;
    toggleById(itemId: string): void;
    isToggled(itemId: string): boolean;
}
export type EventListener = {
    nodeId: string;
    callback: (e: Event) => void;
}
export const ActionsContext = createContext<ActionsContextState | undefined>(undefined);

export const useActions = () => {
    const ctx = useContext(ActionsContext);
    if (!ctx) throw new Error("useActions should call inside ActionsContext");
    return ctx;
}

export const useToggledAction = () => {
    const { toggled } = useActions();
    return toggled;
}

export const useToggleById = () => {
    const { toggleById } = useActions();
    return toggleById;
}

export const useIsToggled = (itemId: string) => {
    const { isToggled } = useActions();
    return isToggled(itemId);
}

export const useActionListener = (id: string | string[],callback: Callback,deps: any[] = []) => {
    const { addActionListener } = useActions();

    useEffect(() => {

        const ids = Array.isArray(id) ? id : [id];
        const unsubscribers = ids.map(actionId =>
            addActionListener(actionId, callback)
        );

        return () => {
            unsubscribers.forEach(unsub => unsub && unsub());
        };
    }, deps);
};
