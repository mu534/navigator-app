export interface Step {
  way_points: number[];
  instruction: string;
  distance?: number;
  duration?: number;
}

export interface Segment {
  steps: Step[];
  distance: number;
  duration: number;
}

export interface Geometry {
  coordinates: [number, number][];
  type: "LineString";
}

export interface Route {
  segments: Segment[];
  geometry: Geometry;
  distance: number;
  duration: number;
}
