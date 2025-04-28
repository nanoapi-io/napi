import { Link } from "react-router";
import {
  Button,
  Callout,
  ScrollArea,
  Separator,
  Text,
  Box,
} from "@radix-ui/themes";
import {
  LuX,
  LuCircleX,
  LuSearchCode,
  LuFileText,
  LuCode,
  LuTriangle,
} from "react-icons/lu";
import {
  FileAuditManifest,
  FileDependencyManifest,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "@nanoapi.io/shared";
import { basename } from "path";

// Subcomponent for section headings
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Box className="font-semibold text-lg mt-4 mb-2 flex items-center gap-2">
      {children}
    </Box>
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
    <div className="flex items-center gap-1">
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
        <Text as="span" className="font-semibold">
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
  const fileName = basename(fileDependencyManifest.filePath);
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
    <div className="relative h-full flex justify-end z-1">
      <div
        style={{
          width: open ? "400px" : "0px",
          opacity: open ? 1 : 0,
        }}
        className="z-20 h-full flex flex-col gap-5 bg-background-light dark:bg-background-dark shadow-xl p-6 rounded-l-lg transition-all duration-300 ease-in-out overflow-hidden"
      >
        <ScrollArea className="h-full pr-5" scrollbars="vertical">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold font-mono break-words text-wrap">
                {fileName}
              </h2>
              <Button
                onClick={() => setOpen(false)}
                variant="ghost"
                className="text-xl text-text-light dark:text-text-dark"
              >
                <LuX />
              </Button>
            </div>
            <Separator className="w-full" />
          </div>

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
    </div>
  );
}
