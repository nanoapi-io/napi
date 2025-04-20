import { useNavigate } from "react-router";
import { Callout } from "@radix-ui/themes";
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
    <dialog
      open={props.open}
      className="mr-0 w-[400px] h-[91%] bg-background-light dark:bg-background-dark shadow-xl z-[8888] p-6 rounded-l-lg"
    >
      <div className="flex justify-between items-center my-4">
        <h2 className="text-xl font-semibold font-mono break-words text-wrap max-w-[310px]">
          {props.fileDependencyManifest.filePath.split("/").pop()}
        </h2>
        <button
          onClick={onClose}
          className="text-xl text-gray-light hover:text-black dark:text-gray-dark dark:hover:text-white"
        >
          <LuX />
        </button>
      </div>

      <div className="w-full border-b border-b-border-light dark:border-b-border-dark"></div>

      <div className="mt-6 h-full flex flex-col space-y-5">
        <p>
          <strong>Total Lines of Code:</strong>{" "}
          {props.fileDependencyManifest.lineCount}
        </p>

        <p>
          <strong>Total dependencies:</strong>{" "}
          {Object.keys(props.fileDependencyManifest.dependencies).length}
        </p>

        <div>
          <p>
            <strong>Total Symbols:</strong>{" "}
            {Object.keys(props.fileDependencyManifest.symbols).length}
          </p>
          <ul className="mt-2 pl-6 list-disc">
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

        <div>
          <div className="flex justify-between">
            <p>
              <strong>Errors:</strong> {props.fileAuditManifest.errors.length}
            </p>
            <LuMessageSquareX
              className={`text-2xl ${
                props.fileAuditManifest.errors.length > 0 ? "text-red-500" : ""
              }`}
            />
          </div>
          {props.fileAuditManifest.errors.map((error, index) => (
            <Callout.Root key={index} color="red" className="mt-2">
              <Callout.Icon>
                <LuCircleX />
              </Callout.Icon>
              <Callout.Text>{error.longMessage}</Callout.Text>
            </Callout.Root>
          ))}
        </div>

        <div>
          <div className="flex justify-between">
            <p>
              <strong>Warnings:</strong>{" "}
              {props.fileAuditManifest.warnings.length}
            </p>
            <LuMessageSquareWarning
              className={`text-2xl ${
                props.fileAuditManifest.warnings.length > 0
                  ? "text-yellow-500"
                  : ""
              }`}
            />
          </div>
          {props.fileAuditManifest.warnings.map((warning, index) => (
            <Callout.Root key={index} color="yellow" className="mt-2">
              <Callout.Icon>
                <LuCircleAlert />
              </Callout.Icon>
              <Callout.Text>{warning.longMessage}</Callout.Text>
            </Callout.Root>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 right-6 w-[350px]">
        <button
          onClick={navigateToFile}
          className="w-full px-4 py-2 flex justify-center space-x-2 bg-primary-light dark:bg-primary-dark text-white rounded-lg hover:bg-primary-dark dark:hover:bg-primary-light transition-colors duration-300"
        >
          <LuSearchCode className="text-xl my-auto" />{" "}
          <span className="my-auto">Inspect file interactions</span>
        </button>
      </div>
    </dialog>
  );
}
