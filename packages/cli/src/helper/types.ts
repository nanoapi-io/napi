export interface Endpoint {
  path: string;
  method?: string;
  group?: string;
  filePath: string;
  parentFilePaths: string[];
  childrenFilePaths: string[];
}

export interface Group {
  name: string;
  endpoints: Endpoint[];
}

export type GroupMap = Record<number, Group>;

export interface NanoAPIAnnotation {
  path: string;
  method?: string;
  group?: string;
}

export interface DependencyTree {
  path: string;
  sourceCode: string;
  children: DependencyTree[];
}
