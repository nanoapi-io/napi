import { useParams } from "react-router";

export default function AuditInstancePage() {
  const params = useParams<{ file: string; instance: string }>();

  return (
    <div className="p-4">
      <div>{params.file}</div>
      <div>{params.instance}</div>
      <div>This feature is not implemented yet.</div>
    </div>
  );
}
