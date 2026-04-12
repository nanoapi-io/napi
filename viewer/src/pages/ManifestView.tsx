import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchManifest, fetchAudit, type ManifestEnvelope } from "../api";
import type { DependencyManifest } from "../types/dependencyManifest";
import type { AuditManifest } from "../types/auditManifest";
import DependencyVisualizer from "../components/DependencyVisualizer/DependencyVisualizer";

export default function ManifestView() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<ManifestEnvelope | null>(null);
  const [auditManifest, setAuditManifest] = useState<AuditManifest | null>(
    null,
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchManifest(id), fetchAudit(id)])
      .then(([env, audit]) => {
        setEnvelope(env);
        setAuditManifest(audit);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading manifest...</p>
      </div>
    );
  }

  if (error || !envelope || !auditManifest) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-destructive">Error: {error || "Unknown error"}</p>
        <Link to="/" className="text-primary underline">
          Back to manifests
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <DependencyVisualizer
        manifestId={id!}
        dependencyManifest={envelope.manifest}
        auditManifest={auditManifest}
      />
    </div>
  );
}
