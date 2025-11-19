import { Point } from "@/types";
import { MouseEvent, useContext, createContext, useEffect } from "react";

export type EventName = "mousedown" | "mousemove" | "mouseup" | "mouseleave" | "mouseenter" |"contexmenu";
export type EventListeners = Map<EventName, Map<string, Callback>>;
export type Callback = (e: MouseEvent) => void;
export type Unsubscribe = (() => void) | undefined;


export type CanvasContextState = {
    addListener(event: EventName, callback: Callback): Unsubscribe;
    clientToWorldPoint: (point: Point) => Point;
    worldToScreenPoint: (point: Point) => Point;
    snapPoint: (point: Point, threshold?: number) => Point
}
export const CanvasContext = createContext<CanvasContextState | undefined>(undefined);

export const useCanvas = () => {
    const ctx = useContext(CanvasContext);
    if (!ctx) throw new Error("useCanvas should call inside <CanvasContext/>");
    return ctx;
}


function createMouseHook(eventName: EventName) {
    return function useMouseEvent(callback: Callback, deps: any[] = []) {
        const { addListener } = useCanvas();

        useEffect(() => {
            const unsub = addListener(eventName, callback);
            return unsub;
        }, deps);
    };
}

export const useMouseDown = createMouseHook("mousedown");
export const useMouseMove = createMouseHook("mousemove");
export const useMouseUp = createMouseHook("mouseup");
export const useMouseLeave = createMouseHook("mouseleave");
export const useMouseEnter = createMouseHook("mouseenter");
export const useContextMenu = createMouseHook("contexmenu");
export const useMouseEvent = (callback: Callback, deps: any[] = []) => {

}