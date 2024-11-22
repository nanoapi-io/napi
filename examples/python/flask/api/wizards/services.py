from api.wizards.data import Wizard, wizards


class WizardService:
    def get_wizards(self):
        return wizards

    def get_wizard(self, wizard_id):
        for wizard in wizards:
            if wizard.id == wizard_id:
                return wizard
        return None

    def create_wizard(self, data):
        new_wizard = Wizard(data)
        wizards.append(new_wizard)
        return new_wizard

    def update_wizard(self, wizard_id, data):
        wizard: Wizard = wizards[wizard_id]
        wizard.update(data)
        return wizard

    def delete_wizard(self, wizard_id):
        for wizard in wizards:
            if wizard.id == wizard_id:
                wizards.remove(wizard)
