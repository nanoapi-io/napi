import { useParams } from "react-router";

export default function VisualizerFile() {
  const params = useParams<{ file: string }>();

  return <div>{params.file}</div>;
}
