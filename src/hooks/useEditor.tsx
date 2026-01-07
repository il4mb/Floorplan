import { Node as PlanNode, PlanData, RoomMeta, Wall } from "@/types";
import { createContext, Dispatch, SetStateAction, useCallback, useContext } from "react";
import { nanoid } from "nanoid";
import { normalizeWalls as normalizeWallsGeometry } from "@/utils/wallNormalize";
import { findNearestWallAttachment } from "@/components/objects/wallAttach";
import Vec2 from "@/utils/vec2d";
import Line2 from "@/utils/line2d";
export type EditorState = {
    data: PlanData;
    setData: Dispatch<SetStateAction<PlanData>>
}

export const EditorContext = createContext<EditorState | undefined>(undefined);

export const useEditor = () => {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error("useEditor should call inside EditorProvider");
    const { data, setData } = ctx;

    const detachFromWall = (n: PlanNode): PlanNode => {
        const { wallId: _wallId, wallT: _wallT, ...rest } = n;
        return rest;
    };

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
            if (!wall) return detachFromWall(n);

            // Reproject attachment onto the resulting segment
            const attach = findNearestWallAttachment(n.coordinate, [wall]);
            if (!attach) return detachFromWall(n);
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
        return { ...prev, walls: nextWalls };
    });

    const addWalls = (patches: Omit<Wall, 'id'>[]) => setData(prev => {
        const nextWalls = [...prev.walls, ...(patches.map(wall => ({ ...wall, id: nanoid() })))];
        return { ...prev, walls: nextWalls };
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
            return { ...prev, walls: nextWalls };
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

    const cleanupShortWalls = useCallback((minLenMm: number = 200) => {
        setData(prev => {
            const walls = prev.walls;
            if (!walls || walls.length === 0) return prev;

            const removeIds = new Set<string>();

            for (const w of walls) {
                const a = w.points?.[0];
                const b = w.points?.[1];
                if (!a || !b) {
                    removeIds.add(w.id);
                    continue;
                }

                const len = Vec2.dist(a, b);
                const minLenLocal = Math.max(minLenMm, w.thickness);
                if (len >= minLenLocal) continue;

                // Only remove short walls that are effectively "joined" to other
                // geometry within about the wall width.
                let isJoined = false;
                for (const other of walls) {
                    if (other.id === w.id) continue;
                    const oa = other.points?.[0];
                    const ob = other.points?.[1];
                    if (!oa || !ob) continue;

                    const tol = Math.max(w.thickness, other.thickness) * 0.5;

                    // Endpoint-to-endpoint join.
                    if (
                        Vec2.dist(a, oa) <= tol ||
                        Vec2.dist(a, ob) <= tol ||
                        Vec2.dist(b, oa) <= tol ||
                        Vec2.dist(b, ob) <= tol
                    ) {
                        isJoined = true;
                        break;
                    }

                    // Endpoint-to-segment join (T-junction / overlap proximity).
                    if (Line2.getDistanceToSegment(a, other.points) <= tol || Line2.getDistanceToSegment(b, other.points) <= tol) {
                        isJoined = true;
                        break;
                    }
                }

                if (isJoined) removeIds.add(w.id);
            }

            if (removeIds.size === 0) return prev;
            return {
                ...prev,
                walls: prev.walls.filter(w => !removeIds.has(w.id)),
            };
        });
    }, [setData]);


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
            next[idx] = ({ ...next[idx]!, ...cleaned, key } as RoomMeta);
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
        cleanupShortWalls,
        removeWalls,
        splitWall,
        addNode,
        updateNode,
        removeNode,
        upsertRoomMeta,
        updateRoomMeta,
    };
};
