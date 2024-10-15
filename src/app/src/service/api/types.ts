export type Endpoint = {
  method: string;
  path: string;
  group?: string;
  dependencies: string[];
};
