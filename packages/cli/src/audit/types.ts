export interface AuditFile {
  path: string;
  sourceCode: string;
  importSources: string[];
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
    isUnused: boolean;
    circularDependencySources: string[];
  };
}
