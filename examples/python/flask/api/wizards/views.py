from flask.views import MethodView
from flask import request, Blueprint
from api.wizards.services import WizardService

wizards_bp = Blueprint("wizards", __name__)


class WizardListView(MethodView):
    def get(self, *args, **kwargs):
        wizards = WizardService().get_wizards()
        return wizards


# @nanoapi path:/api/wizards method:GET
wizards_bp.add_url_rule(
    "/", view_func=WizardListView.as_view("wizard_list"), methods=["GET"]
)


class WizardCreateView(MethodView):
    def post(self, *args, **kwargs):
        data = request.get_json()
        new_wizard = WizardService().create_wizard(data)
        return new_wizard


# @nanoapi path:/api/wizards method:POST
wizards_bp.add_url_rule(
    "/", view_func=WizardCreateView.as_view("wizard_create"), methods=["POST"]
)


class WizardDetailView(MethodView):
    def get(self, wizard_id, *args, **kwargs):
        wizard = WizardService().get_wizard(wizard_id)
        return wizard


# @nanoapi path:/api/wizards/<wizard_id> method:GET
wizards_bp.add_url_rule(
    "/<int:wizard_id>",
    view_func=WizardDetailView.as_view("wizard_detail"),
    methods=["GET"],
)


class WizardUpdateView(MethodView):
    def put(self, wizard_id, *args, **kwargs):
        data = request.get_json()
        updated_wizard = WizardService().update_wizard(wizard_id, data)
        return updated_wizard


# @nanoapi path:/api/wizards/<wizard_id> method:PUT
wizards_bp.add_url_rule(
    "/<int:wizard_id>",
    view_func=WizardUpdateView.as_view("wizard_update"),
    methods=["PUT"],
)


class WizardDeleteView(MethodView):
    def delete(self, wizard_id, *args, **kwargs):
        WizardService().delete_wizard(wizard_id)
        return None


# @nanoapi path:/api/wizards/<wizard_id> method:DELETE
wizards_bp.add_url_rule(
    "/<int:wizard_id>",
    view_func=WizardDeleteView.as_view("wizard_delete"),
    methods=["DELETE"],
)
