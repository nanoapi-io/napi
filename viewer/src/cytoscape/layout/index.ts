import type { FcoseLayoutOptions } from "cytoscape-fcose";

/**
 * Main layout configuration for dependency visualization graphs.
 *
 * Uses the F-COSE (Force-directed Compound Spring Embedder) algorithm optimized for:
 * - High quality graph rendering with "proof" quality setting
 * - Strong node repulsion to prevent overlapping (1,000,000 force units)
 * - Ideal edge length of 200px for readability
 * - Gentle gravity (0.1) to pull components toward center
 * - Component packing to utilize space efficiently
 * - Node dimensions that include labels to prevent text overlap
 */
export const mainLayout = {
  name: "fcose",
  quality: "proof",
  nodeRepulsion: 1000000,
  idealEdgeLength: 200,
  gravity: 0.1,
  packComponents: true,
  nodeDimensionsIncludeLabels: true,
} as FcoseLayoutOptions;
