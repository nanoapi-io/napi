import {
  type FileAuditManifest,
  type FileDependencyManifest,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
  type SymbolAuditManifest,
  type SymbolDependencyManifest,
} from "@napi/shared";
import { Alert, AlertDescription } from "../../../shadcn/Alert.tsx";

export default function Metrics(props: {
  dependencyManifest:
    | FileDependencyManifest
    | SymbolDependencyManifest
    | undefined;
  auditManifest: FileAuditManifest | SymbolAuditManifest | undefined;
}) {
  function metricToHumanString(metric: string) {
    switch (metric) {
      case metricLinesCount:
        return "Lines";
      case metricCodeLineCount:
        return "Code Lines";
      case metricCharacterCount:
        return "Characters";
      case metricCodeCharacterCount:
        return "Code Characters";
      case metricDependencyCount:
        return "Dependencies";
      case metricDependentCount:
        return "Dependents";
      case metricCyclomaticComplexity:
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
            <div>
              {value}
            </div>
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
