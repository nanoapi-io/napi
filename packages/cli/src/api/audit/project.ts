import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { ProjectOverview } from "../../audit/projectOverview";

export function getProjectOverview(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const projectOverview = new ProjectOverview(workDir, napiConfig);

  return { files: projectOverview.files };
}
