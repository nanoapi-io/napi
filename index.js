import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { Compiler } from "./src/file-operations.js";
import { getEntrypointPath } from "./src/utils.js";

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 <path>")
  .example(
    "$0 ./test-api/api.js",
    "Generate nano-api files from api.js by specifying the path to the entrypoint file."
  )
  .demandCommand(1, "Please specify the path to the entrypoint file.")
  .help()
  .alias("help", "h").argv;

// main execution
(async () => {
	let entrypointPath = argv._[0];
	if (!entrypointPath.endsWith(".js")) {
		entrypointPath = await getEntrypointPath(entrypointPath);
	}

	const compiler = new Compiler(entrypointPath);
	compiler.compile();
})();
