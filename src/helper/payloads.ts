import { Endpoint } from "./types";

export type ScanCodebaseRequestPayload = {
  entrypointPath: string;
  targetDir?: string;
};

export type ScanCodebaseResponsePayload = {
  endpoints: Endpoint[];
};

export type GroupEndpointsRequestPayload = {
  entrypointPath: string;
  targetDir?: string;
  groups: { name: string; endpoints: { method: string; path: string }[] }[];
};

export type GroupEndpointsResponsePayload = {
  success: boolean;
};

export type SplitCodebaseRequestPayload = {
  entrypointPath: string;
  targetDir?: string;
  outputDir?: string;
};

export type SplitCodebaseResponsePayload = {
  endpoints: Endpoint[];
  success: boolean;
};
