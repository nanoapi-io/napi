class Elf:
    def __init__(self, data):
        self.id = data.get("id")
        self.name = data.get("name")

    def update(self, data):
        self.name = data.get("name")


elves: list[Elf] = [
    {"id": 1, "name": "Legolas"},
    {"id": 2, "name": "Thranduil"},
    {"id": 3, "name": "Galadriel"},
]
