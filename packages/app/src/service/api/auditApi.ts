// import { AuditFile } from "./types";

import apiAuditData from "../../auditData";

export async function getProjectOverview() {
  // const response = await fetch("/api/audit/project", {
  //   method: "GET",
  // });

  // if (!response.ok || response.status !== 200) {
  //   throw new Error("Failed to get project overview");
  // }

  // const responseBody = (await response.json()) as Promise<{
  //   files: AuditFile[];
  // }>;

  const responseBody = {
    files: apiAuditData(),
  }

  return await responseBody;
}
