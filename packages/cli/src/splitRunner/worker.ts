import { parentPort, workerData } from "worker_threads";
import { SplitRunner } from "./splitRunner";
import { Group } from "../dependencyManager/types";
import { File } from "./types";

const {
  index,
  group,
  entryPointPath,
  files,
}: {
  index: number;
  group: Group;
  entryPointPath: string;
  files: File[];
} = workerData;

(() => {
  const splitRunner = new SplitRunner(index, group, entryPointPath, files);
  const updatedFiled = splitRunner.run();
  // Send updated files back to the parent
  parentPort?.postMessage(updatedFiled);
})();
