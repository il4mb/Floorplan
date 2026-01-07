import { Node as PlanNode, PlanData, Point, RoomMeta, Wall } from "@/types";
import { createContext, Dispatch, SetStateAction, useCallback, useContext, useEffect, useRef } from "react";
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

// Debounce normalization globally so multiple components/tools don't
// repeatedly normalize during fast interactions.
let normalizeWallsTimer: number | undefined;

export const useEditor = () => {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error("useEditor should call inside EditorProvider");
    const { data, setData } = ctx;

    // Use a ref so we can cancel any scheduled normalize on unmount.
    // The actual timer is global to keep behavior consistent across components.
    const hasUnmountedRef = useRef(false);

    useEffect(() => {
        return () => {
            hasUnmountedRef.current = true;
        };
    }, []);

    const detachFromWall = (n: PlanNode): PlanNode => {
        const { wallId: _wallId, wallT: _wallT, ...rest } = n;
        return rest;
    };

    /**
     * Merge collinear walls that share an endpoint into single walls
     */
    const mergeCollinearWalls = (walls: Wall[]): { walls: Wall[]; idMap: Record<string, string> } => {
        if (walls.length <= 1) return { walls, idMap: {} };

        const ANGLE_TOL = 0.05; // ~2.87 degrees
        const ENDPOINT_TOL = 5; // pixels
        const idMap: Record<string, string> = {};

        // Deep copy
        let workingWalls = walls.map(w => ({
            id: w.id,
            floor: w.floor,
            thickness: w.thickness,
            points: [{ ...w.points[0] }, { ...w.points[1] }] as [Point, Point]
        }));

        const areCollinear = (ptsA: [Point, Point], ptsB: [Point, Point]): boolean => {
            const lenA = Vec2.dist(ptsA[0], ptsA[1]);
            const lenB = Vec2.dist(ptsB[0], ptsB[1]);
            if (lenA < 1 || lenB < 1) return false;

            const dirA = Vec2.normalize(Vec2.sub(ptsA[1], ptsA[0]));
            const dirB = Vec2.normalize(Vec2.sub(ptsB[1], ptsB[0]));

            // Check parallel (cross product close to 0)
            const cross = Math.abs(Vec2.cross(dirA, dirB));
            if (cross > ANGLE_TOL) return false;

            // Check on same line (distance from ptsB[0] to line A)
            const v = Vec2.sub(ptsB[0], ptsA[0]);
            const distToLine = Math.abs(Vec2.cross(dirA, v));
            return distToLine <= ENDPOINT_TOL;
        };

        const findSharedEndpoint = (ptsA: [Point, Point], ptsB: [Point, Point]): { idxA: 0 | 1; idxB: 0 | 1 } | null => {
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    if (Vec2.dist(ptsA[i as 0 | 1], ptsB[j as 0 | 1]) <= ENDPOINT_TOL) {
                        return { idxA: i as 0 | 1, idxB: j as 0 | 1 };
                    }
                }
            }
            return null;
        };

        const hasOtherWallAtPoint = (p: Point, excludeIds: Set<string>): boolean => {
            for (const w of workingWalls) {
                if (excludeIds.has(w.id)) continue;
                if (Vec2.dist(p, w.points[0]) <= ENDPOINT_TOL || Vec2.dist(p, w.points[1]) <= ENDPOINT_TOL) {
                    return true;
                }
            }
            return false;
        };

        let changed = true;
        let iterations = 0;
        while (changed && iterations < 100) {
            changed = false;
            iterations++;

            outer: for (let i = 0; i < workingWalls.length; i++) {
                const wA = workingWalls[i]!;

                for (let j = i + 1; j < workingWalls.length; j++) {
                    const wB = workingWalls[j]!;

                    // Same floor and thickness
                    if (wA.floor !== wB.floor) continue;
                    if (Math.abs(wA.thickness - wB.thickness) > 1) continue;

                    // Find shared endpoint
                    const shared = findSharedEndpoint(wA.points, wB.points);
                    if (!shared) continue;

                    // Check collinear
                    if (!areCollinear(wA.points, wB.points)) continue;

                    // Check no T-junction (no other wall at shared point)
                    const sharedPoint = wA.points[shared.idxA];
                    const excludeIds = new Set([wA.id, wB.id]);
                    
                    // Check if any non-collinear wall connects at this point
                    let hasTJunction = false;
                    for (const w of workingWalls) {
                        if (excludeIds.has(w.id)) continue;
                        const d0 = Vec2.dist(sharedPoint, w.points[0]);
                        const d1 = Vec2.dist(sharedPoint, w.points[1]);
                        if (d0 > ENDPOINT_TOL && d1 > ENDPOINT_TOL) continue;
                        
                        // Found a wall at this point, check if collinear with wA
                        if (!areCollinear(wA.points, w.points)) {
                            hasTJunction = true;
                            break;
                        }
                    }

                    if (hasTJunction) continue;

                    // MERGE: wA absorbs wB
                    const newEndpoint = wB.points[shared.idxB === 0 ? 1 : 0];
                    wA.points[shared.idxA] = { ...newEndpoint };

                    idMap[wB.id] = wA.id;
                    workingWalls.splice(j, 1);

                    changed = true;
                    break outer;
                }
            }
        }

        for (const w of workingWalls) {
            if (!idMap[w.id]) idMap[w.id] = w.id;
        }

        return { walls: workingWalls, idMap };
    };

    const applyWallNormalization = (prev: PlanData, nextWalls: Wall[]) => {
        const { walls: normalizedWallsRaw, idMap: normalizeIdMap } = normalizeWallsGeometry(nextWalls, nanoid);

        // Auto-remove invalid tiny walls (length < thickness)
        const filteredWalls = normalizedWallsRaw.filter(w => {
            const a = w.points?.[0];
            const b = w.points?.[1];
            if (!a || !b) return false;
            return Vec2.dist(a, b) >= w.thickness;
        });

        // Merge collinear walls that share endpoints
        const { walls: normalizedWalls, idMap: mergeIdMap } = mergeCollinearWalls(filteredWalls);
        
        // Combine id maps
        const idMap: Record<string, string> = { ...normalizeIdMap };
        for (const [k, v] of Object.entries(mergeIdMap)) {
            // Follow the chain: if k was mapped by normalize, use that mapping
            const normalizedK = normalizeIdMap[k] ?? k;
            idMap[normalizedK] = v;
        }

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

    const normalizeWallsDebounced = useCallback((delayMs: number = 80) => {
        if (normalizeWallsTimer !== undefined) {
            clearTimeout(normalizeWallsTimer);
            normalizeWallsTimer = undefined;
        }
        normalizeWallsTimer = window.setTimeout(() => {
            normalizeWallsTimer = undefined;
            setData(prev => applyWallNormalization(prev, prev.walls));
        }, Math.max(0, delayMs));
    }, [setData]);


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
        normalizeWallsDebounced,
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
