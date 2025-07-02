import type { DependencyManifest } from "../types.ts";
import type { GroupLayer, SymbolRef } from "./types.ts";

// =============================================================================
// CONSTANTS AND CONFIGURATION
// =============================================================================

/**
 * The separator used to join the fileId and symbolId in the key.
 * This is a URL-safe separator that won't conflict with file paths.
 */
const JOINT_SYMBOL_SEPARATOR = "::";

// =============================================================================
// SYMBOL KEY MANAGEMENT UTILITIES
// =============================================================================

/**
 * Converts a SymbolRef into a unique string key for efficient lookups.
 * Uses URL encoding to handle special characters in file paths and symbol names.
 *
 * @param ref - The symbol reference to convert
 * @returns A unique string key for the symbol
 */
export function symbolRefToKey(ref: SymbolRef): string {
  const urlEncodedFileId = encodeURIComponent(ref.fileId);
  const urlEncodedSymbolId = encodeURIComponent(ref.symbolId);
  return `${urlEncodedFileId}${JOINT_SYMBOL_SEPARATOR}${urlEncodedSymbolId}`;
}

/**
 * Converts a symbol key back into a SymbolRef.
 * This is the inverse operation of symbolRefToKey.
 *
 * @param key - The string key to convert back
 * @returns The original SymbolRef
 */
export function keyToSymbolRef(key: string): SymbolRef {
  const [urlEncodedFileId, urlEncodedSymbolId] = key.split(
    JOINT_SYMBOL_SEPARATOR,
  );
  const fileId = decodeURIComponent(urlEncodedFileId);
  const symbolId = decodeURIComponent(urlEncodedSymbolId);
  return { fileId, symbolId };
}

// =============================================================================
// DEPENDENCY ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Gets all unprocessed internal dependencies for a given symbol.
 * This function filters out:
 * - External dependencies (outside the codebase)
 * - Self-dependencies (symbol depending on itself)
 * - Already processed dependencies
 *
 * @param symbolRef - The symbol to analyze
 * @param manifest - The complete dependency manifest
 * @param processedSymbols - Set of already processed symbol keys
 * @returns Array of dependency symbol keys that haven't been processed yet
 */
function getUnprocessedDependencies(
  symbolRef: SymbolRef,
  manifest: DependencyManifest,
  processedSymbols: Set<string>,
): string[] {
  const currentSymbolKey = symbolRefToKey(symbolRef);
  const symbolManifest = manifest[symbolRef.fileId]
    ?.symbols[symbolRef.symbolId];
  if (!symbolManifest) return [];

  const dependencies: string[] = [];

  // Iterate through all files this symbol depends on
  for (
    const [depFileId, depInfo] of Object.entries(symbolManifest.dependencies)
  ) {
    // Skip external dependencies - we only care about internal code dependencies
    if (depInfo.isExternal) continue;

    // Check each symbol within the dependency file
    for (const depSymbolId of Object.keys(depInfo.symbols)) {
      // Verify the dependency symbol actually exists in the manifest
      if (manifest[depFileId]?.symbols[depSymbolId]) {
        const depKey = symbolRefToKey({
          fileId: depFileId,
          symbolId: depSymbolId,
        });

        // Skip self-dependencies and already processed symbols
        if (currentSymbolKey !== depKey && !processedSymbols.has(depKey)) {
          dependencies.push(depKey);
        }
      }
    }
  }

  return dependencies;
}

// =============================================================================
// STRONGLY CONNECTED COMPONENTS (SCC) ALGORITHM
// =============================================================================

/**
 * Tarjan's strongly connected components algorithm.
 * This finds groups of symbols that form dependency cycles.
 *
 * A strongly connected component is a maximal set of vertices such that
 * for every pair of vertices u and v, there is a directed path from u to v
 * and a directed path from v to u.
 *
 * Time complexity: O(V + E) where V is vertices and E is edges
 *
 * https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm#The_algorithm_in_pseudocode
 *
 * @param graph - Adjacency list representation of the dependency graph
 * @returns Array of sets, each containing symbol keys that form an SCC
 */
