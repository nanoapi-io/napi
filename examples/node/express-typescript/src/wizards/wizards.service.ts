import wizards from "./wizards.data";
import { Wizard } from "./wizards.data";

export const findAll = async () => {
  return wizards;
};

export const findById = async (id: number) => {
  return wizards.find((wizard) => wizard.id === id);
};

export const create = async (wizard: Wizard) => {
  wizards.push(wizard);
  return wizard;
};
