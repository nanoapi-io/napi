import { Button } from "@radix-ui/themes";

export default function GroupNodeContent(props: {
  nodeId: string;
  path: string;
  onNodeClick: (nodeId: string) => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <div className="text-dark font-bold">/{props.path}</div>
      <Button
        color="purple"
        size="1"
        onClick={() => props.onNodeClick(props.nodeId)}
      >
        Collapse
      </Button>
    </div>
  );
}
