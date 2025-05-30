import type {
  AuditManifest,
  DependencyManifest,
  SymbolsToExtract,
} from "@napi/shared";

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

export async function runExtraction(
  symbolsToExtract: SymbolsToExtract,
): Promise<{ success: boolean }> {
  const response = await fetch("/api/extractSymbol/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(symbolsToExtract),
  });

  if (!response.ok || response.status !== 200) {
    throw new Error("Failed to run extraction");
  }

  return await response.json();
}
