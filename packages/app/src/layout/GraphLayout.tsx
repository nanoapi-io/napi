import { useContext } from "react";
import { Button } from "@radix-ui/themes";
import {
  ThemeContext,
  lightTheme,
  darkTheme,
} from "../contexts/ThemeContext.js";
import { Link, useParams } from "react-router";
import { MdLightMode, MdDarkMode, MdKeyboardArrowLeft } from "react-icons/md";

export default function GraphLayout(props: {
  sideBarSlot?: React.ReactNode;
  graphSlot: React.ReactNode;
}) {
  const themeContext = useContext(ThemeContext);
  const { file } = useParams();
  const isBaseAuditView = file === undefined;

  return (
    <div className="h-screen grow flex gap-3 bg-background-light text-text-light dark:bg-background-dark dark:text-text-dark px-4 py-3">
      {props.sideBarSlot && (
        <div className="flex flex-col gap-2 bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl px-2 py-2">
          {props.sideBarSlot}
        </div>
      )}
      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out">
        <div
          className={`bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl rounded-b-none flex items-center px-2 py-2 ${isBaseAuditView ? "justify-end" : "justify-between"}`}
        >
          <div
            className={`flex items-center space-x-10 ${isBaseAuditView ? "hidden" : ""}`}
          >
            <Link to="/audit">
              <Button
                radius="large"
                variant="ghost"
                size="3"
                className="flex space-x-2 ml-1"
              >
                <MdKeyboardArrowLeft className="h-6 w-6" />
                <span className="">Back</span>
              </Button>
            </Link>
            <h1 className="text-md font-semibold text-gray-500 dark:text-text-dark">
              {file}
            </h1>
          </div>
          <div className="flex gap-4 border border-secondarySurface-light dark:border-secondarySurface-dark px-3 py-2 rounded-xl">
            <Button
              variant="ghost"
              size="1"
              onClick={() => themeContext.changeTheme(lightTheme)}
              className={`p-2.5 rounded-md ${
                themeContext.theme === lightTheme
                  ? "bg-secondarySurface-light"
                  : ""
              }`}
            >
              <MdLightMode className="text-gray-light dark:text-gray-dark h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="1"
              onClick={() => themeContext.changeTheme(darkTheme)}
              className={`p-2.5 rounded-md ${
                themeContext.theme === darkTheme
                  ? "bg-secondarySurface-dark"
                  : ""
              }`}
            >
              <MdDarkMode className="text-gray-light dark:text-gray-dark h-6 w-6" />
            </Button>
          </div>
        </div>
        <div className="relative grow bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl rounded-t-none border-t border-t-border-light dark:border-t-border-dark overflow-hidden">
          {props.graphSlot}
        </div>
      </div>
    </div>
  );
}
