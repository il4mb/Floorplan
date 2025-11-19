import { Callback, MapListener } from "@/hooks/useActionbars";
import { RefObject } from "react";

export function waitForListener(listenerRef: RefObject<MapListener>, nodeId: string, actionId: string, timeout = 1000): Promise<Map<string, Callback>> {

    return new Promise((resolve, reject) => {
        const start = performance.now();

        const tick = () => {
            const map = listenerRef.current;

            const nodeMap = map.get(nodeId);
            const actionMap = nodeMap?.get(actionId);

            if (actionMap) {
                resolve(actionMap);
                return;
            }

            // TIMEOUT
            if (performance.now() - start >= timeout) {
                reject(new Error("Timeout: listener not found"));
                return;
            }

            // poll setiap 20ms
            requestAnimationFrame(tick);
        };

        tick();
    });
}
