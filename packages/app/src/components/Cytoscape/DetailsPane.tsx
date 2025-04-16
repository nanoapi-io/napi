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
import { NodeElementDefinition } from "../../helpers/cytoscape/views/audit";

export function DetailsPane(props: {
  nodeData: NodeElementDefinition["data"] | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  const { nodeData, setOpen } = props;
  const file = nodeData?.customData.fileName;

  const navigateToFile = () => {
    if (nodeData?.customData.fileName) {
      const urlEncodedFileName = encodeURIComponent(
        nodeData.customData.fileName,
      );
      const url = `/audit/${urlEncodedFileName}`;

      navigate(url);
      setOpen(false);
    }
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-[8880] transition-opacity duration-300 ${
          props.open ? "opacity-20" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      ></div>

      {/* Sidebar Pane */}
      <div
        className={`fixed top-[7%] right-0 h-[91%] w-[400px] rounded-l-lg bg-background-light dark:bg-secondaryBackground-dark shadow-xl z-[8888] p-6 transition-transform duration-300 translate-x-0 ${
          props.open ? "translate-x-0" : "translate-x-[400px]"
        }`}
      >
        <div className="flex justify-between items-center my-4">
          <h2 className="text-xl font-semibold font-mono break-words text-wrap max-w-[310px]">
            {file}
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
            <strong>Total Lines of Code:</strong> {nodeData?.customData.loc}
          </p>
          <p>
            <strong>Total dependencies:</strong>{" "}
            {nodeData?.customData.dependencies}
          </p>
          <p>
            <strong>Total Symbols:</strong> {nodeData?.customData.totalSymbols}
          </p>

          <div>
            <div className="flex justify-between">
              <p>
                <strong>Errors:</strong> {nodeData?.customData.errors.length}
              </p>
              <LuMessageSquareX
                className={`text-2xl ${
                  nodeData && nodeData.customData.errors.length > 0
                    ? "text-red-500"
                    : ""
                }`}
              />
            </div>
            {nodeData?.customData.errors.map((error, index) => (
              <Callout.Root key={index} color="red" className="mt-2">
                <Callout.Icon>
                  <LuCircleX />
                </Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            ))}
          </div>

          <div>
            <div className="flex justify-between">
              <p>
                <strong>Warnings:</strong>{" "}
                {nodeData?.customData.warnings.length}
              </p>
              <LuMessageSquareWarning
                className={`text-2xl ${
                  nodeData && nodeData.customData.warnings.length > 0
                    ? "text-yellow-500"
                    : ""
                }`}
              />
            </div>
            {nodeData?.customData.warnings.map((warning, index) => (
              <Callout.Root key={index} color="yellow" className="mt-2">
                <Callout.Icon>
                  <LuCircleAlert />
                </Callout.Icon>
                <Callout.Text>{warning}</Callout.Text>
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
      </div>
    </>
  );
}
