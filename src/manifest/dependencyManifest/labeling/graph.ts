import { Annotation, StateGraph } from "@langchain/langgraph";
import type { DependencyManifest } from "../types.ts";
import type { GroupLayer, SymbolRef } from "./types.ts";
import { symbolRefToKey } from "./grouping.ts";
import {
  type AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function getSymbolDependencyContextMessages(
  state: typeof workflowState.State,
  symbolRef: SymbolRef,
) {
  const symbolDependencyManifest =
    state.dependencyManifest[symbolRef.fileId].symbols[symbolRef.symbolId];

  const messages: HumanMessage[] = [];

  for (
    const fileDependency of Object.values(
      symbolDependencyManifest.dependencies,
    )
  ) {
    // First check if external
    if (fileDependency.isExternal) {
      const symbols = Object.values(fileDependency.symbols);
      if (symbols.length === 0) {
        messages.push(
          new HumanMessage(
            `External dependency from the following source: ${fileDependency.id}`,
          ),
        );
      } else {
        messages.push(
          new HumanMessage(
            `External dependency from the following source: ${fileDependency.id}
with the following symbols: ${symbols.join(", ")}`,
          ),
        );
      }
      continue;
    }

    const filedependencyManifest = state.dependencyManifest[fileDependency.id];
    for (const symbol of Object.values(fileDependency.symbols)) {
      const symbolDependencyManifest =
        state.dependencyManifest[fileDependency.id].symbols[symbol];
      // Then check if we have the symbol in the labelManifest
      if (filedependencyManifest) {
        const symbolDependencyManifest = filedependencyManifest.symbols[symbol];
        if (symbolDependencyManifest.description) {
          messages.push(
            new HumanMessage(
              `Dependency from the following source: ${fileDependency.id} with the following symbol: ${symbolDependencyManifest.id} (${symbolDependencyManifest.type})
Here is a brief description of this symbol: ${symbolDependencyManifest.description}`,
            ),
          );
          continue;
        }
      }

      // Last, check if we have the symbol in the notYetProcessedSymbolDescriptionMap
      const key = symbolRefToKey({
        fileId: fileDependency.id,
        symbolId: symbol,
      });
      const description = state.notYetProcessedSymbolDescriptionMap.get(key);
      if (description) {
        messages.push(
          new HumanMessage(
            `Dependency from the following source: ${fileDependency.id} with the following symbol: ${symbolDependencyManifest.id} (${symbolDependencyManifest.type})
Here is a brief description of this symbol: ${description}`,
          ),
        );
      }
    }
  }

  if (messages.length >= 1) {
    messages.unshift(
      new HumanMessage(
        "Next messages is a list of dependencies to the symbol you need to process as well as some information about each of them:",
      ),
    );
  }

  return messages;
}

function generateContentsMessages(
  state: typeof workflowState.State,
  symbolRef: SymbolRef,
) {
  const file = state.files.get(symbolRef.fileId);
  if (!file) {
    throw new Error(`File not found: ${symbolRef.fileId}`);
  }

  const symbolManifest =
    state.dependencyManifest[symbolRef.fileId].symbols[symbolRef.symbolId];

  const contents: string[] = [];
  for (const position of symbolManifest.positions) {
    const lines = file.content.split("\n");

    const symbolLines: string[] = [];
    // get content between startLine and endLine
    for (let i = position.start.row; i <= position.end.row; i++) {
      symbolLines.push(lines[i]);
    }

    const content = symbolLines.join("\n");

    contents.push(content);
  }

  const messages: HumanMessage[] = [];

  messages.push(
    new HumanMessage(
      `Here is the symbolRef of the symbol that you need to process: { fileId: ${symbolRef.fileId}, symbolId: ${symbolRef.symbolId} }`,
    ),
  );

  if (contents.length === 0) {
    messages.push(
      new HumanMessage(
        "The symbol that you need to process has no content.",
      ),
    );
  } else {
    messages.push(
      new HumanMessage(
        `The symbol that you need to process has content. Here is the content (${contents.length} parts):`,
      ),
    );
    for (const [index, content] of contents.entries()) {
      messages.push(
        new HumanMessage(
          `Part ${index + 1} of ${contents.length}: ${content}`,
        ),
      );
    }
  }

  return messages;
}

const workflowState = Annotation.Root({
  files: Annotation<Map<string, { path: string; content: string }>>,
  dependencyManifest: Annotation<DependencyManifest>,
  groupLayer: Annotation<GroupLayer>,
  notYetProcessedSymbolDescriptionMap: Annotation<Map<string, string>>,
  model: Annotation<BaseChatModel>,
  results: Annotation<{ symbolRef: SymbolRef; description: string }[]>,
});

export function createGroupSymbolLabelingWorkflow(
  files: Map<string, { path: string; content: string }>,
  dependencyManifest: DependencyManifest,
  groupLayer: GroupLayer,
  model: BaseChatModel,
) {
  function initNode(_state: typeof workflowState.State) {
    return {
      files,
      dependencyManifest,
      groupLayer,
      notYetProcessedSymbolDescriptionMap: new Map<string, string>(),
      model,
      results: [],
    };
  }

  async function generateDescriptionsForYetToBeProcessedSymbols(
    state: typeof workflowState.State,
  ) {
    if (state.groupLayer.symbolRefsToProcess.length === 0) {
      // no symbol yet to process
      // we have all the context needed in the labelManifest
      return state;
    }

    const messagesBatch: AIMessage[][] = [];

    for (const symbolRef of state.groupLayer.symbolRefsToProcess) {
      const messages = generateDescriptionMessagesForSymbol(
        state,
        symbolRef,
      );
      messagesBatch.push(messages);
    }

    const schema = z.object({
      symbolRef: z.object({
        fileId: z.string().describe("The id of the file."),
        symbolId: z.string().describe("The id of the symbol."),
      }),
      description: z.string().max(500).describe(
        "A short description of what the symbol is doing.",
      ),
    });

    const results = await (model as BaseChatModel).withStructuredOutput(schema)
      .batch(messagesBatch) as z.infer<typeof schema>[];

    for (const result of results) {
      const key = symbolRefToKey(result.symbolRef);
      const description = result.description;
      state.notYetProcessedSymbolDescriptionMap.set(key, description);
    }

    return state;
  }

  function generateDescriptionMessagesForSymbol(
    state: typeof workflowState.State,
    symbolRef: SymbolRef,
  ) {
    const messages: AIMessage[] = [];
    messages.push(
      new SystemMessage(
        "You are a helpful assistant that generates a short description of what the symbol (class, function, etc.) is doing.",
      ),
    );

    const symbolDependencyMessages = getSymbolDependencyContextMessages(
      state,
      symbolRef,
    );
    for (const message of symbolDependencyMessages) {
      messages.push(message);
    }

    const symbolContentsMessages = generateContentsMessages(
      state,
      symbolRef,
    );
    for (const message of symbolContentsMessages) {
      messages.push(message);
    }

    return messages;
  }

  async function generateLabels(
    state: typeof workflowState.State,
  ) {
    const messagesBatch: AIMessage[][] = [];

    for (const symbolRef of state.groupLayer.symbolRefsToProcess) {
      const messages = generateMessagesForLabelingSymbol(state, symbolRef);
      messagesBatch.push(messages);
    }

    const schema = z.object({
      symbolRef: z.object({
        fileId: z.string().describe("The id of the file."),
        symbolId: z.string().describe("The id of the symbol."),
      }),
      description: z.string().describe(
        "A business focused description of what the symbol is doing (max 500 char).",
      ),
    });

    const results = await (model as BaseChatModel).withStructuredOutput(schema)
      .batch(messagesBatch) as z.infer<typeof schema>[];

    for (const result of results) {
      state.results.push(result);
    }

    return state;
  }

  function generateMessagesForLabelingSymbol(
    state: typeof workflowState.State,
    symbolRef: SymbolRef,
  ) {
    const messages: AIMessage[] = [];
    messages.push(
      new SystemMessage(
        "You are a helpful assistant that generates labels for a symbol (class, function, etc.).",
      ),
    );

    const symbolDependencyMessages = getSymbolDependencyContextMessages(
      state,
      symbolRef,
    );
    for (const message of symbolDependencyMessages) {
      messages.push(message);
    }

    const symbolContentsMessages = generateContentsMessages(
      state,
      symbolRef,
    );
    for (const message of symbolContentsMessages) {
      messages.push(message);
    }

    return messages;
  }

  const workflow = new StateGraph(workflowState).addNode("init", initNode)
    // nodes
    .addNode(
      "generateDescriptionsForYetToBeProcessedSymbols",
      generateDescriptionsForYetToBeProcessedSymbols,
    )
    .addNode("generateLabels", generateLabels)
    // edges
    .addEdge("__start__", "init")
    .addEdge("init", "generateDescriptionsForYetToBeProcessedSymbols")
    .addEdge(
      "generateDescriptionsForYetToBeProcessedSymbols",
      "generateLabels",
    )
    .addEdge("generateLabels", "__end__");

  return workflow.compile();
}
