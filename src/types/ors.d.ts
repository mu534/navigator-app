export interface Step {
  instruction: string;
}

export interface Segment {
  steps: Step[];
}

export interface Route {
  segments: Segment[];
  geometry: {
    coordinates: [number, number][];
    type: string;
  };
}

export interface DirectionsResponse {
  routes: Route[];
}
