from flask.views import MethodView
from flask import request, Blueprint
from api.services.elves import ElfService

elves_bp = Blueprint("elves", __name__)


class ElfListView(MethodView):
    def get(self, *args, **kwargs):
        elves = ElfService().get_elves()
        return elves


# @nanoapi path:/api/elves method:GET
elves_bp.add_url_rule("/", view_func=ElfListView.as_view("elf_list"), methods=["GET"])


class ElfCreateView(MethodView):
    def post(self, *args, **kwargs):
        data = request.get_json()
        new_elf = ElfService().create_elf(data)
        return new_elf


# @nanoapi path:/api/elves method:POST
elves_bp.add_url_rule(
    "/", view_func=ElfCreateView.as_view("elf_create"), methods=["POST"]
)


class ElfDetailView(MethodView):
    def get(self, elf_id, *args, **kwargs):
        elf = ElfService().get_elf(elf_id)
        return elf


# @nanoapi path:/api/elves/<elf_id> method:GET
elves_bp.add_url_rule(
    "/<int:elf_id>", view_func=ElfDetailView.as_view("elf_detail"), methods=["GET"]
)


class ElfUpdateView(MethodView):
    def put(self, elf_id, *args, **kwargs):
        data = request.get_json()
        updated_elf = ElfService().update_elf(elf_id, data)
        return updated_elf


# @nanoapi path:/api/elves/<elf_id> method:PUT
elves_bp.add_url_rule(
    "/<int:elf_id>", view_func=ElfUpdateView.as_view("elf_update"), methods=["PUT"]
)


class ElfDeleteView(MethodView):
    def delete(self, elf_id, *args, **kwargs):
        ElfService().delete_elf(elf_id)
        return None


# @nanoapi path:/api/elves/<elf_id> method:DELETE
elves_bp.add_url_rule(
    "/<int:elf_id>", view_func=ElfDeleteView.as_view("elf_delete"), methods=["DELETE"]
)
