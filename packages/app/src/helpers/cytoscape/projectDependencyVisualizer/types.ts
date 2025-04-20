export const noMetric = "noMetric";
export const linesOfCodeMetric = "linesOfCode";
export const charactersMetric = "characters";
export const dependenciesMetric = "dependencies";

export type TargetMetric =
  | typeof noMetric
  | typeof linesOfCodeMetric
  | typeof charactersMetric
  | typeof dependenciesMetric;

export interface NapiNodeData {
  id: string;
  position: { x: number; y: number };
  customData: {
    fileName: string;
    viewColors: {
      noMetric: string;
      linesOfCode: string;
      characters: string;
      dependencies: string;
    };
    metrics: {
      linesOfCodeCount: number;
      characterCount: number;
      symbolCount: number;
      dependencyCount: number;
    };
    errors: string[];
    warnings: string[];
    expanded: {
      label: string;
      width: number;
      height: number;
    };
    collapsed: {
      label: string;
      width: number;
      height: number;
    };
  };
}
