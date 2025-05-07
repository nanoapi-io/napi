import { useMatches } from "react-router";
import type { RouteHandle, ViewNames } from "./types.ts";

export function useCurrentViewName(): ViewNames {
  const matches = useMatches();
  if (!matches || matches.length === 0) {
    throw new Error("No matches found");
  }

  const currentMatch = matches[matches.length - 1];
  if (!currentMatch) {
    throw new Error("No current match found");
  }

  const handle = currentMatch.handle as RouteHandle;

  return handle.viewName;
}
