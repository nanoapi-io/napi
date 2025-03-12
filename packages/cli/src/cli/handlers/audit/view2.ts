import yargs from "yargs";
import { globalOptions } from "../../helpers/options";
import { getConfigFromWorkDir } from "../../../config/localConfig";
import { globSync } from "glob";
import { PythonAuditManifesto } from "../../../dependencyExtractor/python/auditManifesto";

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

  const filePaths = globSync(napiConfig.audit?.include || ["**"], {
    cwd: argv.workdir,
    nodir: true,
    ignore: napiConfig.audit?.exclude || [],
  });

  const pythonAuditManifesto = new PythonAuditManifesto(
    argv.workdir,
    filePaths,
  );

  pythonAuditManifesto.run();
  console.timeEnd("run");
}

export default {
  command: "view2",
  describe: "Audit your program with the UI",
  builder: {},
  handler,
};
