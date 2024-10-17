export interface Endpoint {
  path: string;
  method?: string;
  group?: string;
  filePath: string;
  parentFilePaths: string[];
  childrenFilePaths: string[];
}

export interface NanoAPIAnnotation {
  path: string;
  method?: string;
  group?: string;
}

export interface Dependencies {
  [key: string]: Dependencies;
}
