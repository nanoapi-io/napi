import type { DependencyManifest } from "../../../../types/dependencyManifest.ts";
import type { AuditManifest } from "../../../../types/auditManifest.ts";
import { Alert, AlertDescription } from "../../../shadcn/Alert.tsx";

export default function Metrics(props: {
  dependencyManifest:
    | DependencyManifest[string]
    | DependencyManifest[string]["symbols"][string]
    | undefined;
  auditManifest:
    | AuditManifest[string]
    | AuditManifest[string]["symbols"][string]
    | undefined;
}) {
  function metricToHumanString(metric: string) {
    switch (metric) {
      case "linesCount":
        return "Lines";
      case "codeLineCount":
        return "Code Lines";
      case "characterCount":
        return "Characters";
      case "codeCharacterCount":
        return "Code Characters";
      case "dependencyCount":
        return "Dependencies";
      case "dependentCount":
        return "Dependents";
      case "cyclomaticComplexity":
        return "Cyclomatic Complexity";
      default:
        return metric;
    }
  }

  return (
    <div className="flex flex-col space-y-2">
      {Object.entries(props.dependencyManifest?.metrics || {}).map((
        [key, value],
      ) => (
        <div key={key} className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {metricToHumanString(key)}
            </div>
            <div>{value}</div>
          </div>
          {(props.auditManifest?.alerts || {})?.[key] && (
            <Alert variant="destructive">
              <AlertDescription>
                {props.auditManifest?.alerts?.[key]?.message?.long}
              </AlertDescription>
            </Alert>
          )}
        </div>
      ))}
    </div>
  );
}
