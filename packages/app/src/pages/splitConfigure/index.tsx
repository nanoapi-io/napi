import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import SplitConfigureTree from "../../components/ReactFlow/SplitConfigureTree/SplitConfigureTree";
import { scanCodebase } from "../../service/api/splitApi";
import { splitCodebase } from "../../service/api/splitApi";
import { syncEndpoints } from "../../service/api/splitApi";
import { Endpoint } from "../../service/api/types";
import ReactFlowLayout from "../../layout/ReactFlow";

export default function SplitConfigure() {
  const initialized = useRef(false);

  const [firstLoading, setFirstLoading] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const [isOutOfSynced, setIsOutOfSynced] = useState<boolean>(false);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);

  function handleChangeEndpointGroup(group: string, endpoint: Endpoint) {
    setBusy(true);
    setIsOutOfSynced(true);

    console.log(111111111111, endpoint, group);

    const targetEndpoint = endpoints.find(
      (e) => e.path === endpoint.path && e.method === endpoint.method,
    );

    if (!targetEndpoint) {
      toast.error("Unescpected Error: Failed to find endpoint when updating");
      console.error("Unescpected Error: Failed to find endpoint when updating");
    } else {
      targetEndpoint.group = group;
    }

    setEndpoints(endpoints);
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
    <ReactFlowLayout
      chartSlot={
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
