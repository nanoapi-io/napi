import { AuditManifest } from "./types/auditManifest";
import { DependencyManifest } from "./types/dependencyManifest";

export async function getDependencyManifest() {
  const response = await fetch("/api/dependency-manifest/", {
    method: "GET",
  });

  if (!response.ok || response.status !== 200) {
    throw new Error("Failed to get dependency manifest");
  }

  const responseBody = (await response.json()) as Promise<DependencyManifest>;

  return await responseBody;
}

export async function getAuditManifest() {
  const response = await fetch("/api/audit-manifest/", {
    method: "GET",
  });

  if (!response.ok || response.status !== 200) {
    throw new Error("Failed to get audit manifest");
  }

  const responseBody = (await response.json()) as Promise<AuditManifest>;

  return await responseBody;
}
