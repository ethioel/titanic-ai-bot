from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add project root
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models.titanic_model import TitanicEnsemble
from backend.models.shap_explainer import SHAPExplainer
from backend.models.counterfactual import CounterfactualAnalyzer
from backend.models.historical_twin import HistoricalTwinMatcher
from backend.models.simulator import TitanicSimulator

# ── Pydantic Schemas ──
class PassengerIn(BaseModel):
    Pclass: int = Field(..., ge=1, le=3)
    Sex: str = Field(..., pattern="^(male|female)$")
    Age: float = Field(..., gt=0, lt=120)
    SibSp: int = Field(default=0, ge=0, le=10)
    Parch: int = Field(default=0, ge=0, le=10)
    Fare: float = Field(..., ge=0)
    Embarked: str = Field(default="S", pattern="^[SCQ]$")
    Name: str | None = None

class PredictOut(BaseModel):
    survived: bool
    probability: float
    confidence: float
    feature_importance: Dict[str, float]

class SimStartIn(BaseModel):
    passenger: Dict[str, Any]
    base_probability: float = 0.5

class SimDecideIn(BaseModel):
    state: Dict[str, Any]
    decision_id: str

# ── Lifespan ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    model_path = os.getenv("MODEL_PATH", "./data/models/titanic_ensemble.pkl")
    app.state.model = TitanicEnsemble()
    app.state.model.load_model(model_path)
    app.state.shap = SHAPExplainer(model_path)
    app.state.counterfactual = CounterfactualAnalyzer(model_path)
    app.state.twin_matcher = HistoricalTwinMatcher()
    print("✅ API ready")
    yield

app = FastAPI(
    title="Titanic AI API",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://titanic-ai-bot.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": app.state.model._is_loaded,
        "features": len(app.state.model.feature_names),
    }

@app.post("/predict", response_model=PredictOut)
def predict(payload: PassengerIn):
    try:
        result = app.state.model.predict(payload.model_dump())
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/predict/batch")
def predict_batch(passengers: List[PassengerIn]):
    dicts = [p.model_dump() for p in passengers]
    return app.state.model.predict_batch(dicts)

@app.post("/explain")
def explain(payload: PassengerIn):
    try:
        X = app.state.model.preprocess(__import__("pandas").DataFrame([payload.model_dump()]), is_train=False)
        return {"explanations": app.state.shap.explain_prediction(X.values)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/counterfactuals")
def counterfactuals(payload: PassengerIn, num: int = 3):
    return app.state.counterfactual.generate_counterfactuals(payload.model_dump(), num_alternatives=num)

@app.post("/twin")
def twin(payload: PassengerIn):
    return app.state.twin_matcher.find_twin(payload.model_dump())

@app.post("/simulate/start")
def sim_start(body: SimStartIn):
    sim = TitanicSimulator()
    return sim.initialize_simulation(body.passenger, body.base_probability)

@app.post("/simulate/decide")
def sim_decide(body: SimDecideIn):
    sim = TitanicSimulator.from_dict(body.state)
    result = sim.make_decision(body.decision_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/simulate/status")
def sim_status(state: str):
    import json
    sim = TitanicSimulator.from_dict(json.loads(state))
    return sim.get_status()
