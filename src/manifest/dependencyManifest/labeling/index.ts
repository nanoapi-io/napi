import type { DependencyManifest } from "../types.ts";
import { getModel, type ModelProvider } from "./model.ts";
import { generateGroupLayers } from "./grouping.ts";
import { createGroupSymbolLabelingWorkflow } from "./graph.ts";

export async function generateSymbolDescriptions(
  files: Map<string, { path: string; content: string }>,
  dependencyManifest: DependencyManifest,
  apiKey: string,
  modelProvider: ModelProvider,
  maxConcurrency?: number,
): Promise<DependencyManifest> {
  console.info("Generating descriptions for symbols...");

  const groups = generateGroupLayers(dependencyManifest);

  console.info(`✅ Successfully generated ${groups.length} independent groups`);

  const model = getModel(modelProvider, apiKey, maxConcurrency);

  console.info("Starting symbol labeling...");
  for (const [index, group] of groups.entries()) {
    const workflow = createGroupSymbolLabelingWorkflow(
      files,
      dependencyManifest,
      group,
      model,
    );

    const state = await workflow.invoke({});
    for (const result of state.results) {
      dependencyManifest[result.symbolRef.fileId].symbols[
        result.symbolRef.symbolId
      ].description = result.description;
    }

    console.info(
      `✅ Successfully processed group ${
        index + 1
      } of ${groups.length} groups. ${group.symbolRefsToProcess.length} symbols processed`,
    );
  }

  return dependencyManifest;
}
