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
    toggledIds: string[];
    toggledRecord: Record<string, String>;
    toggleById(itemId: string): void;
}
export type EventListener = {
    nodeId: string;
    callback: (e: Event) => void;
}
export const ActionsContext = createContext<ActionsContextState | undefined>(undefined);

export const useActionbars = () => {
    const ctx = useContext(ActionsContext);
    if (!ctx) throw new Error("useActionbars should call inside ActionsContext");
    return ctx;
}

export const useToggledAction = () => {
    const { toggledIds } = useActionbars();
    return toggledIds;
}

export const useToggleById = () => {
    const { toggleById } = useActionbars();
    return toggleById;
}

export const useActionListener = (id: string | string[],callback: Callback,deps: any[] = []) => {
    const { addActionListener } = useActionbars();

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
