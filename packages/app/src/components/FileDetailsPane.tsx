import { useNavigate } from "react-router";
import { Button, Callout, Separator } from "@radix-ui/themes";
import {
  LuX,
  LuMessageSquareWarning,
  LuMessageSquareX,
  LuCircleAlert,
  LuCircleX,
  LuSearchCode,
} from "react-icons/lu";
import { FileManifest } from "../service/api/types/dependencyManifest";
import { FileAuditManifest } from "../service/api/types/auditManifest";

export default function FileDetailsPane(props: {
  fileDependencyManifest: FileManifest;
  fileAuditManifest: FileAuditManifest;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  const navigateToFile = () => {
    const urlEncodedFileName = encodeURIComponent(
      props.fileDependencyManifest.filePath,
    );
    const url = `/audit/${urlEncodedFileName}`;

    navigate(url);
    props.setOpen(false);
  };

  const onClose = () => {
    props.setOpen(false);
  };

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
              onClick={onClose}
              variant="ghost"
              className="text-xl text-text-light dark:text-text-dark"
            >
              <LuX />
            </Button>
          </div>

          <Separator className="w-full" />
        </div>

        <div>
          <strong>Total Lines of Code:</strong>{" "}
          {props.fileDependencyManifest.lineCount}
        </div>

        <div>
          <strong>Total dependencies:</strong>{" "}
          {Object.keys(props.fileDependencyManifest.dependencies).length}
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
              <strong>Errors:</strong> {props.fileAuditManifest.errors.length}
            </div>
            <LuMessageSquareX
              className={`text-2xl ${
                props.fileAuditManifest.errors.length > 0 && "text-red-500"
              }`}
            />
          </div>
          {props.fileAuditManifest.errors.map((error, index) => (
            <Callout.Root key={index} color="red">
              <Callout.Icon>
                <LuCircleX />
              </Callout.Icon>
              <Callout.Text>{error.longMessage}</Callout.Text>
            </Callout.Root>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div>
              <strong>Warnings:</strong>{" "}
              {props.fileAuditManifest.warnings.length}
            </div>
            <LuMessageSquareWarning
              className={`text-2xl ${
                props.fileAuditManifest.warnings.length > 0 && "text-yellow"
              }`}
            />
          </div>
          {props.fileAuditManifest.warnings.map((warning, index) => (
            <Callout.Root key={index} color="yellow">
              <Callout.Icon>
                <LuCircleAlert />
              </Callout.Icon>
              <Callout.Text>{warning.longMessage}</Callout.Text>
            </Callout.Root>
          ))}
        </div>

        <div className="grow flex flex-col justify-end">
          <Button
            onClick={navigateToFile}
            variant="ghost"
            size="3"
            className="flex justify-center gap-2 text-text-light dark:text-text-dark"
          >
            <LuSearchCode className="text-xl my-auto" />{" "}
            <span className="my-auto">Inspect file interactions</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
