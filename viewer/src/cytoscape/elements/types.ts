import * as dependencyManifestTypes from "../../types/dependencyManifest";

export interface NapiNodeData {
  id: string;
  position: { x: number; y: number };
  metricsSeverity: {
    [dependencyManifestTypes.metricLinesCount]: number;
    [dependencyManifestTypes.metricCodeLineCount]: number;
    [dependencyManifestTypes.metricCodeCharacterCount]: number;
    [dependencyManifestTypes.metricCharacterCount]: number;
    [dependencyManifestTypes.metricDependencyCount]: number;
    [dependencyManifestTypes.metricDependentCount]: number;
    [dependencyManifestTypes.metricCyclomaticComplexity]: number;
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
}

export interface FileNapiNodeData extends NapiNodeData {
  fileName: string;
  isExternal: boolean;
}

export interface SymbolNapiNodeData extends NapiNodeData {
  fileName: string;
  isExternal: boolean;
  symbolName: string;
  symbolType: string;
}
