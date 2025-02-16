import { useEffect, useState } from "react";
import { SegmentedControl } from "@radix-ui/themes";
import AccountMenu from "../../components/AccountMenu";
import NewProjectDialog from "./NewProjectDialog";
import ProjectCard from "./ProjectCard";
import ChangeThemeButton from "../../components/ChangeThemeButton";
import { Project } from "../../types";


export default function ProjectsList() {
  const projectsList: Project[] = [{
    id: 1,
    name: "Frontend",
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
  const [projects, setProjects] = useState<Project[]>(projectsList);
  const [loading] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    // fetchProjects();
  }, []);

  // async function fetchProjects() {
  //   const projects = [] as Project[]; //await getProjects();
  //   setProjects(projects);
  //   setLoading(false);
  // }

  // Filter the projects based on the search text
  useEffect(() => {
    if (!searchText) {
      setProjects(projectsList);
      return;
    }
    const filteredProjects = projectsList.filter((project) => {
      return project.name.toLowerCase().includes(searchText.toLowerCase());
    });
    setProjects(filteredProjects);
  }, [searchText]);

  return (
    <div className="w-full text-text-light dark:text-white bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl flex flex-col">
      {/* Top bar with project search on the left and the account icon on the right */}
      <div className="flex justify-between p-2 border-b-[1px] border-foreground-light dark:border-foreground-dark">
        <div className="flex text-gray-light dark:text-gray-dark bg-search-bgLight dark:bg-search-bgDark rounded-lg px-3 py-2.5 gap-x-2 border-[1px] border-search-bgLight dark:border-search-bgDark dark:focus-within:border-borderDarkHighlight focus-within:border-borderLightHighlight">
          <svg width="20px" height="20px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="none" className="my-auto">
            <path fill="currentColor" fill-rule="evenodd" d="M4 9a5 5 0 1110 0A5 5 0 014 9zm5-7a7 7 0 104.2 12.6.999.999 0 00.093.107l3 3a1 1 0 001.414-1.414l-3-3a.999.999 0 00-.107-.093A7 7 0 009 2z"/>
          </svg>
          <input 
            type="text" 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search for projects"
            className="bg-[#2C2C50] min-w-72 focus:ring-0 focus:outline-none" />
        </div>
        <div className="flex gap-x-2">
          <ChangeThemeButton />
          <NewProjectDialog />
          <AccountMenu />
        </div>
      </div>
      <div className="grow flex flex-col p-4">
        <div className="flex flex-col gap-y-2">
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-text-gray">Here is something cool about my cool project</p>
        </div>
        <div className="pt-4 pb-3">
          <SegmentedControl.Root defaultValue="all" variant="classic" className="">
            <SegmentedControl.Item value="all">All</SegmentedControl.Item>
            <SegmentedControl.Item value="oldest">Oldest</SegmentedControl.Item>
            <SegmentedControl.Item value="latest">Latest</SegmentedControl.Item>
          </SegmentedControl.Root>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : projects.length > 0 || searchText ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} {...project} />
            ))}
          </div>
        ) : (
          <div className="w-full h-max flex flex-col justify-center items-center gap-y-3 grow">
            <img src="/svg/empty-projects.svg" alt="" />
            <h1 className="text-2xl font-semibold">You have no projects yet...</h1>
            <p className="text-text-gray pb-2">Create or import a project to get started</p>
            <NewProjectDialog />
          </div>
        )}
      </div>
    </div>
  );
}