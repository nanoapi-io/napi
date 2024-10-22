export default function GroupNodeContent(props: {
  nodeId: string;
  path: string;
}) {
  // TODO collapse/expand logic
  return <div>/{props.path}</div>;
}
