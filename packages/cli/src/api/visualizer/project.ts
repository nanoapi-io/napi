import z from "zod";
import path from "path";
import { localConfigSchema } from "../../config/localConfig";
import { ProjectOverview } from "../../visualizer/projectOverview";

export function getProjectOverview(
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const dir = path.dirname(napiConfig.entrypoint);

  const projectOverview = new ProjectOverview(dir, napiConfig);

  return { files: projectOverview.files };
}
