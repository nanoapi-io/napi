import { Project } from '../../types'

export default function ProjectCard(project: Project) {
  return (
    <div className="relative flex flex-col bg-foreground-light dark:bg-foreground-dark rounded-lg border-[1px] border-borderLight dark:border-border-darkPurple cursor-pointer hover:shadow-lg hover:mt-[-2px] hover:mb-[2px] transition-all">
      <div className="absolute top-4 right-4 border-[1px] bg-foreground-light dark:bg-foreground-dark border-border-light dark:border-border-darkGray rounded-xl hover:bg-hover-light dark:hover:bg-hover-mid">
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
      <div className="flex justify-center h-[128px] bg-hover-light dark:bg-hover-dark">
        <img
          width={80} 
          height={80} 
          src={`/svg/${project.language.toLowerCase()}.svg`} 
          alt="Project language"
          className="" />
      </div>
      <div className="h-[128px] flex flex-col p-4 gap-y-2.5">
        <h2 className="text-xl font-bold">{project.name}</h2>
        <p className="text-text-lightInfo dark:text-text-darkInfo pb-1">Edited・{project.updatedAt}</p>
        <div className="flex gap-x-3">
          {/* Profile or org photo */}
          <img className="w-6 h-6 rounded-full" src="https://randomuser.me/api/portraits/men/75.jpg" alt="Profile" />
          <p className="font-semibold">Team name</p>
        </div>
      </div>
    </div>
  )
}