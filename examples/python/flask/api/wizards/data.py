class Wizard:
    def __init__(self, data):
        self.id = data.get("id")
        self.name = data.get("name")

    def update(self, data):
        self.name = data.get("name")


wizards = [
    {"id": 1, "name": "Harry Potter"},
    {"id": 2, "name": "Hermione Granger"},
    {"id": 3, "name": "Ron Weasley"},
]
