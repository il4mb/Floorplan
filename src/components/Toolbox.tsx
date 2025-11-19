import { ToolButton } from "./ui/ToolButton";
import { Eraser, Hand, Redo, SquareMousePointer, Undo } from "lucide-react";
import { useFloorplanContext } from "./FloorplanProvider";
import { Tool } from "@/types";

const tools: { id: Tool, [key: string]: any }[] = [
    { id: "select", label: "Select", icon: <SquareMousePointer size={16} /> },
    { id: "pan", label: "Pan", icon: <Hand size={16} /> },
    { id: "erase", label: "Erase", icon: <Eraser size={16} /> },
];

export default function Toolbox() {

    const { state, actions } = useFloorplanContext();

    return (
        <div className="toolbox absolute bottom-0 left-0 p-5 z-100">
            <div className="flex flex-col gap-2">
                {tools.map(tool => (
                    <ToolButton
                        key={tool.id}
                        title={tool.label}
                        active={state.tool === tool.id}
                        onClick={() => actions.setTool(tool.id)}>
                        {tool.icon}
                    </ToolButton>
                ))}

                <ToolButton
                    title="Undo"
                    disabled={state.history.past.length === 0}
                    onClick={actions.undo}>
                    <Undo size={16} />
                </ToolButton>

                <ToolButton
                    title="Redo"
                    disabled={state.history.future.length === 0}
                    onClick={actions.redo}>
                    <Redo size={16} />
                </ToolButton>

            </div>
        </div>
    );
}
