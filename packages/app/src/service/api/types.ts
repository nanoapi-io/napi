export interface Endpoint {
  path: string;
  method: string;
  group?: string;
  filePath: string;
  parentFilePaths: string[];
  childrenFilePaths: string[];
}

export interface VisualizerFile {
  path: string;
  sourceCode: string;
  importSources: string[];
}
