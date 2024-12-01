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

  // Sort the indexes based on startIndex (ascending)
  indexesToRemove.sort((a, b) => a.startIndex - b.startIndex);

  // Merge overlapping or contiguous ranges
  const mergedIndexes: { startIndex: number; endIndex: number }[] = [];
  for (const range of indexesToRemove) {
    const last = mergedIndexes[mergedIndexes.length - 1];
    if (last && range.startIndex <= last.endIndex) {
      // Merge the current range with the last range
      last.endIndex = Math.max(last.endIndex, range.endIndex);
    } else {
      // Add as a new range
      mergedIndexes.push({ ...range });
    }
  }

  // Sort to start removing from the end of the file
  mergedIndexes.sort((a, b) => b.startIndex - a.startIndex);

  mergedIndexes.forEach(({ startIndex, endIndex }) => {
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
