import { CircleQuestionMark, Plus } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNodeModels } from './ModelsProvider';
import { Model } from '@/types';
import { useDragging } from '../DraggingProvider';

export default function NodeGallery() {

    const iconSize = 25;
    const dragging = useDragging();
    const models = useNodeModels();
    const modelsArray = useMemo(() => Array.from(models.values()), [models]);
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);


    const handleClick = (model: Model) => {
        dragging.setDragging(model);
        setOpen(false);
    }

    const togglePopup = () => {
        setOpen(!open);
    };

    const closePopup = () => {
        setOpen(false);
    };

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                closePopup();
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [open]);

    // Calculate popup position with boundary detection
    const getPopupPosition = () => {
        if (!buttonRef.current) return { top: 0, left: 0 };

        const rect = buttonRef.current.getBoundingClientRect();
        const popupWidth = 200; // Approximate popup width
        const popupHeight = 150; // Approximate popup height

        let left = rect.right + 10;
        let top = rect.top;

        // Check if popup would go off the right edge of the screen
        if (left + popupWidth > window.innerWidth) {
            left = rect.left - popupWidth - 10; // Show on the left side
        }

        // Check if popup would go off the bottom edge of the screen
        if (top + popupHeight > window.innerHeight) {
            top = window.innerHeight - popupHeight - 10;
        }

        // Check if popup would go off the top edge of the screen
        if (top < 0) {
            top = 10;
        }

        return { top, left };
    };

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                className="w-8 h-8 flex cursor-pointer items-center justify-center p-2 rounded-lg border transition-colors bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                onClick={togglePopup}>
                <Plus size={16} />
            </button>

            {open && (
                <div
                    ref={popupRef}
                    className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-48"
                    style={getPopupPosition()}>
                    <div className="text-sm font-medium text-gray-900 mb-2">
                        Add Node
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {modelsArray.map((model) => (
                            <button key={model.type} onClick={() => handleClick(model)} className="cursor-pointer flex flex-col items-center p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-center mb-1">
                                    {model.icon ? <model.icon width={iconSize} height={iconSize} /> : <CircleQuestionMark width={iconSize} height={iconSize} />}
                                </div>
                                <span className="text-xs text-gray-700 capitalize">
                                    {model.type}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}