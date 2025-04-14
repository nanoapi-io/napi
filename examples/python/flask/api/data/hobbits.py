class Hobbit:
    def __init__(self, data):
        self.id = data.get("id")
        self.name = data.get("name")

    def update(self, data):
        self.name = data.get("name")


hobbits = [
    {"id": 1, "name": "Frodo Baggins"},
    {"id": 2, "name": "Samwise Gamgee"},
    {"id": 3, "name": "Meriadoc Brandybuck"},
]
