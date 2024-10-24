import { Skeleton } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import ApiTree from "../components/ApiTree/ApiTree";
import { scanCodebase } from "../service/api/scan";
import { splitCodebase } from "../service/api/split";
import { syncEndpoints } from "../service/api/sync";
import { Endpoint } from "../service/api/types";
import { getConfig } from "../service/api/config";

export default function App() {
  const initialized = useRef(false);

  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const [entrypoint, setEntrypoint] = useState<string>("");
  const [outputDir, setOutputDir] = useState<string | undefined>(undefined);

  const [isOutOfSynced, setIsOutOfSynced] = useState<boolean>(false);
  const [localEndpoints, setLocalEndpoints] = useState<Endpoint[]>([]);

  function handleChangeEndpointGroup(group: string, endpoint: Endpoint) {
    setBusy(true);
    setIsOutOfSynced(true);

    const endpoints = [...localEndpoints];
    const targetEndpoint = endpoints.find(
      (e) => e.path === endpoint.path && e.method === endpoint.method,
    );

    if (!targetEndpoint) {
      toast.error("Unescpected Error: Failed to find endpoint when updating");
      console.error("Unescpected Error: Failed to find endpoint when updating");
    } else {
      targetEndpoint.group = group;
    }

    setLocalEndpoints(endpoints);
    setBusy(false);
  }

  async function handleSync() {
    setBusy(true);
    try {
      const syncPromise = syncEndpoints({
        entrypointPath: entrypoint,
        endpoints: localEndpoints,
      });
      toast.promise(syncPromise, {
        success: "Successfully synced",
        error: "Failed to sync local changes",
        pending: "Syncing local changes...",
      });
      await syncPromise;
      setIsOutOfSynced(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleSplit() {
    setBusy(true);
    try {
      const splitPromise = splitCodebase({
        entrypointPath: entrypoint,
        outputDir: outputDir,
      });
      toast.promise(splitPromise, {
        success: "Successfully splited codebase",
        error: "Failed to split codebase",
        pending: "Splitting codebase...",
      });
      await splitPromise;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    async function handleOnLoad() {
      setChartLoading(true);
      setBusy(true);
      try {
        const configPromise = getConfig();
        toast.promise(configPromise, {
          error: "Failed to load codebase",
          pending: "Loading codebase...",
        });

        const napiConfig = await configPromise;
        setEntrypoint(napiConfig.entrypoint);
        setOutputDir(napiConfig.out);

        const endpointsPromise = scanCodebase({
          entrypointPath: napiConfig.entrypoint,
        });
        toast.promise(endpointsPromise, {
          success: "Codebase loaded",
          error: "Failed to load codebase",
        });

        setLocalEndpoints((await endpointsPromise).endpoints);
        setIsOutOfSynced(false);
      } finally {
        setChartLoading(false);
        setBusy(false);
      }
    }

    if (!initialized.current) {
      initialized.current = true;
      handleOnLoad();
    }
  }, []);

  return (
    <div className="flex flex-col">
      <div
        className="bg-secondaryBackground-dark rounded-3xl overflow-hidden"
        style={{ height: "calc(100vh - 100px)", width: "100hh" }}
      >
        {chartLoading ? (
          <div className="h-full flex flex-col justify-center items-center gap-5">
            <Skeleton width="200px" height="75px" />
            <div className="flex gap-5">
              <Skeleton width="200px" height="75px" />
              <Skeleton width="200px" height="75px" />
            </div>
            <div className="flex gap-5">
              <Skeleton width="200px" height="75px" />
              <Skeleton width="200px" height="75px" />
              <Skeleton width="200px" height="75px" />
              <Skeleton width="200px" height="75px" />
            </div>
          </div>
        ) : localEndpoints.length > 0 ? (
          <ApiTree
            busy={busy}
            endpoints={localEndpoints}
            isOutOfSynced={isOutOfSynced}
            onChangeEndpointGroup={handleChangeEndpointGroup}
            onSync={handleSync}
            onSplit={handleSplit}
          />
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
