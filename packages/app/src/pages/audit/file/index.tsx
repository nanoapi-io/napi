import { useParams } from "react-router";

export default function AuditFile() {
  const params = useParams<{ file: string }>();

  return <div>{params.file}</div>;
}
