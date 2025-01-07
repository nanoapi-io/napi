import fs from "fs";
import DependencyTreeManager from "../../dependencyManager/dependencyManager";
import OpenAI from "openai";
import { getLanguagePlugin } from "../../languagesPlugins";
import { File } from "../../splitRunner/types";
import { removeIndexesFromSourceCode } from "../../helpers/file";
import prompts from "prompts";
import yargs, { PositionalOptionsType } from "yargs";
import { globalOptions } from "../helpers/options";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import {
  getConfigFromWorkDir,
  getOpenaiApiKeyFromConfig,
} from "../../config/localConfig";

function removeAllAnnotations(entryPointPath: string, files: File[]) {
  const updatedFiles = files.map((file) => {
    const plugin = getLanguagePlugin(entryPointPath, file.path);

    const tree = plugin.parser.parse(file.sourceCode);

    const annotationsNodes = plugin.getAnnotationNodes(tree.rootNode);

    const indexesToRemove = annotationsNodes.map((node) => {
      return {
        startIndex: node.startIndex,
        endIndex: node.endIndex,
      };
    });

    const newSourceCode = removeIndexesFromSourceCode(
      file.sourceCode,
      indexesToRemove,
    );

    return {
      ...file,
      sourceCode: newSourceCode,
    };
  });

  return updatedFiles;
}

async function annotateOpenAICommandHandler(
  entrypoint: string, // Path to the entrypoint file
  openAIApiKey: string, // OpenAI API key
) {
  const response = await prompts({
    type: "confirm",
    name: "confirm",
    message: `This process will remove all existing annotations and generate new ones. Do you want to proceed?`,
    initial: false,
  });
  if (!response.confirm) {
    return;
  }

  console.info("Annotating program...");
  const dependencyTreeManager = new DependencyTreeManager(entrypoint);

  let files = dependencyTreeManager.getFiles();

  files = removeAllAnnotations(entrypoint, files);

  const openAIConfig = {
    apiKey: openAIApiKey,
  };
  const openAIClient = new OpenAI(openAIConfig);

  const filesContent = JSON.stringify(
    files.map((file) => {
      return {
        path: file.path,
        content: file.sourceCode,
      };
    }),
    null,
    2,
  );

  const chatCompletion = await openAIClient.chat.completions.create({
    model: "o1-preview",
    messages: [
      {
        role: "user",
        content: `
        Add annotations as a comment above each block of code that handle an API call.
        Do it only for where the API endpoints are registered (final endpoint, but also any middleware that handle the request).
        You are not allowed to modify the code or add comments other than the annotations.
        The annotations should be in the following format (as a comment, use the correct comment syntax for the language of the file):
        @nanoapi method:GET path:api/v1/endpoint
        Replace "method" with CRUD operation used in the endpoint. If there is no method then omit it.
        Replace "path" by the full path of the API. Dynamic parts of the path should be in the following format: "path:api/v1/<id>".
        Respond in the same format as the user input. With no markdown formatting.
        `,
      },
      {
        role: "user",
        content: filesContent,
      },
    ],
  });
  const responseContent = chatCompletion.choices[0].message.content as string;

  const annotatedContent: {
    path: string;
    content: string;
  }[] = JSON.parse(responseContent);

  annotatedContent.forEach((annotatedFile) => {
    const file = files.find((file) => file.path === annotatedFile.path);
    if (!file) {
      throw new Error(`File ${annotatedFile.path} not found`);
    }

    file.sourceCode = annotatedFile.content;
  });

  files.forEach((file) => {
    fs.writeFileSync(file.path, file.sourceCode, "utf-8");
  });

  console.info(
    "Annotation complete. OpenAI can make mistakes, so please review the annotations.",
  );
}

const builder = {
  apiKey: {
    type: "string" as PositionalOptionsType,
    default: "",
    alias: "k",
    description: "OpenAI API key",
  },
};

function handler(
  argv: yargs.ArgumentsCamelCase<
    yargs.InferredOptionTypes<typeof globalOptions & typeof builder>
  >,
) {
  const startTime = Date.now();
  trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
    message: "Annotate command started",
  });
  const napiConfig = getConfigFromWorkDir(argv.workdir);

  if (!napiConfig) {
    console.error("Missing .napirc file in project. Run `napi init` first");
    trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
      message: "Annotate command failed, missing .napirc file",
      duration: Date.now() - startTime,
    });
    return;
  }

  let apiKey: string | undefined;
  if (argv.apiKey) {
    apiKey = argv.apiKey;
  } else if (napiConfig) {
    apiKey = getOpenaiApiKeyFromConfig(argv.workdir, napiConfig);
  }

  if (!apiKey) {
    console.error(
      "Missing OpenAI API key. Please provide it via --apiKey or in a .napirc file using 'openaiApiKey' or 'openaiApiKeyFilePath'",
    );
    trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
      message: "Annotate command failed, missing OpenAI API key",
      duration: Date.now() - startTime,
    });
    return;
  }

  try {
    annotateOpenAICommandHandler(napiConfig.entrypoint, apiKey);
    trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
      message: "Annotate command finished",
      duration: Date.now() - startTime,
    });
  } catch (error) {
    trackEvent(TelemetryEvents.ANNOTATE_COMMAND, {
      message: "Annotate command error",
      duration: Date.now() - startTime,
      error: error,
    });
  }
}

export default {
  command: "annotate openai",
  describe: "Annotate a program, needed for splitting",
  builder,
  handler,
};
