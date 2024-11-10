type Hobbit = {
  id: number;
  name: string;
};

const hobbits: Hobbit[] = [
  { id: 1, name: "Samwise Gamgee" },
  { id: 2, name: "Frodo Baggins" },
];

export const findAll = async () => {
  return hobbits;
};

export const findById = async (id: number) => {
  return hobbits.find((hobbit) => hobbit.id === id);
};

export const create = async (hobbit: Hobbit) => {
  hobbits.push(hobbit);
  return hobbit;
};
