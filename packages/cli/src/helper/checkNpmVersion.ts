import localPackageJson from "../../package.json";

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
    console.warn(
      `You are using version ${currentVersion} of ${localPackageJson.name}. ` +
        `The latest version is ${latestVersion}. Please update to the latest version.`,
    );
    process.exit(1);
  }
}
