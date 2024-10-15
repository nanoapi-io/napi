export default function GroupNodeContent(props: {
  nodeId: string;
  path: string;
}) {
  // TODO collapse/expand logic
  return <div className="text-dark font-bold">/{props.path}</div>;
}
