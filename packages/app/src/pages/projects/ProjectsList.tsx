import { useEffect, useState } from "react";

import ProjectCard, { Project } from "./ProjectCard";


export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([{
    id: "1",
    name: "Project 1",
    updatedAt: new Date(),
    viewedAt: new Date(),
    language: "TypeScript",
  }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // fetchProjects();
  }, []);

  async function fetchProjects() {
    const projects = [] as Project[]; //await getProjects();
    setProjects(projects);
    setLoading(false);
  }

  return (
    <div className="h-screen text-white bg-[#15143D]">
      {/* Top bar with project search on the left and the account icon on the right */}
      <div className="flex justify-between p-2 border-b-[1px] border-[#212047]">
        <input type="text" placeholder="Search projects" />
        <button>Account</button>
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-y-2">
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-[#838293]">Here is something cool about my cool project</p>
        </div>
        <div className="pt-4 pb-3">
          <div><p>All | Oldest | Latest</p></div>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} {...project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}