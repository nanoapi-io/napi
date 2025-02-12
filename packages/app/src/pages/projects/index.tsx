import AppSidebar from "../../components/Sidebar/AppSidebar";
import ProjectsList from "./ProjectsList";

export default function ProjectsPage() {
  return (
    <div className="flex gap-x-2 min-h-screen text-white bg-background-light dark:bg-background-dark p-2">
      <AppSidebar />
      <ProjectsList />
    </div>
  );
}