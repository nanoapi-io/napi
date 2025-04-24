import {
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "@nanoapi.io/shared";

export interface NapiNodeData {
  id: string;
  position: { x: number; y: number };
  customData: {
    fileName: string;
    symbolName: string;
    symbolType: string;
    isExternal: boolean;
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

export const edgeTypeDependency = "dependency";
export const edgeTypeDependent = "dependent";

export interface NapiEdgeData {
  id: string;
  source: string;
  target: string;
  customData: {
    type: typeof edgeTypeDependency | typeof edgeTypeDependent;
  };
}
