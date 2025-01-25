export type Project = {
  id: string;
  name: string;
  updatedAt: Date;
  viewedAt: Date;
  language: string;
}

export default function ProjectCard(project: Project) {
  return (
    <div className="relative flex flex-col bg-[#212047] rounded-lg border-[1px] border-[#2B2A51] cursor-pointer hover:shadow-lg hover:mt-[-2px] transition-all">
      <div className="absolute top-4 right-4 border-[1px] bg-[#212047] border-[#35345B] rounded-xl hover:bg-[#0000000D]">
        <button className="px-2 py-1.5 align-middle">
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            xmlns="http://www.w3.org/2000/svg"
            className="text-text-light dark:text-text-dark"
            fill="currentColor"
          >
            <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z" />
          </svg>
        </button>
      </div>
      <div className="flex justify-center h-[128px] bg-[#00000033]">
        <h1 className="my-auto">{project.language}</h1>
      </div>
      <div className="h-[128px] flex flex-col p-4 gap-y-2.5">
        <h2 className="text-xl font-bold">{project.name}</h2>
        <p className="text-[#7775AC] pb-1">Edited・{project.updatedAt.toDateString()}</p>
        <div className="flex gap-x-3">
          {/* Profile or org photo */}
          <img className="w-6 h-6 rounded-full" src="https://randomuser.me/api/portraits/men/75.jpg" alt="Profile" />
          <p className="font-semibold">Viewed: {project.viewedAt.toDateString()}</p>
        </div>
      </div>
    </div>
  )
}