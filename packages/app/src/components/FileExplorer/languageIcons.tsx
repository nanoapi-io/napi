import { LuFileCode } from "react-icons/lu";
import { DiPython } from "react-icons/di";
import { TbBrandCSharp } from "react-icons/tb";
import type { JSX } from "react";

const languageIconMap: Record<string, JSX.Element> = {
  py: (
    <DiPython className="text-2xl text-primary-light dark:text-primary-dark" />
  ),
  cs: (
    <TbBrandCSharp className="text-2xl text-primary-light dark:text-primary-dark" />
  ),
  fallback: (
    <LuFileCode className="text-2xl text-primary-light dark:text-primary-dark" />
  ),
};

export default function languageIcon(fileExtension: string) {
  const icon = languageIconMap[fileExtension] || languageIconMap.fallback;
  return icon;
}
