import { FileAuditManifest, SymbolAuditManifest } from "@napi/shared";

/**
 * Calculates the optimal width and height for a node based on its label text.
 *
 * Determines dimensions by measuring the label's text length and line count,
 * applying appropriate font size, line height, and padding.
 * Enforces minimum dimensions to ensure nodes are visually distinguishable.
 *
 * @param label - The label text to be displayed in the node
 * @param options - Configuration options for calculating dimensions
 * @returns Object containing calculated width and height
 */
export function getNodeWidthAndHeightFromLabel(
  label: string,
  options = {
    fontSize: 10,
    lineHeight: 1.5,
    padding: 10,
    minHeight: 60,
    minWidth: 60,
  },
) {
  const lines = label.split("\n");

  const height = Math.max(
    lines.length * options.fontSize * options.lineHeight + 2 * options.padding,
    options.minHeight,
  );

  const width = Math.max(
    ...lines.map(
      (line) => line.length * options.fontSize + 2 * options.padding,
    ),
    options.minWidth,
  );

  return { width, height };
}

const successChar = "🎉";
const errorChar = "⚠️";

/**
 * Generates the collapsed label for a file node with summarized audit information.
 *
 * Creates a compact representation showing:
 * - Truncated file name (if longer than maximum length)
 * - Alert count with warning icon (if issues exist)
 *
 * Used for the default, non-selected state of nodes in the graph visualization.
 *
 * @param data - Object containing file name and audit information
 * @returns Formatted label string for collapsed node view
 */
export function getCollapsedFileNodeLabel(data: {
  fileName: string;
  fileAuditManifest: FileAuditManifest;
}) {
  const fileNameMaxLength = 25;
  const fileName =
    data.fileName.length > fileNameMaxLength
      ? `...${data.fileName.slice(-fileNameMaxLength)}`
      : data.fileName;

  let label = fileName;

  const alerts = Object.values(data.fileAuditManifest.alerts);

  if (alerts.length > 0) {
    label += `\n${errorChar}(${alerts.length})`;
  }

  return label;
}

/**
 * Generates the expanded label for a file node with detailed audit information.
 *
 * Creates a comprehensive display showing:
 * - Full file name without truncation
 * - List of all alerts with warning icons and short messages
 * - Success message if no issues are found
 *
 * Used when a node is selected to provide more detailed information.
 *
 * @param data - Object containing file name and audit information
 * @returns Formatted label string for expanded node view
 */
export function getExpandedFileNodeLabel(data: {
  fileName: string;
  fileAuditManifest: FileAuditManifest;
}) {
  let label = data.fileName;

  const alerts = Object.values(data.fileAuditManifest.alerts);

  if (alerts.length > 0) {
    alerts.forEach((alert) => {
      label += `\n${errorChar} ${alert.message.short}`;
    });
  } else {
    label += `\n${successChar} No issues found`;
  }

  return label;
}

/**
 * Generates the collapsed label for a symbol node with minimal information.
 *
 * Shows only the symbol name for a compact representation in the non-selected state.
 *
 * @param data - Object containing symbol name
 * @returns Symbol name as the collapsed label
 */
export function getCollapsedSymbolNodeLabel(data: { symbolName: string }) {
  return data.symbolName;
}

/**
 * Generates the expanded label for a symbol node with detailed information.
 *
 * Creates a comprehensive display showing:
 * - Symbol name and type
 * - Source file information
 * - List of alerts with warning icons (if any)
 * - Success message if no issues are found
 *
 * Used when a symbol node is selected to provide more detailed information.
 *
 * @param data - Object containing symbol information and audit data
 * @returns Formatted label string for expanded symbol node view
 */
export function getExpandedSymbolNodeLabel(data: {
  currentFileId: string;
  fileName: string;
  symbolName: string;
  symbolType: string;
  symbolAuditManifest: SymbolAuditManifest | undefined;
}) {
  // Create the basic label with symbol name and type
  let label = `${data.symbolName} (${data.symbolType})`;
  // Add file information
  label += `\nSource: ${data.fileName}`;

  // Add alerts information if available and not an external symbol
  if (data.symbolAuditManifest) {
    const alertList = Object.values(data.symbolAuditManifest.alerts);

    if (alertList.length > 0) {
      alertList.forEach((alert) => {
        label += `\n${errorChar} ${alert.message.short}`;
      });
    } else {
      label += `\n${successChar} No issues`;
    }
  }

  return label;
}
