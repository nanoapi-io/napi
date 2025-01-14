import { Button, TextField, Tooltip } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

interface FileProp {
  path: string;
}
interface TreeData {
  id: string;
  level: number;
  name: string;
  children?: TreeData[]; // Only for non leaf nodes
}

export default function FileExplorer(props: {
  files: FileProp[];
  focusedId?: string;
  onNodeFocus: (id: string) => void;
  onNodeUnfocus: (id: string) => void;
}) {
  const [search, setSearch] = useState<string>("");
  const [treeData, setTreeData] = useState<TreeData[]>([]);

  function buildTreeData(files: FileProp[]): TreeData[] {
    let rootNodes: TreeData[] = [];

    files.forEach((file) => {
      // Filter out files that don't match the search
      if (!file.path.toLowerCase().includes(search.toLowerCase())) {
        return;
      }

      // Split path by '/' to get each directory/file name
      const parts = file.path.split("/");

      let currentLevel = rootNodes;
      let cumulativePath = "";

      parts.forEach((segment) => {
        // Build the "id" from the segments so far
        cumulativePath = cumulativePath
          ? `${cumulativePath}/${segment}`
          : segment;

        // Check if we already have this segment in the current level
        let existingNode = currentLevel.find((node) => node.name === segment);

        // If not, create a new node
        if (!existingNode) {
          existingNode = {
            id: `/${cumulativePath}`,
            level: 0,
            name: segment,
            children: [],
          };
          currentLevel.push(existingNode);
        }

        // Descend into children for the next segment
        if (!existingNode.children) {
          existingNode.children = [];
        }
        currentLevel = existingNode.children;
      });
    });

    rootNodes = rootNodes.map(flattenNode);
    rootNodes = setLevels(rootNodes);

    return rootNodes;
  }

  // Recursive helper that flattens a single node
  function flattenNode(node: TreeData): TreeData {
    // Recursively flatten all children
    if (node.children) {
      node.children = node.children.map(flattenNode);
    }

    // As long as the node has exactly one child, merge them
    while (node.children && node.children.length === 1) {
      const [child] = node.children;

      // Merge child's name into parent
      node.name = `${node.name}/${child.name}`;
      // Update the parent's id to child's id (which is already the full path)
      node.id = child.id;
      // Optionally inherit the child's level if needed
      node.level = child.level;
      // Replace parent's children with child's children
      node.children = child.children;

      // Continue merging in case the new "flattened" node also has exactly one child
    }

    return node;
  }

  function setLevels(nodes: TreeData[], currentLevel = 0): TreeData[] {
    return nodes.map((node) => {
      // Assign the current level
      node.level = currentLevel;

      // Recursively set levels for children
      if (node.children && node.children.length > 0) {
        node.children = setLevels(node.children, currentLevel + 1);
      }

      return node;
    });
  }

  useEffect(() => {
    setTreeData(buildTreeData(props.files));
  }, [props.files, search]);

  return (
    <div className="flex flex-col gap-2 px-2">
      <TextField.Root
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      >
        <TextField.Slot>
          <svg
            width="20px"
            height="20px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15.7955 15.8111L21 21M18 10.5C18 14.6421 14.6421 18 10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5Z" />
          </svg>
        </TextField.Slot>
      </TextField.Root>
      <ListElement
        nodes={treeData}
        focusedId={props.focusedId}
        onNodeFocus={props.onNodeFocus}
        onNodeUnfocus={props.onNodeUnfocus}
      />
    </div>
  );
}

function ListElement(props: {
  nodes: TreeData[];
  focusedId?: string;
  onNodeFocus(node: string): void;
  onNodeUnfocus(node: string): void;
}) {
  return (
    <ul>
      {props.nodes.map((node) => {
        return (
          <NodeElement
            key={node.id}
            node={node}
            focusedId={props.focusedId}
            onNodeFocus={props.onNodeFocus}
            onNodeUnfocus={props.onNodeUnfocus}
          />
        );
      })}
    </ul>
  );
}

