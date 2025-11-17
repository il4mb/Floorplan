// src/__tests__/geometry.test.ts
import { distance, midpoint, angle, rotatePoint, boundingBox, lineIntersection } from '../utils/geometry';

describe('Geometry Utilities', () => {
  test('distance calculates correct distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  test('midpoint calculates correct midpoint', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 4, y: 6 })).toEqual({ x: 2, y: 3 });
  });

  test('angle calculates correct angle', () => {
    expect(angle({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(Math.PI / 4);
  });

  test('rotatePoint rotates correctly', () => {
    const result = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(1);
  });

  test('boundingBox calculates correct bounds', () => {
    const points = [{ x: 0, y: 0 }, { x: 5, y: 10 }, { x: -2, y: 3 }];
    const result = boundingBox(points);
    expect(result).toEqual({ x: -2, y: 0, width: 7, height: 10 });
  });

  test('lineIntersection finds intersection point', () => {
    const intersection = lineIntersection(
      { x: 0, y: 0 }, { x: 4, y: 4 },
      { x: 0, y: 4 }, { x: 4, y: 0 }
    );
    expect(intersection).toEqual({ x: 2, y: 2 });
  });
});