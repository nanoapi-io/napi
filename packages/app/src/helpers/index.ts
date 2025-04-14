export const defaultMaxPathLength = 25;

export function getDisplayedPath(
  path: string,
  maxPathLength: number = defaultMaxPathLength,
) {
  if (path.length > maxPathLength) {
    return `...${path.slice(-maxPathLength)}`;
  }

  return path;
}
