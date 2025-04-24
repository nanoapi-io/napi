import {
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "@napi/shared";

export interface NapiNodeData {
  id: string;
  position: { x: number; y: number };
  customData: {
    fileName: string;
    metricsSeverity: {
      [metricLinesCount]: number;
      [metricCodeLineCount]: number;
      [metricCodeCharacterCount]: number;
      [metricCharacterCount]: number;
      [metricDependencyCount]: number;
      [metricDependentCount]: number;
      [metricCyclomaticComplexity]: number;
    };
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
