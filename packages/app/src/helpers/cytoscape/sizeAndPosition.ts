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
