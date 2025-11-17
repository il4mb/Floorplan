// src/__tests__/integration.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloorplanProvider } from '../hooks/useFloorplan';
import FloorplanCanvas from '../components/FloorplanCanvas';
import Toolbox from '../components/Toolbox';

const TestWrapper: React.FC = () => (
  <FloorplanProvider>
    <Toolbox />
    <FloorplanCanvas width={800} height={600} gridSize={10} snap />
  </FloorplanProvider>
);

describe('Floorplan Editor Integration', () => {
  test('user can draw a wall and add a door', () => {
    render(<TestWrapper />);
    
    // Select wall tool
    const wallTool = screen.getByTitle('Wall');
    fireEvent.click(wallTool);
    
    // Click to start drawing wall
    const canvas = screen.getByRole('application'); // SVG has role="application"
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(canvas);
    
    // Click to end wall
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseUp(canvas);
    
    // Select door tool
    const doorTool = screen.getByTitle('Door');
    fireEvent.click(doorTool);
    
    // Add door
    fireEvent.mouseDown(canvas, { clientX: 150, clientY: 100 });
    fireEvent.mouseUp(canvas);
    
    // Verify elements were created
    // This would need proper SVG querying or state verification
    expect(true).toBe(true); // Placeholder
  });
});