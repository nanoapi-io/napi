import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";
import { SegmentedControl } from "@radix-ui/themes";

import ChangeThemeButton from "../../components/ChangeThemeButton"
import AccountMenu from "../../components/AccountMenu"

import ProjectOverview from "./ProjectOverview";
import ProjectSplitConfigure from "./ProjectSplitConfigure";
import ProjectAudit from "./ProjectAudit";
import { Project } from "../../types";

export default function ProjectPage(props: {
  project: Project;
}) {
  const location = useLocation();
  const { id } = useParams();
  
  const getActiveDefaultValue = () => {
    if (location.pathname.includes("splitConfigure")) {
      return "api";
    } else if (location.pathname.includes("audit")) {
      return "audit";
    }
    return "overview";
  }
  
  const [activePage, setActivePage] = useState(getActiveDefaultValue());

  const handleSegmentedControlChange = (e: any, route: string) => {
    e.preventDefault();
    window.location.pathname = route;
  }

  useEffect(() => {
    // Force reload on route change
    setActivePage(getActiveDefaultValue());
  }, []);


  return (
    <div className="w-full text-text-light dark:text-white bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl flex flex-col">
      {/* Top bar with project search on the left and the account icon on the right */}
      <div className="flex justify-between p-2 border-b-[1px] border-foreground-light dark:border-foreground-dark">
        <div>
          <SegmentedControl.Root defaultValue={activePage} size="3" variant="classic" onValueChange={(e) => setActivePage(e)}>
            <SegmentedControl.Item 
              value="overview"
              onClick={(e) => handleSegmentedControlChange(e, `/project/${id}/overview`)}
              >Overview</SegmentedControl.Item>
            <SegmentedControl.Item 
              value="api"
              onClick={(e) => handleSegmentedControlChange(e, `/project/${id}/splitConfigure`)}
              >API</SegmentedControl.Item>
            <SegmentedControl.Item 
              value="audit"
              onClick={(e) => handleSegmentedControlChange(e, `/project/${id}/audit`)}
              >Audit</SegmentedControl.Item>
          </SegmentedControl.Root>
        </div>
        <div className="flex gap-x-2">
          <ChangeThemeButton />
          <AccountMenu />
        </div>
      </div>
      <div className="flex flex-col p-4">
        <div className="flex flex-col gap-y-2">
          <h1 className="text-2xl font-bold">{props.project.name}</h1>
        </div>
      </div>
      {/* Overview */}
      {getActiveDefaultValue() === "overview" && <ProjectOverview project={props.project} />}
      {/* Split Configure */}
      {getActiveDefaultValue() === "api" && <ProjectSplitConfigure />}
      {/* Audit */}
      {getActiveDefaultValue() === "audit" && <ProjectAudit />}
    </div>
  );
}