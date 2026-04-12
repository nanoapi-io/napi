export const classSymbolType = "class";
export const structSymbolType = "struct";
export const enumSymbolType = "enum";
export const unionSymbolType = "union";
export const typedefSymbolType = "typedef";
export const interfaceSymbolType = "interface";
export const recordSymbolType = "record";
export const delegateSymbolType = "delegate";
export const functionSymbolType = "function";
export const variableSymbolType = "variable";

export type SymbolType =
  | typeof classSymbolType
  | typeof functionSymbolType
  | typeof variableSymbolType
  | typeof structSymbolType
  | typeof enumSymbolType
  | typeof unionSymbolType
  | typeof typedefSymbolType
  | typeof interfaceSymbolType
  | typeof recordSymbolType
  | typeof delegateSymbolType;

// Aliases used by cytoscape code
export const symbolTypeClass = classSymbolType;
export const symbolTypeStruct = structSymbolType;
export const symbolTypeEnum = enumSymbolType;
export const symbolTypeUnion = unionSymbolType;
export const symbolTypeTypedef = typedefSymbolType;
export const symbolTypeInterface = interfaceSymbolType;
export const symbolTypeRecord = recordSymbolType;
export const symbolTypeDelegate = delegateSymbolType;
export const symbolTypeFunction = functionSymbolType;
export const symbolTypeVariable = variableSymbolType;

export const metricLinesCount = "linesCount";
export const metricCodeLineCount = "codeLineCount";
export const metricCharacterCount = "characterCount";
export const metricCodeCharacterCount = "codeCharacterCount";
export const metricDependencyCount = "dependencyCount";
export const metricDependentCount = "dependentCount";
export const metricCyclomaticComplexity = "cyclomaticComplexity";

export type Metric =
  | typeof metricLinesCount
  | typeof metricCodeLineCount
  | typeof metricCharacterCount
  | typeof metricCodeCharacterCount
  | typeof metricDependencyCount
  | typeof metricDependentCount
  | typeof metricCyclomaticComplexity;

export interface DependencyInfo {
  id: string;
  isExternal: boolean;
  symbols: Record<string, string>;
}

export interface DependentInfo {
  id: string;
  symbols: Record<string, string>;
}

export interface SymbolDependencyManifest {
  id: string;
  type: SymbolType;
  positions: {
    start: { index: number; row: number; column: number };
    end: { index: number; row: number; column: number };
  }[];
  metrics: {
    [metricLinesCount]: number;
    [metricCodeLineCount]: number;
    [metricCharacterCount]: number;
    [metricCodeCharacterCount]: number;
    [metricDependencyCount]: number;
    [metricDependentCount]: number;
    [metricCyclomaticComplexity]: number;
  };
  description: string;
  dependencies: Record<string, DependencyInfo>;
  dependents: Record<string, DependentInfo>;
}

export interface FileDependencyManifest {
  id: string;
  filePath: string;
  language: string;
  metrics: {
    [metricLinesCount]: number;
    [metricCodeLineCount]: number;
    [metricCharacterCount]: number;
    [metricCodeCharacterCount]: number;
    [metricDependencyCount]: number;
    [metricDependentCount]: number;
    [metricCyclomaticComplexity]: number;
  };
  dependencies: Record<string, DependencyInfo>;
  dependents: Record<string, DependentInfo>;
  symbols: Record<string, SymbolDependencyManifest>;
}

export type DependencyManifest = Record<string, FileDependencyManifest>;

// V1 alias used by some cytoscape code
export type DependencyManifestV1 = DependencyManifest;
