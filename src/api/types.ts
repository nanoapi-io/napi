export type Endpoint = {
  method: string;
  path: string;
  group?: string;
  dependencies: string[];
};

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
};

export type SplitCodebaseResponsePayload = {
  success: boolean;
};
