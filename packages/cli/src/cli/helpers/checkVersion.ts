import localPackageJson from "../../../../../deno.json" with { type: "json" };
import process from "node:process";
import { Octokit } from "octokit";

export async function checkVersionMiddleware() {
  const currentVersion = localPackageJson.version;

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
Please update to the latest version.

You can update the version by running one of the following commands:

You can get the latest version here: ${release.data.html_url}
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
