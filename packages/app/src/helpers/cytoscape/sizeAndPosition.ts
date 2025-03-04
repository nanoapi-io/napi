import { NodeSingular } from "cytoscape";

export function resizeNodeFromLabel(
  node: NodeSingular,
  label: string,
  options = {
    fontSize: 10,
    lineHeight: 1.5,
    padding: 10,
    minHeight: 60,
    minWidth: 60,
  },
) {
  if (!label) return;

  const { fontSize, lineHeight, padding } = options;

  const lines = label.split("\n");

  const height = Math.max(
    lines.length * fontSize * lineHeight + 2 * padding,
    options.minHeight,
  );

  const width = Math.max(
    ...lines.map((line) => line.length * fontSize + 2 * padding),
    options.minWidth,
  );

  node.style("width", width);
  node.style("height", height);
}
