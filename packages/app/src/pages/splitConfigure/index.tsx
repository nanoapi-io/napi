import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import SplitConfigureTree from "../../components/ReactFlow/SplitConfigureTree/SplitConfigureTree";
import { scanCodebase } from "../../service/api/splitApi";
import { splitCodebase } from "../../service/api/splitApi";
import { syncEndpoints } from "../../service/api/splitApi";
import { Endpoint } from "../../service/api/types";
import GraphLayout from "../../layout/GraphLayout";

export default function SplitConfigure() {
  const initialized = useRef(false);

  const [firstLoading, setFirstLoading] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const [isOutOfSynced, setIsOutOfSynced] = useState<boolean>(false);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);

  function handleChangeEndpointGroup(group: string, endpoint: Endpoint) {
    setBusy(true);
    setIsOutOfSynced(true);

    const updatedEndpoints = endpoints.map((e) => {
      if (e.path === endpoint.path && e.method === endpoint.method) {
        return {
          ...e,
          group,
        };
      } else {
        return e;
      }
    });

    setEndpoints(updatedEndpoints);
    setBusy(false);
  }

  async function handleSync() {
    setBusy(true);
    try {
      const syncPromise = syncEndpoints({
        endpoints,
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
      const splitPromise = splitCodebase();
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
      setFirstLoading(true);
      setBusy(true);
      try {
        const endpointsPromise = scanCodebase();
        toast.promise(endpointsPromise, {
          success: "Codebase loaded",
          error: "Failed to load codebase",
        });

        setEndpoints((await endpointsPromise).endpoints);
        setIsOutOfSynced(false);
      } finally {
        setFirstLoading(false);
        setBusy(false);
      }
    }

    if (!initialized.current) {
      initialized.current = true;
      handleOnLoad();
    }
  }, []);

  return (
    <GraphLayout
      graphSlot={
        <SplitConfigureTree
          loading={firstLoading}
          busy={busy}
          endpoints={endpoints}
          isOutOfSynced={isOutOfSynced}
          onChangeEndpointGroup={handleChangeEndpointGroup}
          onSync={handleSync}
          onSplit={handleSplit}
        />
      }
    />
  );
}
