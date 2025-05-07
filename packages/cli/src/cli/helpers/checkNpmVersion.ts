import localPackageJson from "../../../deno.json" with { type: "json" };
import process from "node:process";

export async function checkVersionMiddleware() {
  const currentVersion = localPackageJson.version;
  let latestVersion: string;

  const packageName = "@nanoapi.io/napi";

  try {
    const response = await fetch(
      `https://registry.npmjs.org/${packageName}/latest`,
    );
    if (!response.ok) {
      console.warn(
        "Failed to fetch latest version from npm, ignoring version check",
      );
    }

    const latestPackageJson: { version: string } = await response.json();

    latestVersion = latestPackageJson.version;
  } catch (err) {
    console.warn(
      `Failed to fetch latest version from npm, ignoring version check. Error: ${err}`,
    );
    return;
  }

  if (currentVersion !== latestVersion) {
    console.error(
      `
You are using version ${currentVersion} of ${packageName}. 
The latest version is ${latestVersion}. 
Please update to the latest version.

You can update the version by running one of the following commands:

npm:   npm install -g ${packageName}@latest
npx:   npx ${packageName}@latest
yarn:  yarn global add ${packageName}@latest
pnpm:  pnpm add -g ${packageName}@latest
      `,
    );
    process.exit(1);
  }
}
