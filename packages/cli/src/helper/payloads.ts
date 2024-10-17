import { Endpoint } from "./types";

export interface ScanCodebaseRequestPayload {
  entrypointPath: string;
  targetDir?: string;
}

export interface ScanCodebaseResponsePayload {
  endpoints: Endpoint[];
}

export interface GroupEndpointsRequestPayload {
  entrypointPath: string;
  targetDir?: string;
  groups: { name: string; endpoints: { method: string; path: string }[] }[];
}

export interface GroupEndpointsResponsePayload {
  success: boolean;
}

export interface SplitCodebaseRequestPayload {
  entrypointPath: string;
  targetDir?: string;
  outputDir?: string;
}

export interface SplitCodebaseResponsePayload {
  endpoints: Endpoint[];
  success: boolean;
}
