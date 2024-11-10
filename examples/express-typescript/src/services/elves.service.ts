type Elf = {
  id: Number;
  name: String;
};

const elves: Elf[] = [
  { id: 1, name: "Legolas" },
  { id: 2, name: "Thranduil" },
  { id: 3, name: "Galadriel" },
];

export const findAll = async () => {
  return elves;
};

export const findById = async (id: Number) => {
  return elves.find((elf) => elf.id === id);
};

export const create = async (elf: Elf) => {
  elves.push(elf);
  return elf;
};
