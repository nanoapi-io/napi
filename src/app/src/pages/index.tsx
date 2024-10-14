import { Button } from "@radix-ui/themes";
import ApiTree from "../components/ApiTree/ApiTree";
import { useState } from "react";
import { Endpoint, scanCodebase } from "../service/api/scan";
import LoadCodeBaseDialog from "../components/LoadCodeBaseDialog";
import { toast } from "react-toastify";

export default function App() {
  const [loading, setLoading] = useState<boolean>(false);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function handleOnLoad(entrypoint: string, targetDir?: string) {
    setLoading(true);
    try {
      const endpointsPromise = scanCodebase({ entrypoint, targetDir });
      toast.promise(endpointsPromise, {
        success: "Codebase loaded",
        error: "Failed to load codebase",
        pending: "Loading codebase...",
      });
      await delay(250);
      setEndpoints(await endpointsPromise);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex gap-2">
        <LoadCodeBaseDialog onLoad={handleOnLoad} />
        <Button color="purple">Edit grouping</Button>
        <Button color="purple">Generate Split</Button>
      </div>
      {loading && <div>Loading...</div>}
      <div
        className="bg-dark-3 text-dark"
        style={{ height: "calc(100vh - 150px)", width: "100hh" }}
      >
        <ApiTree loading={loading} endpoints={endpoints} />
      </div>
    </div>
  );
}
