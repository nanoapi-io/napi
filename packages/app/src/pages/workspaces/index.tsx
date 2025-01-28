import AppSidebar from "../../components/AppSidebar";
import WorkspacesList from "./WorkspacesList";

export default function WorkspacesPage() {
  return (
    <div className="flex gap-x-2 min-h-screen text-white bg-background-light dark:bg-background-dark p-2">
      <AppSidebar />
      <WorkspacesList />
    </div>
  );
}