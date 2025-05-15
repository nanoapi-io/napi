import localPackageJson from "../../../../../deno.json" with { type: "json" };
import process from "node:process";
import { Octokit } from "npm:octokit";

export function getCurrentVersion() {
  return localPackageJson.version;
}

export async function checkVersionMiddleware() {
  const currentVersion = getCurrentVersion();

  const owner = "nanoapi-io";
  const repo = "napi";

  const octokit = new Octokit();

  try {
    const release = await octokit.rest.repos.getLatestRelease({
      owner,
      repo,
    });

    const tagName = release.data.tag_name;

    const latestVersion = tagName.replace(/^v/, "");

    if (currentVersion !== latestVersion) {
      console.error(
        `
You are using version ${currentVersion}. 
The latest version is ${latestVersion}. 
Please update to the latest version to continue using napi.

You can update the version by running the following command:

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/nanoapi-io/napi/refs/heads/main/install_scripts/install.sh | bash
\`\`\`

Or you can download and install them manually from here:
${release.data.html_url}
      `,
      );
      process.exit(1);
    }
  } catch (err) {
    console.warn(
      `Failed to fetch latest version, ignoring version check. Error: ${err}`,
    );
  }
}
