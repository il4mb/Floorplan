// src/utils/exportImport.ts
import { FloorplanData, Point } from '../types';

export function exportToJSON(data: FloorplanData): string {
  return JSON.stringify(data, null, 2);
}

export function importFromJSON(json: string): FloorplanData {
  const data = JSON.parse(json);

  // Validate and normalize data
  return {
    meta: {
      version: data.meta?.version || '1.0',
      createdAt: data.meta?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    units: data.units || 'meters',
    gridSize: data.gridSize || 0.1,
    walls: data.walls || [],
    nodes: data.nodes || []
  };
}

export function exportToSVG(data: FloorplanData): string {
  const bounds = calculateBounds(data);
  const padding = 50;

  const svgContent = `
    <!-- Exported from Floorplan Editor -->
    <svg width="${bounds.width + padding * 2}" height="${bounds.height + padding * 2}" 
         viewBox="${bounds.x - padding} ${bounds.y - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}"
         xmlns="http://www.w3.org/2000/svg">
      
      <!-- Walls -->
      ${data.walls.map(wall => `
        <line x1="${wall.from.x}" y1="${wall.from.y}" x2="${wall.to.x}" y2="${wall.to.y}" 
              stroke="#374151" stroke-width="${wall.thickness}" stroke-linecap="round" />
      `).join('')}
      
      <!-- Nodes would be converted to SVG paths here -->
      
    </svg>
  `;

  return svgContent;
}

function calculateBounds(data: FloorplanData): { x: number; y: number; width: number; height: number } {
  const allPoints: Point[] = [];

  data.walls.forEach(wall => {
    allPoints.push(wall.from, wall.to);
  });

  data.nodes.forEach(node => {
    allPoints.push({ x: node.x, y: node.y });
  });

  if (allPoints.length === 0) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  const xs = allPoints.map(p => p.x);
  const ys = allPoints.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}