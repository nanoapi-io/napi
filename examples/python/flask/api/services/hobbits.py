from api.data.hobbits import Hobbit, hobbits


class HobbitService:
    def get_hobbits(self):
        return hobbits

    def get_hobbit(self, hobbit_id):
        for hobbit in hobbits:
            if hobbit.id == hobbit_id:
                return hobbit
        return None

    def create_hobbit(self, data):
        new_hobbit = Hobbit(data)
        hobbits.append(new_hobbit)
        return new_hobbit

    def update_hobbit(self, hobbit_id, data):
        hobbit: Hobbit = hobbits[hobbit_id]
        hobbit.update(data)
        return hobbit

    def delete_hobbit(self, hobbit_id):
        for hobbit in hobbits:
            if hobbit.id == hobbit_id:
                hobbits.remove(hobbit)
