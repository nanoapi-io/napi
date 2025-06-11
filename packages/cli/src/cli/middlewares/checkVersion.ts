import type { Arguments } from "yargs-types";
import localPackageJson from "../../../../../deno.json" with { type: "json" };

export function getCurrentVersion() {
  return localPackageJson.version;
}

export async function checkVersionMiddleware(_args: Arguments) {
  const currentVersion = getCurrentVersion();

  try {
    // Simple fetch with timeout to prevent blocking
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      "https://api.github.com/repos/nanoapi-io/napi/releases/latest",
      {
        signal: controller.signal,
        headers: { "Accept": "application/vnd.github.v3+json" },
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `GitHub API returned ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    const latestVersion = data.tag_name.replace(/^v/, "");

    if (currentVersion !== latestVersion) {
      console.warn(
        `
You are using version ${currentVersion}.
The latest version is ${latestVersion}.
Please update to the latest version to continue using napi.

You can update the version by running the following command:

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/nanoapi-io/napi/refs/heads/main/install_scripts/install.sh | bash
\`\`\`

Or you can download and install them manually from here:
${data.html_url}
      `,
      );
      // Force the user to update to the latest version
      Deno.exit(1);
    }
  } catch (err) {
    console.warn(
      `Skipping version check. Failed to check for updates: ${
        err instanceof Error ? err.message : "Unknown error"
      }`,
    );
    // Continue execution without blocking
  }
}
