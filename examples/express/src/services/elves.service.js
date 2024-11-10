const elves = [
  { id: 1, name: "Legolas" },
  { id: 2, name: "Thranduil" },
  { id: 3, name: "Galadriel" },
];

export const findAll = async () => {
  return elves;
};

export const findById = async (id) => {
  return elves.find((elf) => elf.id === parseInt(id));
};

export const create = async (elf) => {
  elves.push(elf);
  return elf;
};
