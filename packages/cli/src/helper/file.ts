import fs from "fs";

export function cleanupOutputDir(outputDir: string) {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
}

export function createOutputDir(outputDir: string) {
  fs.mkdirSync(outputDir, { recursive: true });
}

export function removeIndexesFromSourceCode(
  sourceCode: string,
  indexesToRemove: { startIndex: number; endIndex: number }[],
) {
  let newSourceCode = sourceCode;

  // sort to start removing from the of the file end
  indexesToRemove.sort((a, b) => b.startIndex - a.startIndex);

  indexesToRemove.forEach(({ startIndex, endIndex }) => {
    newSourceCode =
      newSourceCode.slice(0, startIndex) + newSourceCode.slice(endIndex);
  });

  return newSourceCode;
}

export function replaceIndexesFromSourceCode(
  sourceCode: string,
  indexesToReplace: { startIndex: number; endIndex: number; text: string }[],
) {
  // sort to start removing from the end of the file
  indexesToReplace.sort((a, b) => b.startIndex - a.startIndex);

  indexesToReplace.forEach(({ startIndex, endIndex, text }) => {
    sourceCode =
      sourceCode.slice(0, startIndex) + text + sourceCode.slice(endIndex);
  });

  return sourceCode;
}
