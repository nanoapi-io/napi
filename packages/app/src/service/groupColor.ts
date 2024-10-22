export function generateDarkColors(count: number): string[] {
  const colors: string[] = [];
  const primaryColors = [
    { hue: 0, saturation: 100, lightness: 30 }, // Red
    { hue: 120, saturation: 100, lightness: 30 }, // Green
    { hue: 240, saturation: 100, lightness: 30 }, // Blue
  ];
  const secondaryColors = [
    { hue: 60, saturation: 100, lightness: 30 }, // Yellow
    { hue: 180, saturation: 100, lightness: 30 }, // Cyan
    { hue: 300, saturation: 100, lightness: 30 }, // Magenta
  ];

  let colorIndex = 0;
  while (colors.length < count) {
    const colorSet = colorIndex % 2 === 0 ? primaryColors : secondaryColors;
    const color = colorSet[colorIndex % colorSet.length];
    colors.push(`hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`);
    colorIndex++;
  }

  return colors;
}
