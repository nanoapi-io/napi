export interface NanoAPIAnnotation {
  method: string;
  path: string;
  filePaths: string[];
}

export interface Dependencies {
  [key: string]: Dependencies;
}
