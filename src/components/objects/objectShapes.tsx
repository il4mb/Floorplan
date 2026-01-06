import { CSSProperties } from "react";

export type ObjectKind = string | undefined;

type ShapeOptions = {
    kind: ObjectKind;
    width: number;
    height: number;
    selected?: boolean;
    strokeWidth?: number;
};

function strokeColor(selected?: boolean) {
    return selected ? "#007aff" : "#333";
}

export function ObjectGlyph({ kind, style }: { kind: ObjectKind; style?: CSSProperties }) {
    // small preview used in gallery buttons
    return (
        <svg
            width={44}
            height={44}
            viewBox="-50 -50 100 100"
            style={style}
            aria-hidden>
            {renderObjectElements({ kind, width: 90, height: 60, selected: false, strokeWidth: 3 })}
        </svg>
    );
}

export function ObjectSvg({ kind, width, height, selected }: ShapeOptions) {
    return (
        <>
            {renderObjectElements({
                kind,
                width,
                height,
                ...(selected === undefined ? {} : { selected }),
            })}
        </>
    );
}

function renderObjectElements({ kind, width, height, selected }: ShapeOptions) {
    const s = strokeColor(selected);
    const sw = 3;
    const fill = "none";

    switch (kind) {
        case "chair": {
            const seat = Math.min(width, height) * 0.55;
            return (
                <>
                    <rect x={-seat / 2} y={-seat / 2} width={seat} height={seat} rx={6} ry={6} fill={fill} stroke={s} strokeWidth={sw} />
                    <path
                        d={`M ${-seat / 2} ${-seat / 2} L ${-seat / 2} ${-seat / 2 - seat * 0.55} L ${seat / 2} ${-seat / 2 - seat * 0.55} L ${seat / 2} ${-seat / 2}`}
                        fill="none"
                        stroke={s}
                        strokeWidth={sw}
                        strokeLinejoin="round"
                    />
                </>
            );
        }
        case "table": {
            const topW = width * 0.9;
            const topH = height * 0.55;
            const leg = Math.max(6, Math.min(width, height) * 0.08);
            const lx = topW / 2 - leg;
            const ly = topH / 2 - leg;
            return (
                <>
                    <rect x={-topW / 2} y={-topH / 2} width={topW} height={topH} rx={8} ry={8} fill={fill} stroke={s} strokeWidth={sw} />
                    <rect x={-lx} y={-ly} width={leg} height={leg} fill={fill} stroke={s} strokeWidth={sw} />
                    <rect x={lx - leg} y={-ly} width={leg} height={leg} fill={fill} stroke={s} strokeWidth={sw} />
                    <rect x={-lx} y={ly - leg} width={leg} height={leg} fill={fill} stroke={s} strokeWidth={sw} />
                    <rect x={lx - leg} y={ly - leg} width={leg} height={leg} fill={fill} stroke={s} strokeWidth={sw} />
                </>
            );
        }
        case "sofa": {
            const bodyW = width * 0.95;
            const bodyH = height * 0.55;
            const armW = Math.max(10, width * 0.12);
            return (
                <>
                    <rect x={-bodyW / 2} y={-bodyH / 2} width={bodyW} height={bodyH} rx={10} ry={10} fill={fill} stroke={s} strokeWidth={sw} />
                    <path
                        d={`M ${-bodyW / 2 + armW} ${-bodyH / 2} L ${-bodyW / 2 + armW} ${bodyH / 2}`}
                        stroke={s}
                        strokeWidth={sw}
                    />
                    <path
                        d={`M ${bodyW / 2 - armW} ${-bodyH / 2} L ${bodyW / 2 - armW} ${bodyH / 2}`}
                        stroke={s}
                        strokeWidth={sw}
                    />
                    <path
                        d={`M ${-bodyW / 2} ${-bodyH / 2 - bodyH * 0.35} L ${bodyW / 2} ${-bodyH / 2 - bodyH * 0.35}`}
                        stroke={s}
                        strokeWidth={sw}
                        opacity={0.65}
                    />
                </>
            );
        }
        case "bed": {
            const frameW = width * 0.95;
            const frameH = height * 0.8;
            const pillowW = frameW * 0.35;
            const pillowH = frameH * 0.2;
            return (
                <>
                    <rect x={-frameW / 2} y={-frameH / 2} width={frameW} height={frameH} rx={10} ry={10} fill={fill} stroke={s} strokeWidth={sw} />
                    <rect x={-frameW / 2 + frameW * 0.08} y={-frameH / 2 + frameH * 0.08} width={pillowW} height={pillowH} rx={8} ry={8} fill={fill} stroke={s} strokeWidth={sw} opacity={0.85} />
                    <rect x={frameW / 2 - frameW * 0.08 - pillowW} y={-frameH / 2 + frameH * 0.08} width={pillowW} height={pillowH} rx={8} ry={8} fill={fill} stroke={s} strokeWidth={sw} opacity={0.85} />
                    <path
                        d={`M ${-frameW / 2} 0 L ${frameW / 2} 0`}
                        stroke={s}
                        strokeWidth={sw}
                        opacity={0.35}
                    />
                </>
            );
        }
        case "door": {
            // CAD-ish door: a leaf line + swing arc about hinge.
            const len = width;
            const hingeX = -len / 2;
            const hingeY = 0;
            const leafX = hingeX + len;
            const leafY = 0;
            const r = len;
            const arc = `M ${hingeX} ${hingeY} A ${r} ${r} 0 0 1 ${hingeX + r} ${hingeY + r}`;
            return (
                <>
                    <circle cx={hingeX} cy={0} r={4} fill={s} />
                    <line x1={hingeX} y1={0} x2={leafX} y2={leafY} stroke={s} strokeWidth={sw} strokeLinecap="round" />
                    <path d={arc} fill="none" stroke={s} strokeWidth={sw} opacity={0.55} />
                </>
            );
        }
        default: {
            return (
                <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={8} ry={8} fill={fill} stroke={s} strokeWidth={sw} />
            );
        }
    }
}
