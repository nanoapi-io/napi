import { getDependencyTree } from "../helper/dependencies";

export function annotateCommandHandler(
  entrypoint: string, // Path to the entrypoint file
  targetDir: string, // Path to the target directory
) {
  console.log("Annotating program...");
  console.log(targetDir);
  const tree = getDependencyTree(entrypoint);

  console.log(tree);
}
