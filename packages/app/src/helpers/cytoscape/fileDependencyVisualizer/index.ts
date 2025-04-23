import { Core } from "cytoscape";
import { FcoseLayoutOptions } from "cytoscape-fcose";

export class FileDependencyVisualizer {
  public cy: Core;
  private theme: "light" | "dark";
  private layout = {
    name: "fcose",
    quality: "proof",
    nodeRepulsion: 1000000,
    idealEdgeLength: 200,
    gravity: 0.1,
  } as FcoseLayoutOptions;
}
