from api.data.elves import Elf, elves


class ElfService:
    def get_elves(self):
        return elves

    def get_elf(self, elf_id):
        for elf in elves:
            if elf.id == elf_id:
                return elf
        return None

    def create_elf(self, data):
        new_elf = Elf(data)
        elves.append(new_elf)
        return new_elf

    def update_elf(self, elf_id, data):
        elf: Elf = elves[elf_id]
        elf.update(data)
        return elf

    def delete_elf(self, elf_id):
        for elf in elves:
            if elf.id == elf_id:
                elves.remove(elf)
