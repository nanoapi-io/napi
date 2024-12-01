from flask.views import MethodView
from flask import request, Blueprint
from api.services.hobbits import HobbitService

hobbits_bp = Blueprint("hobbits", __name__)


class HobbitListView(MethodView):
    def get(self, *args, **kwargs):
        hobbits = HobbitService().get_hobbits()
        return hobbits


# @nanoapi method:GET path:/api/hobbits group:hobbit_read
hobbits_bp.add_url_rule(
    "/", view_func=HobbitListView.as_view("hobbit_list"), methods=["GET"]
)


class HobbitCreateView(MethodView):
    def post(self, *args, **kwargs):
        data = request.get_json()
        new_hobbit = HobbitService().create_hobbit(data)
        return new_hobbit


# @nanoapi method:POST path:/api/hobbits group:hobbit_write
hobbits_bp.add_url_rule(
    "/", view_func=HobbitCreateView.as_view("hobbit_create"), methods=["POST"]
)


class HobbitDetailView(MethodView):
    def get(self, hobbit_id, *args, **kwargs):
        hobbit = HobbitService().get_hobbit(hobbit_id)
        return hobbit


# @nanoapi method:GET path:/api/hobbits/<hobbit_id> group:hobbit_read
hobbits_bp.add_url_rule(
    "/<int:hobbit_id>",
    view_func=HobbitDetailView.as_view("hobbit_detail"),
    methods=["GET"],
)


class HobbitUpdateView(MethodView):
    def put(self, hobbit_id, *args, **kwargs):
        data = request.get_json()
        updated_hobbit = HobbitService().update_hobbit(hobbit_id, data)
        return updated_hobbit


# @nanoapi method:PUT path:/api/hobbits/<hobbit_id> group:hobbit_write
hobbits_bp.add_url_rule(
    "/<int:hobbit_id>",
    view_func=HobbitUpdateView.as_view("hobbit_update"),
    methods=["PUT"],
)


class HobbitDeleteView(MethodView):
    def delete(self, hobbit_id, *args, **kwargs):
        HobbitService().delete_hobbit(hobbit_id)
        return None


# @nanoapi method:DELETE path:/api/hobbits/<hobbit_id> group:hobbit_write
hobbits_bp.add_url_rule(
    "/<int:hobbit_id>",
    view_func=HobbitDeleteView.as_view("hobbit_delete"),
    methods=["DELETE"],
)
