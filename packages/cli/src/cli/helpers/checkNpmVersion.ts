import localPackageJson from "../../../package.json" with { type: "json" };

export async function checkVersionMiddleware() {
  const currentVersion = localPackageJson.version;
  let latestVersion: string;

  try {
    const response = await fetch(
      `https://registry.npmjs.org/${localPackageJson.name}/latest`,
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
You are using version ${currentVersion} of ${localPackageJson.name}. 
The latest version is ${latestVersion}. 
Please update to the latest version.

You can update the version by running one of the following commands:

npm:   npm install -g ${localPackageJson.name}@latest
npx:   npx ${localPackageJson.name}@latest
yarn:  yarn global add ${localPackageJson.name}@latest
pnpm:  pnpm add -g ${localPackageJson.name}@latest
      `,
    );
    process.exit(1);
  }
}
