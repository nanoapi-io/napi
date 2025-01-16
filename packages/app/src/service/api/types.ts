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
  isUnused: boolean;
  circularDependencySources: string[];
  analysis: {
    tooManyChar: {
      value: number;
      target: number;
      result: "ok" | "warning" | "error";
    };
    tooManyLines: {
      value: number;
      target: number;
      result: "ok" | "warning" | "error";
    };
    tooManyDependencies: {
      value: number;
      target: number;
      result: "ok" | "warning" | "error";
    };
  };
}
