import { Point } from "@/types";
import { createContext, useContext } from "react";

export const PointerContext = createContext<Point | null | undefined>(undefined);
export const usePointer = () => {
    const ctx = useContext(PointerContext);
    if (typeof ctx == "undefined") throw new Error("usePointer should call inside PointerContext");
    return ctx;
}


export const usePointerClick = () => {

}