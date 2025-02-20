import { useLocation } from "react-router";
import BaseAudit from "../audit";

export default function ProjectAudit(props: {
  isOpen: boolean;
}) {
  const location = useLocation();

  return (
    // <div className="flex gap-x-2 min-h-screen text-white bg-background-light dark:bg-background-dark p-2">
    // </div>
    <>
      {/* If the current route has /audit, then show BaseAudit and Audit, if it has audit/:file then show AuditFile */}
      {location.pathname.includes("/audit") && (
        <BaseAudit isOpen={props.isOpen} />
      )}
    </>
  );
}