export enum ViewNames {
  PROJECT = "project",
  FILE = "file",
  INSTANCE = "instance",
  NOT_FOUND = "not_found",
}

// Needed because react-router doesn't type UIMatch correctly
export interface RouteHandle {
  viewName: ViewNames;
}