function stronglyConnectedComponents(
  graph: Map<string, Set<string>>,
): Array<Set<string>> {
  // Tarjan's algorithm state
  const indices = new Map<string, number>(); // Discovery time of each vertex
  const lowlinks = new Map<string, number>(); // Lowest reachable discovery time
  const onStack = new Set<string>(); // Vertices currently on the stack
  const stack: string[] = []; // Stack for the algorithm
  const components: Array<Set<string>> = []; // Resulting SCCs
  let index = 0; // Global discovery time counter

  /**
   * Recursive function that performs the depth-first search for Tarjan's algorithm.
   * This is the core of the SCC detection logic.
   */
  function strongConnect(v: string): void {
    // Initialize the vertex
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    // Check all neighbors (dependencies)
    const neighbors = graph.get(v) || new Set();
    for (const w of neighbors) {
      if (!indices.has(w)) {
        // Neighbor w has not yet been visited; recurse on it
        strongConnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.has(w)) {
        // Neighbor w is in the stack and hence in the current SCC
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }

    // If v is a root node, pop the stack and create an SCC
    if (lowlinks.get(v) === indices.get(v)) {
      const component = new Set<string>();
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.add(w);
      } while (w !== v);
      components.push(component);
    }
  }

  // Start DFS from each unvisited vertex
  for (const v of graph.keys()) {
    if (!indices.has(v)) {
      strongConnect(v);
    }
  }

  return components;
}

/**
 * Builds a dependency graph from remaining symbols and finds SCCs.
 * This creates the graph representation needed for SCC analysis.
 *
 * @param remainingSymbols - Map of symbol keys to SymbolRefs that haven't been processed
 * @param manifest - The complete dependency manifest
 * @param processedSymbols - Set of already processed symbol keys
 * @returns Array of SCCs (sets of symbol keys that form cycles)
 */
function findStronglyConnectedComponents(
  remainingSymbols: Map<string, SymbolRef>,
  manifest: DependencyManifest,
  processedSymbols: Set<string>,
): Array<Set<string>> {
  const graph = new Map<string, Set<string>>();

  // Build the dependency graph for remaining symbols only
  for (const [symbolKey, symbolRef] of remainingSymbols) {
    const dependencies = getUnprocessedDependencies(
      symbolRef,
      manifest,
      processedSymbols,
    );

    // Only include dependencies that are also in remainingSymbols
    // This ensures we only analyze cycles among unprocessed symbols
    const filteredDeps = dependencies.filter((dep) =>
      remainingSymbols.has(dep)
    );
    graph.set(symbolKey, new Set(filteredDeps));
  }

  return stronglyConnectedComponents(graph);
}

// =============================================================================
// CYCLE BREAKING STRATEGIES
// =============================================================================

/**
 * Selects the best symbol from a set based on dependency count.
 * "Best" means the symbol with the fewest unprocessed dependencies,
 * which makes it a good candidate for breaking cycles with minimal impact.
 *
 * @param symbolKeys - Set of symbol keys to choose from
 * @param remainingSymbols - Map of remaining symbols
 * @param manifest - The dependency manifest
 * @param processedSymbols - Set of processed symbols
 * @returns The best SymbolRef or null if none found
 */
function selectBestSymbol(
  symbolKeys: Set<string>,
  remainingSymbols: Map<string, SymbolRef>,
  manifest: DependencyManifest,
  processedSymbols: Set<string>,
): SymbolRef | null {
  let bestSymbol: SymbolRef | null = null;
  let minDeps = Infinity;

  for (const symbolKey of symbolKeys) {
    const symbolRef = remainingSymbols.get(symbolKey);
    if (!symbolRef) continue;

    const depCount =
      getUnprocessedDependencies(symbolRef, manifest, processedSymbols).length;
    if (depCount < minDeps) {
      minDeps = depCount;
      bestSymbol = symbolRef;
    }
  }

  return bestSymbol;
}

