import React, { MouseEvent } from "react";
import clsx from "clsx";

interface ToolButtonProps {
    active?: boolean;
    disabled?: boolean;
    title?: string;
    onClick?: (e: MouseEvent) => void;
    children: React.ReactNode;
}

export const ToolButton: React.FC<ToolButtonProps> = ({ active, disabled, title, onClick, children, }) => {
    return (
        <button
            title={title}
            aria-label={title}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
            className={clsx(
                "w-8 h-8 flex items-center justify-center rounded-lg p-1 border transition-colors",
                disabled && "opacity-40 cursor-not-allowed",
                !disabled &&
                (active
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100")
            )}>
            {children}
        </button>
    );
};
