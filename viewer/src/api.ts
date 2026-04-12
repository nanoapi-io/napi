import type { DependencyManifest } from "./types/dependencyManifest";
import type { AuditManifest } from "./types/auditManifest";

export interface ManifestListItem {
  id: string;
  branch: string;
  commitSha: string;
  commitShaDate: string;
  createdAt: string;
  fileCount: number;
}

export interface ManifestEnvelope {
  id: string;
  branch: string;
  commitSha: string;
  commitShaDate: string;
  createdAt: string;
  manifest: DependencyManifest;
}

const BASE = "/api";

export async function fetchManifests(): Promise<ManifestListItem[]> {
  const res = await fetch(`${BASE}/manifests`);
  return res.json();
}

export async function fetchManifest(id: string): Promise<ManifestEnvelope> {
  const res = await fetch(`${BASE}/manifests/${id}`);
  if (!res.ok) throw new Error("Manifest not found");
  return res.json();
}

export async function fetchAudit(id: string): Promise<AuditManifest> {
  const res = await fetch(`${BASE}/manifests/${id}/audit`);
  if (!res.ok) throw new Error("Audit not found");
  return res.json();
}
