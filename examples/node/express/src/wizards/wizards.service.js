import wizards from "./wizards.data.js";

export const findAll = async () => {
  return wizards;
};

export const findById = async (id) => {
  return wizards.find((wizard) => wizard.id === parseInt(id));
};

export const create = async (wizard) => {
  wizards.push(wizard);
  return wizard;
};