function NodeElement(props: {
  node: TreeData;
  focusedId?: string;
  onNodeFocus(node: string): void;
  onNodeUnfocus(node: string): void;
}) {
  const params = useParams<{ file?: string }>();

  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = () => {
    setIsOpen((value) => !value);
  };

  return (
    <li
      className="pr-1 py-1 w-[300px]"
      style={{ paddingLeft: `${props.node.level * 10}px` }}
    >
      <div className="flex items-center gap-2">
        {props.node.children && props.node.children.length > 0 ? (
          <Button
            variant="ghost"
            className="w-full text-text-light dark:text-text-dark"
            onClick={handleToggle}
          >
            <div className="w-full flex items-center gap-2">
              {isOpen ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 10L13 10" />
                  <path d="M22 11.7979C22 9.16554 22 7.84935 21.2305 6.99383C21.1598 6.91514 21.0849 6.84024 21.0062 6.76946C20.1506 6 18.8345 6 16.2021 6H15.8284C14.6747 6 14.0979 6 13.5604 5.84678C13.2651 5.7626 12.9804 5.64471 12.7121 5.49543C12.2237 5.22367 11.8158 4.81578 11 4L10.4497 3.44975C10.1763 3.17633 10.0396 3.03961 9.89594 2.92051C9.27652 2.40704 8.51665 2.09229 7.71557 2.01738C7.52976 2 7.33642 2 6.94975 2C6.06722 2 5.62595 2 5.25839 2.06935C3.64031 2.37464 2.37464 3.64031 2.06935 5.25839C2 5.62595 2 6.06722 2 6.94975M21.9913 16C21.9554 18.4796 21.7715 19.8853 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V11" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 11.5V9M20 11.5V9.34843C20 7.37415 20 6.38701 19.3844 5.74537C19.3278 5.68635 19.2679 5.63018 19.2049 5.5771C18.5205 5 17.4676 5 15.3617 5H15.0627C14.1398 5 13.6783 5 13.2483 4.88508C13.012 4.82195 12.7844 4.73353 12.5697 4.62157C12.1789 4.41775 11.8526 4.11183 11.2 3.5L10.7598 3.08731C10.5411 2.88224 10.4317 2.77971 10.3168 2.69039C9.82122 2.30528 9.21332 2.06921 8.57246 2.01303C8.42381 2 8.26914 2 7.9598 2C7.25377 2 6.90076 2 6.60671 2.05201C5.31225 2.28098 4.29971 3.23023 4.05548 4.44379C4.02473 4.59657 4.01103 4.76633 4.00491 5C4 5.18795 4 5.41725 4 5.71231" />
                  <path d="M10 17H14" />
                  <path d="M10 11H8.7053C6.0379 11 4.7042 11 3.87908 11.7634C3.66852 11.9582 3.4866 12.1838 3.33908 12.433C2.761 13.4097 2.99958 14.7678 3.47674 17.4839C3.82024 19.4391 3.99198 20.4167 4.58706 21.0655C4.74145 21.2338 4.9142 21.383 5.10183 21.5101C5.825 22 6.7851 22 8.70531 22H15.2947C17.2149 22 18.175 22 18.8982 21.5101C19.0858 21.383 19.2585 21.2338 19.4129 21.0655C20.008 20.4167 20.1798 19.4391 20.5233 17.4839C21.0004 14.7678 21.239 13.4097 20.6609 12.433C20.5134 12.1838 20.3315 11.9582 20.1209 11.7634C19.2958 11 17.9621 11 15.2947 11H14" />
                </svg>
              )}
              <DisplayedPath node={props.node} />
            </div>
          </Button>
        ) : (
          <Button
            className={`w-full text-text-light dark:text-text-dark ${params.file === props.node.id && "bg-surface-light dark:bg-surface-dark"} ${props.focusedId === props.node.id && "bg-primary-light dark:bg-primary-dark"}`}
            variant="ghost"
            onMouseEnter={() => props.onNodeFocus(props.node.id)}
            onMouseLeave={() => props.onNodeUnfocus(props.node.id)}
          >
            <Link
              to={
                params.file === props.node.id
                  ? "/visualizer"
                  : encodeURIComponent(props.node.id)
              }
              className="w-full"
            >
              <div className="w-full flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                >
                  <path d="M2.75 10C2.75 9.58579 2.41421 9.25 2 9.25C1.58579 9.25 1.25 9.58579 1.25 10H2.75ZM21.25 14C21.25 14.4142 21.5858 14.75 22 14.75C22.4142 14.75 22.75 14.4142 22.75 14H21.25ZM15.3929 4.05365L14.8912 4.61112L15.3929 4.05365ZM19.3517 7.61654L18.85 8.17402L19.3517 7.61654ZM21.654 10.1541L20.9689 10.4592V10.4592L21.654 10.1541ZM3.17157 20.8284L3.7019 20.2981H3.7019L3.17157 20.8284ZM20.8284 20.8284L20.2981 20.2981L20.2981 20.2981L20.8284 20.8284ZM1.35509 5.92658C1.31455 6.33881 1.61585 6.70585 2.02807 6.7464C2.4403 6.78695 2.80734 6.48564 2.84789 6.07342L1.35509 5.92658ZM22.6449 18.0734C22.6855 17.6612 22.3841 17.2941 21.9719 17.2536C21.5597 17.2131 21.1927 17.5144 21.1521 17.9266L22.6449 18.0734ZM14 21.25H10V22.75H14V21.25ZM2.75 14V10H1.25V14H2.75ZM21.25 13.5629V14H22.75V13.5629H21.25ZM14.8912 4.61112L18.85 8.17402L19.8534 7.05907L15.8947 3.49618L14.8912 4.61112ZM22.75 13.5629C22.75 11.8745 22.7651 10.8055 22.3391 9.84897L20.9689 10.4592C21.2349 11.0565 21.25 11.742 21.25 13.5629H22.75ZM18.85 8.17402C20.2034 9.3921 20.7029 9.86199 20.9689 10.4592L22.3391 9.84897C21.9131 8.89241 21.1084 8.18853 19.8534 7.05907L18.85 8.17402ZM10.0298 2.75C11.6116 2.75 12.2085 2.76158 12.7405 2.96573L13.2779 1.5653C12.4261 1.23842 11.498 1.25 10.0298 1.25V2.75ZM15.8947 3.49618C14.8087 2.51878 14.1297 1.89214 13.2779 1.5653L12.7405 2.96573C13.2727 3.16993 13.7215 3.55836 14.8912 4.61112L15.8947 3.49618ZM10 21.25C8.09318 21.25 6.73851 21.2484 5.71085 21.1102C4.70476 20.975 4.12511 20.7213 3.7019 20.2981L2.64124 21.3588C3.38961 22.1071 4.33855 22.4392 5.51098 22.5969C6.66182 22.7516 8.13558 22.75 10 22.75V21.25ZM1.25 14C1.25 15.8644 1.24841 17.3382 1.40313 18.489C1.56076 19.6614 1.89288 20.6104 2.64124 21.3588L3.7019 20.2981C3.27869 19.8749 3.02502 19.2952 2.88976 18.2892C2.75159 17.2615 2.75 15.9068 2.75 14H1.25ZM14 22.75C15.8644 22.75 17.3382 22.7516 18.489 22.5969C19.6614 22.4392 20.6104 22.1071 21.3588 21.3588L20.2981 20.2981C19.8749 20.7213 19.2952 20.975 18.2892 21.1102C17.2615 21.2484 15.9068 21.25 14 21.25V22.75ZM10.0298 1.25C8.15538 1.25 6.67442 1.24842 5.51887 1.40307C4.34232 1.56054 3.39019 1.8923 2.64124 2.64124L3.7019 3.7019C4.12453 3.27928 4.70596 3.02525 5.71785 2.88982C6.75075 2.75158 8.11311 2.75 10.0298 2.75V1.25ZM2.84789 6.07342C2.96931 4.83905 3.23045 4.17335 3.7019 3.7019L2.64124 2.64124C1.80633 3.47616 1.48944 4.56072 1.35509 5.92658L2.84789 6.07342ZM21.1521 17.9266C21.0307 19.1609 20.7695 19.8266 20.2981 20.2981L21.3588 21.3588C22.1937 20.5238 22.5106 19.4393 22.6449 18.0734L21.1521 17.9266Z" />
                  <path d="M13 2.5V5C13 7.35702 13 8.53553 13.7322 9.26777C14.4645 10 15.643 10 18 10H22" />
                </svg>
                <DisplayedPath node={props.node} />
              </div>
            </Link>
          </Button>
        )}
      </div>
      {isOpen && (
        <ListElement
          nodes={props.node.children || []}
          focusedId={props.focusedId}
          onNodeFocus={props.onNodeFocus}
          onNodeUnfocus={props.onNodeUnfocus}
        />
      )}
    </li>
  );
}

function DisplayedPath({ node }: { node: TreeData }) {
  const maxPathLength = 35 - 2 * node.level;

  if (node.name.length > maxPathLength) {
    return (
      <Tooltip content={node.name}>
        <div>{`...${node.name.slice(-maxPathLength)}`}</div>
      </Tooltip>
    );
  }

  return <div>{node.name}</div>;
}
