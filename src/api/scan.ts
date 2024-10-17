import { getDependencyTree } from "../helper/dependencies";
import {
  ScanCodebaseRequestPayload,
  ScanCodebaseResponsePayload,
} from "../helper/payloads";
import { iterateOverTree } from "../helper/tree";

export function scan(
  scanRequestPayload: ScanCodebaseRequestPayload
): ScanCodebaseResponsePayload {
  const tree = getDependencyTree(scanRequestPayload.entrypointPath);

  const endpoints = iterateOverTree(tree);

  return { endpoints };
}
