from flask.views import MethodView
from flask import request, Blueprint
from api.services.hobbits import HobbitService







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





# @nanoapi method:GET path:/api/hobbits/<hobbit_id> group:hobbit_read
hobbits_bp.add_url_rule(
    "/<int:hobbit_id>",
    view_func=HobbitDetailView.as_view("hobbit_detail"),
    methods=["GET"],
)





# @nanoapi method:PUT path:/api/hobbits/<hobbit_id> group:hobbit_write
hobbits_bp.add_url_rule(
    "/<int:hobbit_id>",
    view_func=HobbitUpdateView.as_view("hobbit_update"),
    methods=["PUT"],
)





# @nanoapi method:DELETE path:/api/hobbits/<hobbit_id> group:hobbit_write
hobbits_bp.add_url_rule(
    "/<int:hobbit_id>",
    view_func=HobbitDeleteView.as_view("hobbit_delete"),
    methods=["DELETE"],
)
