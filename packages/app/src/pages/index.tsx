import { useEffect, useState } from "react";
import {
  getAuditManifest,
  getDependencyManifest,
} from "../service/api/index.ts";
import type { AuditManifest, DependencyManifest } from "@napi/shared";
import { toast } from "sonner";
import DependencyVisualizer from "../components/DependencyVisualizer/DependencyVisualizer.tsx";
import { Loader } from "lucide-react";

export default function IndexPage() {
  const [auditManifest, setAuditManifest] = useState<AuditManifest | undefined>(
    undefined,
  );
  const [dependencyManifest, setDependencyManifest] = useState<
    DependencyManifest | undefined
  >(undefined);

  useEffect(() => {
    async function handleOnLoad() {
      const dependencyManifestPromise = getDependencyManifest();
      const auditManifestPromise = getAuditManifest();

      const allPromise = Promise.all([
        dependencyManifestPromise,
        auditManifestPromise,
      ]);

      toast.promise(allPromise, {
        loading: "Loading manifests",
        success: "Manifests loaded successfully",
        error: "Failed to load manifests",
      });

      const [dependencyManifest, auditManifest] = await allPromise;

      setDependencyManifest(dependencyManifest);
      setAuditManifest(auditManifest);
    }

    handleOnLoad();
  }, []);

  return (
    <div className="min-h-screen w-full">
      {auditManifest && dependencyManifest
        ? (
          <DependencyVisualizer
            dependencyManifest={dependencyManifest}
            auditManifest={auditManifest}
          />
        )
        : (
          <div className="min-h-screen w-full flex gap-4 justify-center items-center">
            <Loader className="animate-spin" size={44} />
            <p className="text-2xl text-muted-foreground">Loading...</p>
          </div>
        )}
    </div>
  );
}
