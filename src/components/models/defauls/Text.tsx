import { CaseSensitive } from "lucide-react";
import { Model } from "@/utils/model";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Node } from "@/types";

type TextNode = Node & {
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
}

export default {
    type: "text",
    name: "Text",
    icon: (props) => <CaseSensitive {...props} />,
    properties: [
        {
            type: "text",
            name: "text",
            label: "Text Content",
            default: "Double click to edit"
        },
        {
            type: "number",
            name: "fontSize",
            label: "Font Size",
            default: 16
        },
        {
            type: "select",
            name: "fontFamily",
            label: "Font Family",
            options: [
                { value: "Arial, sans-serif", label: "Arial" },
                { value: "Helvetica, sans-serif", label: "Helvetica" },
                { value: "Georgia, serif", label: "Georgia" },
                { value: "Times New Roman, serif", label: "Times New Roman" },
                { value: "Courier New, monospace", label: "Courier New" }
            ],
            default: "Arial, sans-serif"
        },
        {
            type: "select",
            name: "fontWeight",
            label: "Font Weight",
            options: [
                { value: "normal", label: "Normal" },
                { value: "bold", label: "Bold" },
                { value: "lighter", label: "Light" }
            ],
            default: "normal"
        },
        {
            type: "color",
            name: "color",
            label: "Text Color",
            default: "#000000"
        },
        {
            type: "select",
            name: "textAlign",
            label: "Text Alignment",
            options: [
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" }
            ],
            default: "left"
        }
    ],
    render({ selected, node, updateNode }) {
        const [isEditing, setIsEditing] = useState(false);
        const [tempText, setTempText] = useState(node.text);
        const textInputRef = useRef<HTMLTextAreaElement>(null);
        const textRef = useRef<SVGTextElement>(null);

        const handleDoubleClick = () => {
            console.log("Click")
            // if (selected) {
            setIsEditing(true);
            setTempText(node.text);
            // }
        };

        const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setTempText(e.target.value);
        };

        const handleBlur = () => {
            if (tempText.trim() !== node.text) {
                updateNode("text", tempText.trim());
            }
            setIsEditing(false);
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                handleBlur();
            } else if (e.key === 'Escape') {
                setTempText(node.text);
                setIsEditing(false);
            }
        };

        // Auto-focus and select text when editing starts
        useEffect(() => {
            if (isEditing && textInputRef.current) {
                textInputRef.current.focus();
                textInputRef.current.select();
            }
        }, [isEditing]);

        // Reset editing state when selection changes
        // useEffect(() => {
        //     if (!selected) {
        //         setIsEditing(false);
        //     }
        // }, [selected]);

        // Update temp text when node text changes externally
        useEffect(() => {
            setTempText(node.text);
        }, [node.text]);

        const textStyle: CSSProperties = {
            fontSize: node.fontSize || 16,
            fontFamily: node.fontFamily || "Arial, sans-serif",
            fontWeight: node.fontWeight || "normal",
            fill: node.color || "#ffffff",
            textAnchor: node.textAlign === 'center' ? 'middle' :
                node.textAlign === 'right' ? 'end' : 'start'
        };

        return (
            <>
                {/* Display text */}
                {!isEditing && (
                    <text
                        ref={textRef}
                        x={node.x}
                        y={node.y}
                        style={textStyle}
                        onDoubleClick={handleDoubleClick}
                        cursor={selected ? "text" : "default"}>
                        {node.text || "Double click to edit"}
                    </text>
                )}

                {/* Editing overlay */}
                {isEditing && (
                    <foreignObject
                        x={node.x - (node.textAlign === 'center' ? 200 : 0)}
                        y={node.y - (node.fontSize || 16)}
                        width="400"
                        height={(node.fontSize || 16) * 2 + 10}>
                        <textarea
                            ref={textInputRef}
                            value={tempText}
                            onChange={handleTextChange}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: '2px solid #007bff',
                                borderRadius: '4px',
                                padding: '8px',
                                fontSize: `${node.fontSize || 16}px`,
                                fontFamily: node.fontFamily || "Arial, sans-serif",
                                fontWeight: node.fontWeight || "normal",
                                color: node.color || "#000000",
                                textAlign: node.textAlign || "left",
                                resize: 'none',
                                outline: 'none',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                            }}
                            placeholder="Enter text here..."
                        />
                    </foreignObject>
                )}

                {/* Selection indicator */}
                {selected && !isEditing && (
                    <rect
                        x={node.x - 5}
                        y={node.y - (node.fontSize || 16) - 5}
                        width="200"
                        height={(node.fontSize || 16) + 10}
                        fill="none"
                        stroke="#007bff"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                    />
                )}

                {/* Editing instructions */}
                {selected && !isEditing && (
                    <text
                        x={node.x}
                        y={node.y + 20}
                        fontSize="10"
                        fill="#666"
                        textAnchor="middle"
                        opacity="0.7"
                    >
                        Double-click to edit text
                    </text>
                )}
            </>
        );
    }
} as Model<TextNode>;