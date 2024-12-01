const hobbits = [
  { id: 1, name: "Samwise Gamgee" },
  { id: 2, name: "Frodo Baggins" },
];

export const findAll = async () => {
  return hobbits;
};

export const findById = async (id) => {
  return hobbits.find((hobbit) => hobbit.id === parseInt(id));
};

export const create = async (hobbit) => {
  hobbits.push(hobbit);
  return hobbit;
};
