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
    metricsColors: {
      [metricLinesCount]: string;
      [metricCodeLineCount]: string;
      [metricCodeCharacterCount]: string;
      [metricCharacterCount]: string;
      [metricDependencyCount]: string;
      [metricDependentCount]: string;
      [metricCyclomaticComplexity]: string;
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
