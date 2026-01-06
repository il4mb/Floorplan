import { Node as PlanNode, PlanData, RoomMeta, Wall } from "@/types";
import { createContext, Dispatch, SetStateAction, useCallback, useContext } from "react";
import { nanoid } from "nanoid";
import { normalizeWalls as normalizeWallsGeometry } from "@/utils/wallNormalize";
import { findNearestWallAttachment } from "@/components/objects/wallAttach";
import Vec2 from "@/utils/vec2d";
export type EditorState = {
    data: PlanData;
    setData: Dispatch<SetStateAction<PlanData>>
}

export const EditorContext = createContext<EditorState | undefined>(undefined);

export const useEditor = () => {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error("useEditor should call inside EditorProvider");
    const { data, setData } = ctx;

    const applyWallNormalization = (prev: PlanData, nextWalls: Wall[]) => {
        const { walls: normalizedWallsRaw, idMap } = normalizeWallsGeometry(nextWalls, nanoid);

        // Auto-remove invalid tiny walls (length < thickness)
        const normalizedWalls = normalizedWallsRaw.filter(w => {
            const a = w.points?.[0];
            const b = w.points?.[1];
            if (!a || !b) return false;
            return Vec2.dist(a, b) >= w.thickness;
        });

        const nextNodes = prev.node.map((n) => {
            if (n.kind !== 'door' || !n.wallId) return n;
            const mappedWallId = idMap[n.wallId] ?? n.wallId;
            const wall = normalizedWalls.find(w => w.id === mappedWallId);
            if (!wall) return { ...n, wallId: mappedWallId, wallT: undefined };

            // Reproject attachment onto the resulting segment
            const attach = findNearestWallAttachment(n.coordinate, [wall]);
            if (!attach) return { ...n, wallId: mappedWallId, wallT: undefined };
            return {
                ...n,
                wallId: mappedWallId,
                wallT: attach.t,
                coordinate: attach.point,
                rotation: attach.angleDeg,
            };
        });

        return { ...prev, walls: normalizedWalls, node: nextNodes };
    };

    const addWall = (patch: Omit<Wall, 'id'>) => setData(prev => {
        const nextWalls = [...prev.walls, { ...patch, id: nanoid() }];
        return applyWallNormalization(prev, nextWalls);
    });

    const addWalls = (patches: Omit<Wall, 'id'>[]) => setData(prev => {
        const nextWalls = [...prev.walls, ...(patches.map(wall => ({ ...wall, id: nanoid() })))];
        return applyWallNormalization(prev, nextWalls);
    });

    const splitWall = useCallback((wallId: string, t: number) => {
        setData(prev => {
            const wall = prev.walls.find(w => w.id === wallId);
            if (!wall) return prev;
            if (!(t > 0 && t < 1)) return prev;

            const [a, b] = wall.points;
            const p = Vec2.lerp(a, b, t);

            const firstSeg: Wall = {
                id: t >= 0.5 ? wall.id : nanoid(),
                points: [a, p],
                thickness: wall.thickness,
                floor: wall.floor,
            };
            const secondSeg: Wall = {
                id: t < 0.5 ? wall.id : nanoid(),
                points: [p, b],
                thickness: wall.thickness,
                floor: wall.floor,
            };

            const nextWalls = prev.walls.filter(w => w.id !== wallId);
            nextWalls.push(firstSeg, secondSeg);
            return applyWallNormalization(prev, nextWalls);
        });
    }, []);

    const updateWall = useCallback((id: string, partial: Partial<Wall>) =>
        setData(prev => ({
            ...prev,
            walls: prev.walls.map(w => w.id === id ? { ...w, ...partial } : w)
        })), []);

    const updateWalls = useCallback((ids: string[], partials: Partial<Wall>[]) =>
        setData(prev => ({
            ...prev,
            walls: prev.walls.map(w => {
                const index = ids.indexOf(w.id);
                return index !== -1 ? { ...w, ...partials[index] } : w;
            })
        })), []);

    const normalizeWalls = useCallback(() => {
        setData(prev => applyWallNormalization(prev, prev.walls));
    }, []);


    const removeWalls = useCallback((id: string | string[]) => {
        const ids = Array.isArray(id) ? id : [id];
        setData(prev => ({
            ...prev,
            walls: prev.walls.filter(w => !ids.includes(w.id))
        }));
    }, []);

    const addNode = useCallback((node: PlanNode) =>
        setData(prev => ({ ...prev, node: [...prev.node, node] })), []);

    const updateNode = useCallback((id: string, partial: Partial<PlanNode>) =>
        setData(prev => ({
            ...prev,
            node: prev.node.map(n => n.id === id ? { ...n, ...partial } : n)
        })), []);

    const removeNode = useCallback((id: string) =>
        setData(prev => ({
            ...prev,
            node: prev.node.filter(n => n.id !== id)
        })), []);

    const upsertRoomMeta = useCallback((patch: RoomMeta) => {
        setData(prev => {
            const next = prev.roomsMeta ? [...prev.roomsMeta] : [];
            const idx = next.findIndex(r => r.key === patch.key);
            if (idx === -1) next.push(patch);
            else next[idx] = { ...next[idx], ...patch };
            return { ...prev, roomsMeta: next };
        });
    }, []);

    const updateRoomMeta = useCallback((key: string, partial: Partial<RoomMeta>) => {
        setData(prev => {
            const next = prev.roomsMeta ? [...prev.roomsMeta] : [];
            const idx = next.findIndex(r => r.key === key);
            if (idx === -1) return prev;
            const cleaned = Object.fromEntries(
                Object.entries(partial).filter(([, v]) => v !== undefined)
            ) as Partial<RoomMeta>;
            next[idx] = { ...next[idx], ...cleaned, key };
            return { ...prev, roomsMeta: next };
        });
    }, []);

    return {
        data,
        setData,
        addWall,
        addWalls,
        updateWall,
        updateWalls,
        normalizeWalls,
        removeWalls,
        splitWall,
        addNode,
        updateNode,
        removeNode,
        upsertRoomMeta,
        updateRoomMeta,
    };
};
