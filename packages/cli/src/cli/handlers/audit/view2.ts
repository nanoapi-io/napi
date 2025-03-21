import yargs from "yargs";
import { globalOptions } from "../../helpers/options";
import { getConfigFromWorkDir } from "../../../config/localConfig";
import { generateAuditResponse } from "../../../api/audit/service";

async function handler(
  argv: yargs.ArgumentsCamelCase<
    yargs.InferredOptionTypes<typeof globalOptions>
  >,
) {
  console.time("run");
  const napiConfig = getConfigFromWorkDir(argv.workdir);

  if (!napiConfig) {
    console.error("Missing .napirc file in project. Run `napi init` first");

    return;
  }

  const response = generateAuditResponse(argv.workdir, napiConfig);

  console.log(JSON.stringify(response.dependencyManifesto, null, 2));

  console.timeEnd("run");
}

export default {
  command: "view2",
  describe: "Audit your program with the UI",
  builder: {},
  handler,
};
