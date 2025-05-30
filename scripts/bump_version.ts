import path from "node:path";

const releaseType: string = Deno.args[0];
if (
  !releaseType ||
  releaseType !== "patch" && releaseType !== "minor" && releaseType !== "major"
) {
  console.error("Invalid release type");
  Deno.exit(1);
}

const denoJsonPath = path.resolve(
  import.meta.dirname as string,
  "..",
  "deno.json",
);
const denoJson = JSON.parse(await Deno.readTextFile(denoJsonPath)) as {
  version: string;
};

const [major, minor, patch] = denoJson.version.split(".").map(Number);

let newVersion: string;

if (releaseType === "patch") {
  newVersion = `${major}.${minor}.${patch + 1}`;
} else if (releaseType === "minor") {
  newVersion = `${major}.${minor + 1}.0`;
} else {
  newVersion = `${major + 1}.0.0`;
}

denoJson.version = newVersion;

await Deno.writeTextFile(
  denoJsonPath,
  JSON.stringify(denoJson, null, 2) + "\n",
);

console.log(newVersion);
Deno.exit(0);
