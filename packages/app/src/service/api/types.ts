export interface Endpoint {
  path: string;
  method: string;
  group?: string;
  filePath: string;
  parentFilePaths: string[];
  childrenFilePaths: string[];
}

export const classAuditInstanceType = "class";
export const functionAuditInstanceType = "function";
export const variableAuditInstanceType = "variable";

/**
 * Possible categories of an instance within a file: class/function/variable.
 */
export type AuditInstanceType =
  | typeof classAuditInstanceType
  | typeof functionAuditInstanceType
  | typeof variableAuditInstanceType;

/**
 * Describes a file-level dependency (one file → another),
 * potentially with a list of known instances in the target file.
 */
export interface AuditFileDependency {
  isExternal: boolean; // true if this references an external source (e.g., "npm:lodash")
  fileId: string; // unique ID for the target file
  path: string; // path or identifier of the target file
  instances: {
    id: string; // ID of a target instance in that file
    isUsed: boolean; // whether this file actually uses that instance
  }[];
}

/**
 * Describes how a single instance references instances in another file.
 */
export interface AuditInstanceReference {
  isExternal: boolean; // true if referencing an external source
  fileId: string; // target file's unique ID
  path: string; // target file's path/name
  instanceIds: string[]; // IDs of target instances used by this instance
}

/**
 * Represents one exported entity (class/function/variable) in a file,
 * including both forward and reverse references to other instances.
 */
export interface AuditInstance {
  id: string; // unique ID within this file
  name: string; // display name, e.g., class or function name
  type: AuditInstanceType; // "class", "function", or "variable"

  // Forward references to other files' instances, keyed by the target file ID
  dependenciesMap: Record<string, AuditInstanceReference>;

  // Reverse references from other files' instances, keyed by their file ID
  dependentsMap: Record<string, AuditInstanceReference>;

  // Overall instance analysis (chars, lines, dependencies, etc.)
  auditResults: AuditResult[];
}

export const auditAnalysisResultOk = "ok";
export const auditAnalysisResultWarning = "warning";
export const auditAnalysisResultError = "error";

/**
 * Possible outcomes for an audit check (ok, warning, or error).
 */
export type AuditAnalysisResult =
  | typeof auditAnalysisResultOk
  | typeof auditAnalysisResultWarning
  | typeof auditAnalysisResultError;

/**
 * Represents the result of a single audit check, including the computed
 * value, target threshold, and a message to display.
 */
export interface AuditResult {
  name: string; // name of the analysis check
  value: string; // actual computed value
  target: string; // desired threshold
  result: AuditAnalysisResult; // "ok", "warning", or "error"
  message: {
    short: string; // short message to display
    long: string; // longer explanation or suggestion
  };
}

/**
 * Represents one file in the project, including file-level dependencies,
 * exported instances, and audit analysis results.
 */
export interface AuditFile {
  id: string; // unique file ID, e.g., path or hash
  path: string; // file path/name
  isUnknown: boolean; // true if the file couldn't be parsed

  // File-level dependencies, keyed by the target file ID
  dependenciesMap: Record<string, AuditFileDependency>;

  // Exported instances, keyed by their instance ID
  instances: Record<string, AuditInstance>;

  // Overall file analysis (chars, lines, etc.)
  auditResults: AuditResult[];
}

/**
 * The global structure mapping each file ID to its AuditFile.
 */
export type AuditMap = Record<string, AuditFile>;
