from flask import Flask
from .api.wizards.views import get_wizzards_bp
from api.views.elves import elves_bp
from api.views.hobbits import hobbits_bp

app = Flask(__name__)


@app.get("/")
def hello_world():
    return {"message": "Hello, World!"}


@app.get("/liveness")
def liveness():
    return {"status": "ok"}

# @nanoapi method:GET path:readiness
@app.get("/readiness")
def readiness():
    return {"status": "ok"}

# @nanoapi path:/api/wizards
app.register_blueprint(get_wizzards_bp(), url_prefix="/api/wizards")

# @nanoapi path:/api/elves
app.register_blueprint(elves_bp, url_prefix="/api/elves")

# @nanoapi path:/api/hobbits
app.register_blueprint(hobbits_bp, url_prefix="/api/hobbits")
