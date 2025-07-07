/**
 * Reference to a specific symbol within a file.
 * Used to uniquely identify symbols across the entire codebase.
 */
export type SymbolRef = {
  /** The unique identifier of the file containing the symbol */
  fileId: string;
  /** The unique identifier of the symbol within the file */
  symbolId: string;
};

/**
 * Represents a layer of symbols that can be processed in parallel.
 * The key insight is that symbols in layer N only depend on symbols from layers 0 to N-1.
 * This allows for efficient parallel processing while respecting dependency order.
 */
export type GroupLayer = {
  /**
   * The dependency level (0 to n).
   * Symbols at level n depend on symbols of groups from levels 0 through n-1.
   */
  level: number;
  /**
   * The symbolRefs to process in this layer.
   * These symbolRefs can be processed in parallel. They do not depend on each other.
   */
  symbolRefsToProcess: SymbolRef[];
  /**
   * Dependency symbolRefs that some symbolRefsToProcess depend on.
   * These symbolRefs will be process in a later layer.
   * We have no information about them.
   * This should be as little as possible. Best effort is made to create the groups
   * that have the least notYetProcessedDependencySymbolRefs as possible. Ideally none.
   */
  notYetProcessedDependencySymbolRefs: SymbolRef[];
};
