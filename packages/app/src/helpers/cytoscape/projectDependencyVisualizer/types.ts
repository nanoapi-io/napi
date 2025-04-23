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
    metrics: {
      codeLineCount: {
        value: number;
        target: number;
        color: string;
      };
      lineCount: {
        value: number;
        target: number;
        color: string;
      };
      maxCodeChar: {
        value: number;
        target: number;
        color: string;
      };
      charCount: {
        value: number;
        target: number;
        color: string;
      };
      dependencyCount: {
        value: number;
        target: number;
        color: string;
      };
      dependentCount: {
        value: number;
        target: number;
        color: string;
      };
      cyclomaticComplexity: {
        value: number;
        target: number;
        color: string;
      };
    };
    alertMessage: string[];
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
