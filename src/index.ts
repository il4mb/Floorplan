// Main exports
export { FloorplanProvider, useFloorplanContext } from './components/FloorplanProvider';
export { default as FloorplanCanvas } from './components/FloorplanCanvas';
export { default as Toolbox } from './components/Toolbox';
export { default as Inspector } from './components/inspector/Inspector';
export { default as ToolbarShortcuts } from './components/ToolbarShortcuts';
export { default as SelectionBox } from './components/SelectionBox';
export { default as TransformHandles } from './components/TransformHandles';

// Node components
export { default as Line } from './components/nodes/Line';
export { default as Door } from './components/nodes/Door';
export { default as Window } from './components/nodes/Window';
export { default as Furniture } from './components/nodes/Furniture';

// Utilities
export * from './utils/geometry';
export * from './utils/snap';
export * from './utils/history';
export * from './utils/exportImport';

// Types
export * from './types';

// Styles
import './styles.css';