/**
 * Selects optimal symbols to break dependency cycles using SCC analysis.
 *
 * This function implements a two-phase strategy:
 * 1. Break major cycles by selecting one representative from each large SCC
 * 2. Add all remaining independent symbols that don't depend on selected ones
 *
 * The goal is to maximize the number of symbols that can be processed
 * while minimizing the total notYetProcessedDependencySymbolRefs across all layers.
 *
 * @param remainingSymbols - Map of unprocessed symbols
 * @param manifest - The dependency manifest
 * @param processedSymbols - Set of processed symbols
 * @returns Object containing selected symbols and their dependencies
 */
function selectCycleBreakers(
  remainingSymbols: Map<string, SymbolRef>,
  manifest: DependencyManifest,
  processedSymbols: Set<string>,
): { symbols: SymbolRef[]; dependencies: SymbolRef[] } {
  const sccs = findStronglyConnectedComponents(
    remainingSymbols,
    manifest,
    processedSymbols,
  );
  const selectedSymbols: SymbolRef[] = [];
  const selectedKeys = new Set<string>();

  // Phase 1: Break major cycles (large SCCs with 3+ symbols)
  // These represent significant circular dependencies that need to be broken
  const largeSCCs = sccs.filter((scc) => scc.size >= 3);
  for (const scc of largeSCCs) {
    // Select the symbol with minimum dependencies to minimize impact
    const bestSymbol = selectBestSymbol(
      scc,
      remainingSymbols,
      manifest,
      processedSymbols,
    );
    if (bestSymbol) {
      selectedSymbols.push(bestSymbol);
      selectedKeys.add(symbolRefToKey(bestSymbol));
    }
  }

  // Phase 2: Add all qualifying independent symbols (small SCCs)
  // Small SCCs (size < 3) are typically independent symbols or simple mutual dependencies
  const smallSCCs = sccs.filter((scc) => scc.size < 3);
  const candidates = smallSCCs
    .flatMap((scc) => Array.from(scc))
    .map((symbolKey) => {
      const symbolRef = remainingSymbols.get(symbolKey);
      if (!symbolRef) return null;
      return {
        key: symbolKey,
        ref: symbolRef,
        deps: getUnprocessedDependencies(symbolRef, manifest, processedSymbols)
          .length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.deps - b!.deps); // Sort by dependency count (prefer fewer dependencies)

  // Greedily add independent symbols that don't depend on already selected ones
  for (const candidate of candidates) {
    // Only add if it doesn't depend on any already selected symbols
    // This ensures symbols in the same batch can be processed in parallel
    const dependencies = getUnprocessedDependencies(
      candidate!.ref,
      manifest,
      processedSymbols,
    );
    const dependsOnSelected = dependencies.some((depKey) =>
      selectedKeys.has(depKey)
    );

    if (!dependsOnSelected) {
      selectedSymbols.push(candidate!.ref);
      selectedKeys.add(candidate!.key);
    }
  }

  // Phase 3: Calculate all dependencies for the selected batch
  // These will become the notYetProcessedDependencySymbolRefs for this layer
  const allDependencies = new Set<string>();
  for (const symbolRef of selectedSymbols) {
    const deps = getUnprocessedDependencies(
      symbolRef,
      manifest,
      processedSymbols,
    );
    deps.forEach((dep) => allDependencies.add(dep));
  }

  return {
    symbols: selectedSymbols,
    dependencies: Array.from(allDependencies).map(keyToSymbolRef),
  };
}

// =============================================================================
// INDEPENDENT SYMBOL DETECTION
// =============================================================================

/**
 * Finds symbols that have no unprocessed dependencies.
 * These symbols can be processed immediately without waiting for other symbols.
 * This is the optimal case - no cycle breaking needed.
 *
 * @param remainingSymbols - Map of unprocessed symbols
 * @param manifest - The dependency manifest
 * @param processedSymbols - Set of processed symbols
 * @returns Array of symbols that can be processed independently
 */
function findIndependentSymbols(
  remainingSymbols: Map<string, SymbolRef>,
  manifest: DependencyManifest,
  processedSymbols: Set<string>,
): SymbolRef[] {
  return Array.from(remainingSymbols.values()).filter(
    (symbolRef) =>
      getUnprocessedDependencies(symbolRef, manifest, processedSymbols)
        .length === 0,
  );
}

// =============================================================================
// BATCH PROCESSING UTILITIES
// =============================================================================

/**
 * Marks a batch of symbols as processed by updating the tracking sets.
 * This is a utility function to keep the main algorithm clean.
 *
 * @param symbols - Array of symbols to mark as processed
 * @param remainingSymbols - Map to remove symbols from
 * @param processedSymbols - Set to add symbols to
 */
function processBatch(
  symbols: SymbolRef[],
  remainingSymbols: Map<string, SymbolRef>,
  processedSymbols: Set<string>,
): void {
  for (const symbolRef of symbols) {
    const key = symbolRefToKey(symbolRef);
    remainingSymbols.delete(key);
    processedSymbols.add(key);
  }
}

// =============================================================================
// MAIN ALGORITHM
// =============================================================================

/**
 * Generates group layers for dependency-aware parallel processing.
 *
 * This is the main algorithm that creates a series of layers where:
 * - Symbols in each layer can be processed in parallel
 * - Symbols in layer N only depend on symbols from layers 0 to N-1
 * - The algorithm handles circular dependencies using SCC analysis
 *
 * Algorithm Overview:
 * 1. Start with all symbols as "remaining"
 * 2. While there are remaining symbols:
 *    a. Find symbols with no dependencies → process them (optimal case)
 *    b. If no independent symbols exist → use SCC-based cycle breaking
 * 3. Each iteration creates a new layer
 *
 * The algorithm prioritizes processing independent symbols first (no dependencies),
 * and only resorts to cycle breaking when necessary. This minimizes the number
 * of layers and maximizes parallelism.
 *
 * @param manifest - The complete dependency manifest for the codebase
 * @returns Array of GroupLayers representing the processing order
 */
export function generateGroupLayers(
  manifest: DependencyManifest,
): GroupLayer[] {
  const groupLayers: GroupLayer[] = [];
  const processedSymbols = new Set<string>(); // Symbols we've already processed
  const remainingSymbols = new Map<string, SymbolRef>(); // Symbols still to process

  // Initialize: all symbols start as "remaining"
  for (const [fileId, fileManifest] of Object.entries(manifest)) {
    for (const symbolId of Object.keys(fileManifest.symbols)) {
      const ref = { fileId, symbolId };
      remainingSymbols.set(symbolRefToKey(ref), ref);
    }
  }

  let level = 0;

  // Main processing loop: continue until all symbols are processed
  while (remainingSymbols.size > 0) {
    // Strategy 1: Look for symbols with no dependencies (optimal case)
    const independentSymbols = findIndependentSymbols(
      remainingSymbols,
      manifest,
      processedSymbols,
    );

    if (independentSymbols.length > 0) {
      // Found independent symbols - process them all in this layer
      groupLayers.push({
        level,
        symbolRefsToProcess: independentSymbols,
        notYetProcessedDependencySymbolRefs: [], // No dependencies since they're independent
      });
      processBatch(independentSymbols, remainingSymbols, processedSymbols);
    } else {
      // Strategy 2: No independent symbols - must break cycles using SCC analysis
      const result = selectCycleBreakers(
        remainingSymbols,
        manifest,
        processedSymbols,
      );

      groupLayers.push({
        level,
        symbolRefsToProcess: result.symbols,
        notYetProcessedDependencySymbolRefs: result.dependencies,
      });
      processBatch(result.symbols, remainingSymbols, processedSymbols);
    }

    level++;
  }

  return groupLayers;
}
