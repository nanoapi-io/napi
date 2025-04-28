import { useMatches } from "react-router";
import { ViewNames, RouteHandle } from "./types.js";

export function useCurrentViewName(): ViewNames {
  const matches = useMatches();
  if (!matches || matches.length === 0) {
    return undefined;
  }

  const currentMatch = matches[matches.length - 1];
  if (!currentMatch) {
    return undefined;
  }

  const handle = currentMatch.handle as RouteHandle;

  return handle.viewName;
}
