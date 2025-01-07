import { VisualizerFile } from "./types";

export async function getProjectOverview() {
  const response = await fetch("/api/visualizer/project", {
    method: "GET",
  });

  if (!response.ok || response.status !== 200) {
    throw new Error("Failed to get project overview");
  }

  const responseBody = (await response.json()) as Promise<{
    files: VisualizerFile[];
  }>;

  return await responseBody;
}
