import { useParams } from "react-router";
import AppSidebar from "../../components/Sidebar/AppSidebar";
import ProjectPage from "./ProjectPage";
import { type Project } from "../../types";

  const projectsList: Project[] = [{
    id: 1,
    name: "App Server",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    language: "TypeScript",
  },{
    id: 2,
    name: "Listener",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    language: "javascript",
  },{
    id: 3,
    name: "AI Model",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    language: "python",
  },{
    id: 4,
    name: "Backend",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    language: "nodejs",
  },{
    id: 5,
    name: "Engine",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    language: "csharp",
  },{
    id: 6,
    name: "Optimus",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    language: "TypeScript",
  }, ]

export default function Project() {
  const { id } = useParams();
  const project = projectsList.find((project) => project.id === Number(id));

  return (
    <div className="flex gap-x-2 min-h-screen text-text-gray dark:text-white bg-secondaryBackground-light dark:bg-background-dark p-2">
      <AppSidebar />
      <ProjectPage project={project as Project} />
    </div>
  );
}