import { Actionbar } from "@/utils/model";
import { createContext, useContext, useEffect } from "react";

export type Event = {
    type: "click" | "toggled" | "untoggled";
    toolbar: Actionbar;
    context?: string;
}
export type Callback = (event: Event) => void;
export type Unsubscribe = () => void;
export type ActionsContextState = {
    addClickListener(callback: Callback): Unsubscribe;
    addToggledListener(callback: Callback): Unsubscribe;
    addUntoggledListener(callback: Callback): Unsubscribe;
    toggled: Actionbar | null;
    toggleById(itemId: string): void;
    isToggled(itemId: string): boolean;
}

export const ActionsContext = createContext<ActionsContextState | undefined>(undefined);

export const useActions = () => {
    const ctx = useContext(ActionsContext);
    if (!ctx) throw new Error("useActions should call inside ActionsContext");
    return ctx;
}

export const useActionClick = (callback: Callback, deps: any[] = []) => {
    const { addClickListener } = useActions();
    useEffect(() => {
        return addClickListener(callback);
    }, [...deps]);
}

export const useActionToggled = (callback: Callback, deps: any[] = []) => {
    const { addToggledListener } = useActions();
    useEffect(() => {
        return addToggledListener(callback);
    }, [...deps]);
}

export const useActionUntoggled = (callback: Callback, deps: any[] = []) => {
    const { addUntoggledListener } = useActions();
    useEffect(() => {
        return addUntoggledListener(callback);
    }, [...deps]);
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