import AppSidebar from "../../components/AppSidebar";
import ProjectsList from "./ProjectsList";

export default function ProjectsPage() {
  return (
    <div className="flex gap-x-2 min-h-screen text-white bg-[#0B0A32] p-2">
      <AppSidebar />
      <ProjectsList />
    </div>
  );
}