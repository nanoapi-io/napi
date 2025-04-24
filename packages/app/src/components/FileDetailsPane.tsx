import { Link } from "react-router";
import { Button, Callout, Separator } from "@radix-ui/themes";
import { LuX, LuMessageSquareX, LuCircleX, LuSearchCode } from "react-icons/lu";
import {
  FileAuditManifest,
  FileDependencyManifest,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "@napi/shared";

export default function FileDetailsPane(props: {
  fileDependencyManifest: FileDependencyManifest;
  fileAuditManifest: FileAuditManifest;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <div className="relative h-full flex justify-end z-1">
      <div
        style={{
          width: props.open ? "400px" : "0px",
          opacity: props.open ? 1 : 0,
        }}
        className="z-20 h-full flex flex-col gap-5 bg-background-light dark:bg-background-dark shadow-xl p-6 rounded-l-lg transition-all duration-300 ease-in-out overflow-hidden"
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold font-mono break-words text-wrap">
              {props.fileDependencyManifest.filePath.split("/").pop()}
            </h2>
            <Button
              onClick={() => props.setOpen(false)}
              variant="ghost"
              className="text-xl text-text-light dark:text-text-dark"
            >
              <LuX />
            </Button>
          </div>

          <Separator className="w-full" />
        </div>

        <div>
          <strong>Total Lines:</strong>{" "}
          {props.fileDependencyManifest.metrics[metricLinesCount]}
        </div>

        <div>
          <strong>Total Lines of Code:</strong>{" "}
          {props.fileDependencyManifest.metrics[metricCodeLineCount]}
        </div>

        <div>
          <strong>Total Characters:</strong>{" "}
          {props.fileDependencyManifest.metrics[metricCharacterCount]}
        </div>

        <div>
          <strong>Total Characters of Code:</strong>{" "}
          {props.fileDependencyManifest.metrics[metricCodeCharacterCount]}
        </div>

        <div>
          <strong>Total dependencies:</strong>{" "}
          {props.fileDependencyManifest.metrics[metricDependencyCount]}
        </div>

        <div>
          <strong>Total dependents:</strong>{" "}
          {props.fileDependencyManifest.metrics[metricDependentCount]}
        </div>

        <div>
          <strong>Cyclomatic Complexity:</strong>{" "}
          {props.fileDependencyManifest.metrics[metricCyclomaticComplexity]}
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <strong>Total Symbols:</strong>{" "}
            {Object.keys(props.fileDependencyManifest.symbols).length}
          </div>
          <ul className="list-inside list-disc">
            {Object.entries(
              Object.values(props.fileDependencyManifest.symbols).reduce(
                (acc, symbol) => {
                  acc[symbol.type] = (acc[symbol.type] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>,
              ),
            ).map(([type, count]) => (
              <li key={type} className="text-sm">
                <span className="font-medium">{type}:</span> {count}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div>
              <strong>Errors:</strong>{" "}
              {Object.values(props.fileAuditManifest.alerts).length}
            </div>
            <LuMessageSquareX
              className={`text-2xl ${
                Object.values(props.fileAuditManifest.alerts).length > 0 &&
                "text-red-500"
              }`}
            />
          </div>
          {Object.values(props.fileAuditManifest.alerts).map((alert, index) => (
            <Callout.Root key={index} color="red">
              <Callout.Icon>
                <LuCircleX />
              </Callout.Icon>
              <Callout.Text>{alert.message.long}</Callout.Text>
            </Callout.Root>
          ))}
        </div>

        <div className="grow flex flex-col justify-end">
          <Link
            to={`/audit/${encodeURIComponent(props.fileDependencyManifest.filePath)}`}
            className="block"
          >
            <Button
              variant="ghost"
              size="3"
              className="flex justify-center gap-2 text-text-light dark:text-text-dark w-full"
            >
              <LuSearchCode className="text-xl my-auto" />{" "}
              <span className="my-auto">Inspect file interactions</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
