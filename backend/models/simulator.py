from __future__ import annotations

import logging
from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class TitanicSimulator:
    """
    Emergency simulation engine.
    Backward-compatible methods PLUS to_dict/from_dict for stateless APIs.
    """

    TIMELINE: List[Dict[str, Any]] = [
        {
            "time": "11:40 PM",
            "minutes_from_impact": 0,
            "event": "Titanic strikes iceberg on starboard side.",
            "choices": None,
            "survival_modifier": 0,
        },
        {
            "time": "11:45 PM",
            "minutes_from_impact": 5,
            "event": "Water begins entering the forward compartments.",
            "choices": [
                {"id": "go_upper", "text": "Head to the upper deck immediately", "modifier": 0.05},
                {"id": "stay_cabin", "text": "Go back to your cabin for belongings", "modifier": -0.10},
                {"id": "help_others", "text": "Help others in your area", "modifier": 0.02},
            ],
            "survival_modifier": 0,
        },
        {
            "time": "11:50 PM",
            "minutes_from_impact": 10,
            "event": "First lifeboats begin to be prepared for launch.",
            "choices": [
                {"id": "lifeboat_launch", "text": "Rush to the lifeboat station", "modifier": 0.15},
                {"id": "help_launch", "text": "Assist with lifeboat preparation", "modifier": 0.05},
                {"id": "wait_instructions", "text": "Wait for official instructions", "modifier": -0.05},
            ],
            "survival_modifier": 0,
        },
        {
            "time": "11:55 PM",
            "minutes_from_impact": 15,
            "event": "Ship begins to list to starboard. Panic spreading.",
            "choices": [
                {"id": "stay_calm", "text": "Stay calm and follow procedures", "modifier": 0.03},
                {"id": "panic", "text": "Panic and push towards lifeboats", "modifier": -0.10},
            ],
            "survival_modifier": 0,
        },
    ]

    def __init__(self) -> None:
        self.passenger: Optional[Dict[str, Any]] = None
        self.decisions: List[Dict[str, Any]] = []
        self.survival_probability = 0.5
        self.simulation_active = False
        self.current_time: Optional[datetime] = None
        self.event_idx = 0

    # ================================================================== #
    # Backward-compatible stateful API
    # ================================================================== #
    def initialize_simulation(
        self,
        passenger_data: Dict[str, Any],
        initial_probability: float,
    ) -> Dict[str, Any]:
        """Start the simulation. Backward-compatible."""
        self.passenger = passenger_data
        self.survival_probability = float(initial_probability)
        self.decisions = []
        self.simulation_active = True
        self.event_idx = 0
        self.current_time = datetime(1912, 4, 14, 23, 40)

        return {
            "started": True,
            "current_time": self.current_time.strftime("%I:%M %p"),
            "survival_probability": self.survival_probability,
            "message": "⚠️ The Titanic has struck an iceberg! Emergency simulation started.",
            "next_event": self._current_event(),
        }

    def make_decision(self, decision_id: str) -> Dict[str, Any]:
        """Process a user decision. Backward-compatible."""
        if not self.simulation_active:
            return {"error": "Simulation not active"}

        current_event = self._current_event()
        if current_event is None:
            return {"error": "No more events in timeline"}

        if not current_event.get("choices"):
            # Auto-advance events without choices
            self.event_idx += 1
            return self._build_status_response()

        choice = next(
            (c for c in current_event["choices"] if c["id"] == decision_id),
            None,
        )
        if choice is None:
            return {"error": f"Invalid decision: {decision_id}"}

        # Apply modifier with hard clamp [0, 1]
        self.survival_probability += choice["modifier"]
        self.survival_probability = max(0.0, min(1.0, self.survival_probability))

        self.decisions.append({
            "time": current_event["time"],
            "decision": choice["text"],
            "modifier": choice["modifier"],
            "new_probability": self.survival_probability,
        })

        self.event_idx += 1

        if self.event_idx >= len(self.TIMELINE):
            self.simulation_active = False
            return {
                "complete": True,
                "final_probability": self.survival_probability,
                "survived": self.survival_probability > 0.5,
                "decisions": self.decisions,
                "message": "The simulation is complete. Your choices have determined your survival outcome.",
                "next_event": None,
            }

        return self._build_status_response()

    def get_status(self) -> Dict[str, Any]:
        """Get current simulation status. Backward-compatible."""
        if not self.simulation_active:
            return {"active": False}

        return {
            "active": True,
            "current_time": self.current_time.strftime("%I:%M %p") if self.current_time else None,
            "survival_probability": self.survival_probability,
            "decisions_made": len(self.decisions),
            "events_remaining": len(self.TIMELINE) - self.event_idx,
            "next_event": self._current_event(),
        }

    # ================================================================== #
    # Stateless serialization (required for Vercel serverless)
    # ================================================================== #
    def to_dict(self) -> Dict[str, Any]:
        """
        Export simulator state for client-side storage.
        Your Next.js API route should return this and the frontend
        should send it back on the next 'decide' call.
        """
        return {
            "passenger": self.passenger,
            "decisions": deepcopy(self.decisions),
            "survival_probability": self.survival_probability,
            "simulation_active": self.simulation_active,
            "event_idx": self.event_idx,
            "current_time": self.current_time.isoformat() if self.current_time else None,
        }

    @classmethod
    def from_dict(cls, state: Dict[str, Any]) -> "TitanicSimulator":
        """Reconstruct simulator from client-provided state."""
        sim = cls()
        sim.passenger = state.get("passenger")
        sim.decisions = deepcopy(state.get("decisions", []))
        sim.survival_probability = float(state.get("survival_probability", 0.5))
        sim.simulation_active = bool(state.get("simulation_active", False))
        sim.event_idx = int(state.get("event_idx", 0))

        ct = state.get("current_time")
        if ct:
            sim.current_time = datetime.fromisoformat(ct)
        return sim

    # ================================================================== #
    # Internal helpers
    # ================================================================== #
    def _current_event(self) -> Optional[Dict[str, Any]]:
        if 0 <= self.event_idx < len(self.TIMELINE):
            return self.TIMELINE[self.event_idx]
        return None

    def _build_status_response(self) -> Dict[str, Any]:
        return {
            "complete": False,
            "survival_probability": self.survival_probability,
            "message": f"Decision recorded. Your survival probability is now {self.survival_probability:.0%}.",
            "next_event": self._current_event(),
            "decisions": self.decisions,
        }
