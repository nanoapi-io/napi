import { Link } from "react-router";
import type { ReactNode } from "react";
import { Button, Callout, ScrollArea, Separator, Text } from "@radix-ui/themes";
import {
  LuCircleX,
  LuCode,
  LuFileText,
  LuSearchCode,
  LuTriangle,
  LuX,
} from "react-icons/lu";
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
} from "@napi/shared";

// Subcomponent for section headings
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="font-semibold text-lg mt-4 mb-2 flex items-center gap-2">
      {children}
    </div>
  );
}

// Metric item component for consistent display
function MetricItem({
  label,
  value,
  alert,
}: {
  label: string;
  value: number | string;
  alert?: { message: { long: string } };
}) {
  return (
    <div className="mb-2">
      <div className="flex justify-between py-1">
        <Text as="span" className="font-medium">
          {label}:
        </Text>
        <div className="flex items-center gap-2">
          <Text as="span">{value}</Text>
          {alert && <LuTriangle className="text-sm text-amber-500" />}
        </div>
      </div>
      {alert && (
        <Callout.Root color="amber" className="mt-1">
          <Callout.Icon>
            <LuCircleX />
          </Callout.Icon>
          <Callout.Text>{alert.message.long}</Callout.Text>
        </Callout.Root>
      )}
    </div>
  );
}

// Alert badge component
function AlertBadge({ count }: { count: number }) {
  return (
    <div className="flex items-center space-x-1">
      <LuTriangle
        className={`text-lg ${count > 0 ? "text-amber-500" : "text-gray-400"}`}
      />
      <span className={count > 0 ? "text-amber-500" : "text-gray-400"}>
        {count}
      </span>
    </div>
  );
}

// Symbol metrics and alerts component
function SymbolSection({
  symbol,
  fileDependencyManifest,
}: {
  symbol: {
    id: string;
    alerts: Record<string, { message: { long: string }; metric: string }>;
  };
  fileDependencyManifest: FileDependencyManifest;
}) {
  const symbolData = fileDependencyManifest.symbols[symbol.id];
  const alerts = Object.values(symbol.alerts);
  const alertsByMetric = alerts.reduce(
    (acc, alert) => {
      if (alert.metric) {
        acc[alert.metric] = alert;
      }
      return acc;
    },
    {} as Record<string, (typeof alerts)[0]>,
  );

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center">
        <Text
          as="span"
          className="font-semibold break-words text-wrap max-w-[300px]"
        >
          {symbolData.type}: {symbol.id}
        </Text>
        <AlertBadge count={alerts.length} />
      </div>

      <div className="rounded-md bg-gray-100 dark:bg-gray-800 p-3 mt-1">
        {symbolData.metrics &&
          Object.entries(symbolData.metrics).map(([metricKey, value]) => (
            <MetricItem
              key={metricKey}
              label={metricKey.replace(/^metric/, "")}
              value={value as number | string}
              alert={alertsByMetric[metricKey]}
            />
          ))}
      </div>
    </div>
  );
}

export default function FileDetailsPane(props: {
  fileDependencyManifest: FileDependencyManifest;
  fileAuditManifest: FileAuditManifest;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { fileDependencyManifest, fileAuditManifest, open, setOpen } = props;
  const fileName = fileDependencyManifest.filePath.split("/").pop() || "";
  const fileAlerts = Object.values(fileAuditManifest.alerts) as {
    message: { long: string };
    metric: string;
  }[];

  // Organize alerts by their metric for file metrics
  const alertsByMetric = fileAlerts.reduce(
    (acc, alert) => {
      if (alert.metric) {
        acc[alert.metric] = alert;
      }
      return acc;
    },
    {} as Record<string, (typeof fileAlerts)[0]>,
  );

  return (
    <div
      className={`fixed top-[6%] right-0 h-[92%] w-[400px] rounded-l-lg bg-background-light dark:bg-secondaryBackground-dark shadow-xl z-[8888] transition-transform duration-300 translate-x-0 ${
        open ? "translate-x-0" : "translate-x-[400px]"
      }`}
    >
      <ScrollArea className="h-full p-6" scrollbars="vertical">
        {/* Header */}
        <div className="flex justify-between items-center my-4 max-w-[388px]">
          <h2 className="text-xl font-semibold font-mono break-words text-wrap max-w-[310px]">
            {fileName}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xl text-gray-light hover:text-black dark:text-gray-dark dark:hover:text-white"
          >
            <LuX />
          </button>
        </div>
        <Separator className="w-full" />

        {/* File Metrics with Alerts */}
        <SectionHeading>
          <div className="w-full flex justify-between items-center">
            <div className="flex items-center gap-2">
              <LuFileText />
              <div>File Metrics</div>
            </div>
            <AlertBadge count={fileAlerts.length} />
          </div>
        </SectionHeading>
        <div className="rounded-md bg-gray-100 dark:bg-gray-800 p-3">
          <MetricItem
            label="Lines Total"
            value={fileDependencyManifest.metrics[metricLinesCount]}
            alert={alertsByMetric[metricLinesCount]}
          />
          <MetricItem
            label="Lines of Code"
            value={fileDependencyManifest.metrics[metricCodeLineCount]}
            alert={alertsByMetric[metricCodeLineCount]}
          />
          <MetricItem
            label="Characters"
            value={fileDependencyManifest.metrics[metricCharacterCount]}
            alert={alertsByMetric[metricCharacterCount]}
          />
          <MetricItem
            label="Code Characters"
            value={fileDependencyManifest.metrics[metricCodeCharacterCount]}
            alert={alertsByMetric[metricCodeCharacterCount]}
          />
          <MetricItem
            label="Cyclomatic Complexity"
            value={fileDependencyManifest.metrics[metricCyclomaticComplexity]}
            alert={alertsByMetric[metricCyclomaticComplexity]}
          />
          <MetricItem
            label="Dependencies"
            value={fileDependencyManifest.metrics[metricDependencyCount]}
            alert={alertsByMetric[metricDependencyCount]}
          />
          <MetricItem
            label="Dependents"
            value={fileDependencyManifest.metrics[metricDependentCount]}
            alert={alertsByMetric[metricDependentCount]}
          />
        </div>

        {/* Symbols with their metrics and alerts */}
        <SectionHeading>
          <LuCode /> Symbols
        </SectionHeading>

        {/* Total symbols count */}
        <div className="mb-3">
          <MetricItem
            label="Total Symbols"
            value={Object.keys(fileDependencyManifest.symbols).length}
          />
          <div className="mt-2">
            <ul className="list-inside list-disc">
              {Object.entries(
                Object.values(fileDependencyManifest.symbols).reduce(
                  (acc, symbol) => {
                    acc[symbol.type] = (acc[symbol.type] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                ),
              ).map(([type, count]) => (
                <li key={type} className="text-sm">
                  <span className="font-medium">{type}:</span> {count}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Individual symbols with their metrics and alerts */}
        <div className="mt-3">
          {Object.values(fileAuditManifest.symbols).map((symbol) => (
            <SymbolSection
              key={symbol.id}
              symbol={symbol}
              fileDependencyManifest={fileDependencyManifest}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grow flex flex-col justify-end">
          <Link
            to={`/audit/${encodeURIComponent(fileDependencyManifest.filePath)}`}
            className="block"
          >
            <Button
              variant="ghost"
              size="3"
              className="flex justify-center gap-2 text-text-light dark:text-text-dark w-full"
            >
              <LuSearchCode className="text-xl my-auto" />
              <span className="my-auto">Inspect file interactions</span>
            </Button>
          </Link>
        </div>
      </ScrollArea>
    </div>
  );
}
