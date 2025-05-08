interface CytoscapeStyles {
  colors: {
    background: string;
    foreground: string;
    highlighted: string;
    selected: string;
    dependency: string;
    dependent: string;
    severity: {
      1: string;
      2: string;
      3: string;
      4: string;
      5: string;
    };
  };
}

const lightCytoscapeStyles: CytoscapeStyles = {
  colors: {
    background: "#f8fafc", // Slate-50 - light background color
    foreground: "#1e293b", // Slate-800 - dark text for light theme
    highlighted: "#fbbf24", // Amber-400 - highlighted nodes, visible in both themes
    selected: "#3b82f6", // Blue-500 - selected nodes, visible in both themes
    dependency: "#60a5fa", // Blue-400 - dependency relationships, visible in both themes
    dependent: "#34d399", // Emerald-400 - dependent relationships, visible in both themes
    severity: {
      1: "#f87171", // Red-400 - severity 1
      2: "#f97316", // Orange-400 - severity 2
      3: "#f59e0b", // Amber-400 - severity 3
      4: "#eab308", // Yellow-400 - severity 4
      5: "#84cc16", // Lime-400 - severity 5
    },
  },
};

const darkCytoscapeStyles: CytoscapeStyles = {
  colors: {
    background: "#1e293b", // Slate-800 - dark background color
    foreground: "#f8fafc", // Slate-50 - light text for dark theme
    highlighted: "#fbbf24", // Amber-400 - highlighted nodes, visible in both themes
    selected: "#3b82f6", // Blue-500 - selected nodes, visible in both themes
    dependency: "#60a5fa", // Blue-400 - dependency relationships, visible in both themes
    dependent: "#34d399", // Emerald-400 - dependent relationships, visible in both themes
    severity: {
      1: "#f87171", // Red-400 - severity 1
      2: "#f97316", // Orange-400 - severity 2
      3: "#f59e0b", // Amber-400 - severity 3
      4: "#eab308", // Yellow-400 - severity 4
      5: "#84cc16", // Lime-400 - severity 5
    },
  },
};

export function getCytoscapeStyles(theme: "light" | "dark") {
  if (theme === "light") {
    return lightCytoscapeStyles;
  } else {
    return darkCytoscapeStyles;
  }
}
