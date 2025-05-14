import { Buffer } from "node:buffer";

export function removeIndexesFromSourceCode(
  sourceCode: string,
  indexesToRemove: { startIndex: number; endIndex: number }[],
): string {
  // Sort ranges in ascending order by startIndex.
  indexesToRemove.sort((a, b) => a.startIndex - b.startIndex);

  // Merge overlapping or contiguous ranges.
  const mergedRanges: { startIndex: number; endIndex: number }[] = [];
  for (const range of indexesToRemove) {
    const last = mergedRanges[mergedRanges.length - 1];
    if (last && range.startIndex <= last.endIndex) {
      // Merge overlapping or contiguous ranges.
      last.endIndex = Math.max(last.endIndex, range.endIndex);
    } else {
      mergedRanges.push({ ...range });
    }
  }

  // Convert the source string to a Buffer (UTF-8 encoded).
  const buffer = Buffer.from(sourceCode, "utf-8");
  const resultBuffers: Buffer[] = [];
  let lastIndex = 0;

  // Iterate over merged ranges in ascending order.
  mergedRanges.forEach(({ startIndex, endIndex }) => {
    // Append content from the end of the previous range to the start of the current range.
    resultBuffers.push(buffer.subarray(lastIndex, startIndex));
    lastIndex = endIndex;
  });
  // Append any remaining content after the last range.
  resultBuffers.push(buffer.subarray(lastIndex));

  // Concatenate the result buffers and decode back to a string.
  return Buffer.concat(resultBuffers).toString("utf-8");
}
