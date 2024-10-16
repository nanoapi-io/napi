export type Dependencies = {
  handlerFile: string;
  parentFiles: string[];
  childrenFiles: string[];
};

export type Endpoint = {
  method: string;
  path: string;
  group?: string;
  dependencies: Dependencies;
};
