from flask.views import MethodView
from flask import request, Blueprint
from .services import WizardService

class WizardListView(MethodView):
    def get(self, *args, **kwargs):
        wizards = WizardService().get_wizards()
        return wizards


class WizardCreateView(MethodView):
    def post(self, *args, **kwargs):
        data = request.get_json()
        new_wizard = WizardService().create_wizard(data)
        return new_wizard


class WizardDetailView(MethodView):
    def get(self, wizard_id, *args, **kwargs):
        wizard = WizardService().get_wizard(wizard_id)
        return wizard


class WizardUpdateView(MethodView):
    def put(self, wizard_id, *args, **kwargs):
        data = request.get_json()
        updated_wizard = WizardService().update_wizard(wizard_id, data)
        return updated_wizard


class WizardDeleteView(MethodView):
    def delete(self, wizard_id, *args, **kwargs):
        WizardService().delete_wizard(wizard_id)
        return None


def get_wizzards_bp():
    wizards_bp = Blueprint("wizards", __name__)

    # @nanoapi method:GET path:/api/wizards group:wizard_read
    wizards_bp.add_url_rule(
        "/", view_func=WizardListView.as_view("wizard_list"), methods=["GET"]
    )

    # @nanoapi method:POST path:/api/wizards group:wizard_write
    wizards_bp.add_url_rule(
        "/", view_func=WizardCreateView.as_view("wizard_create"), methods=["POST"]
    )

    # @nanoapi method:GET path:/api/wizards/<wizard_id> group:wizard_read
    wizards_bp.add_url_rule(
        "/<int:wizard_id>",
        view_func=WizardDetailView.as_view("wizard_detail"),
        methods=["GET"],
    )

    # @nanoapi method:PUT path:/api/wizards/<wizard_id> group:wizard_write
    wizards_bp.add_url_rule(
        "/<int:wizard_id>",
        view_func=WizardUpdateView.as_view("wizard_update"),
        methods=["PUT"],
    )

    # @nanoapi method:DELETE path:/api/wizards/<wizard_id> group:wizard_write
    wizards_bp.add_url_rule(
        "/<int:wizard_id>",
        view_func=WizardDeleteView.as_view("wizard_delete"),
        methods=["DELETE"],
    )
    
    return wizards_bp