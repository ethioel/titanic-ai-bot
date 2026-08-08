from __future__ import annotations

import logging
import random
from copy import deepcopy
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Callable

logger = logging.getLogger(__name__)


class Location(Enum):
    CABIN = "cabin"
    CORRIDOR = "corridor"
    GRAND_STAIRCASE = "grand_staircase"
    BOAT_DECK = "boat_deck"
    LIFEBOAT_STATION = "lifeboat_station"
    A_DECK = "a_deck"
    B_DECK = "b_deck"
    STEERAGE = "steerage"
    KITCHEN = "kitchen"
    WATER = "in_water"
    COLLAPSIBLE = "collapsible_boat"
    RESCUED = "rescued"


class Condition(Enum):
    HEALTHY = "healthy"
    WET = "wet"
    INJURED = "injured"
    EXHAUSTED = "exhausted"
    HYPOTHERMIA = "hypothermia"
    PANICKED = "panicked"
    TRAPPED = "trapped"


@dataclass
class SimulationState:
    passenger: Dict[str, Any] = field(default_factory=dict)
    survival_probability: float = 0.5
    simulation_active: bool = False
    event_idx: int = 0
    current_time: Optional[str] = None
    location: str = Location.CABIN.value
    condition: str = Condition.HEALTHY.value
    panic_level: int = 0
    warmth: int = 10
    energy: int = 10
    reputation: int = 5
    companions: List[Dict[str, Any]] = field(default_factory=list)
    inventory: List[Dict[str, Any]] = field(default_factory=list)
    decisions_log: List[Dict[str, Any]] = field(default_factory=list)
    narrative_history: List[str] = field(default_factory=list)
    flags: Dict[str, bool] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SimulationState":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


class Event:
    def __init__(
        self,
        time_str: str,
        minutes: int,
        description: str,
        get_choices: Callable[[SimulationState, Dict[str, Any]], List[Dict[str, Any]]],
        get_narrative: Callable[[SimulationState, Dict[str, Any]], str],
        auto_effect: Optional[Callable[[SimulationState], None]] = None,
    ):
        self.time_str = time_str
        self.minutes = minutes
        self.description = description
        self.get_choices = get_choices
        self.get_narrative = get_narrative
        self.auto_effect = auto_effect


class TitanicSimulator:
    ITEMS = {
        "lifebelt": {"id": "lifebelt", "name": "Lifebelt", "description": "Cork and canvas life preserver", "usable": True},
        "warm_clothes": {"id": "warm_clothes", "name": "Warm clothes", "description": "Heavy wool and layers", "usable": True},
        "debris": {"id": "debris", "name": "Floating debris", "description": "Wooden panel or deck chair", "usable": True},
    }

    def __init__(self) -> None:
        self.state = SimulationState()
        self._timeline = self._build_timeline()

    def _build_timeline(self) -> List[Event]:
        events = []

        events.append(Event(
            "11:40 PM", 0,
            "A terrible shudder runs through the ship. The engines stop.",
            self._impact_choices,
            self._impact_narrative,
        ))

        events.append(Event(
            "11:45 PM", 5,
            "The ship is dead in the water. Stewards begin knocking on doors.",
            self._initial_choices,
            self._initial_narrative,
        ))

        events.append(Event(
            "11:55 PM", 15,
            "The forward compartments are flooding. The ship begins to list forward.",
            self._rising_water_choices,
            self._rising_water_narrative,
            lambda s: self._apply_condition(s, Condition.WET, 0.1),
        ))

        events.append(Event(
            "12:05 AM", 25,
            "Captain Smith orders: 'Abandon ship. Women and children first.'",
            self._lifeboat_order_choices,
            self._lifeboat_order_narrative,
        ))

        events.append(Event(
            "12:15 AM", 35,
            "Lifeboat 7 is lowered—only 28 people in a boat built for 65.",
            self._first_boats_choices,
            self._first_boats_narrative,
        ))

        events.append(Event(
            "12:30 AM", 50,
            "The bow is visibly sinking. The stern lifts slightly. Chaos grows.",
            self._stern_rise_choices,
            self._stern_rise_narrative,
            lambda s: self._modify_panic(s, 2),
        ))

        events.append(Event(
            "12:45 AM", 65,
            "Third-class passengers are trapped below by locked gates. The list worsens.",
            self._class_divide_choices,
            self._class_divide_narrative,
        ))

        events.append(Event(
            "1:00 AM", 80,
            "The forward well deck is underwater. The band plays on the boat deck.",
            self._plunge_choices,
            self._plunge_narrative,
            lambda s: self._apply_condition(s, Condition.EXHAUSTED, 0.2),
        ))

        events.append(Event(
            "1:15 AM", 95,
            "The last regular lifeboats are leaving. Collapsibles are being prepared.",
            self._last_boats_choices,
            self._last_boats_narrative,
        ))

        events.append(Event(
            "1:30 AM", 110,
            "The ship's lights flicker. The stern rises high into the air.",
            self._breakup_choices,
            self._breakup_narrative,
            lambda s: self._modify_panic(s, 3),
        ))

        events.append(Event(
            "1:45 AM", 125,
            "The ship groans like a wounded beast. Everything not bolted down slides forward.",
            self._final_moments_choices,
            self._final_moments_narrative,
        ))

        events.append(Event(
            "2:00 AM", 140,
            "The Titanic begins her final plunge. The stern stands almost vertical.",
            self._plunge_final_choices,
            self._plunge_final_narrative,
        ))

        events.append(Event(
            "2:20 AM", 160,
            "The Titanic slips beneath the waves. The sea is filled with screaming.",
            self._aftermath_choices,
            self._aftermath_narrative,
            lambda s: self._set_location(s, Location.WATER),
        ))

        return events

    # ================================================================== #
    # CHOICE GENERATORS
    # ================================================================== #
    def _impact_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "investigate", "text": "Go out and see what's happening", "mod": 0.02, "move": Location.CORRIDOR},
            {"id": "stay_put", "text": "Stay in your cabin and wait for instructions", "mod": -0.05, "move": Location.CABIN},
            {"id": "dress_warm", "text": "Put on warm clothes and lifebelt immediately", "mod": 0.08, "item": "warm_clothes", "move": Location.CABIN},
        ]
        if p.get("Sex") == "female" or p.get("Age", 30) < 16:
            choices.append({"id": "find_family", "text": "Gather your family immediately", "mod": 0.05, "move": Location.CORRIDOR, "flag": "family_together"})
        return choices

    def _initial_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "go_deck", "text": "Head up to the boat deck", "mod": 0.05, "move": Location.BOAT_DECK},
            {"id": "help_others", "text": "Help other passengers find their way", "mod": 0.03, "move": Location.CORRIDOR, "rep": 2},
            {"id": "return_cabin", "text": "Go back for valuables and warm clothes", "mod": -0.08, "move": Location.CABIN, "item": "warm_clothes"},
        ]
        if p.get("Pclass") == 3:
            choices.append({"id": "break_through", "text": "Try to find a way up from steerage", "mod": 0.02, "move": Location.CORRIDOR, "risk": "injury"})
        return choices

    def _rising_water_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "stairs_up", "text": "Climb the grand staircase upward", "mod": 0.04, "move": Location.GRAND_STAIRCASE},
            {"id": "crew_stairs", "text": "Use the crew stairwell (faster but narrow)", "mod": 0.06, "move": Location.BOAT_DECK, "risk": "injury"},
            {"id": "assist_wounded", "text": "Help an injured person reach the deck", "mod": 0.01, "move": Location.CORRIDOR, "rep": 3, "companion": True},
        ]
        if s.flags.get("family_together"):
            choices.append({"id": "stay_with_family", "text": "Stay with your family and move as a group", "mod": 0.03, "move": Location.CORRIDOR, "flag": "group_move"})
        return choices

    def _lifeboat_order_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = []
        is_priority = p.get("Sex") == "female" or p.get("Age", 30) < 16
        if is_priority:
            choices.extend([
                {"id": "approach_boat", "text": "Approach the lifeboat station calmly", "mod": 0.15, "move": Location.LIFEBOAT_STATION},
                {"id": "refuse_separation", "text": "Refuse to leave without your husband", "mod": -0.05, "move": Location.BOAT_DECK, "flag": "refused_separation"},
            ])
        else:
            choices.extend([
                {"id": "help_launch", "text": "Help crew load women and children", "mod": 0.10, "move": Location.LIFEBOAT_STATION, "rep": 2},
                {"id": "find_collapsible", "text": "Search for the collapsible boats", "mod": 0.05, "move": Location.BOAT_DECK},
            ])
        choices.append({"id": "panic_push", "text": "Push through the crowd toward a boat", "mod": -0.10, "move": Location.LIFEBOAT_STATION, "panic": 3})
        return choices

    def _first_boats_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = []
        is_priority = p.get("Sex") == "female" or p.get("Age", 30) < 16
        if is_priority and s.location in [Location.BOAT_DECK.value, Location.LIFEBOAT_STATION.value]:
            choices.append({"id": "board_boat", "text": "Board the lifeboat", "mod": 0.25, "move": Location.RESCUED, "flag": "in_lifeboat"})
        elif s.reputation >= 6:
            choices.append({"id": "crew_allows", "text": "Crew recognizes you from helping and lets you assist", "mod": 0.08, "move": Location.LIFEBOAT_STATION})
        choices.extend([
            {"id": "keep_helping", "text": "Continue helping others into boats", "mod": 0.05, "move": Location.LIFEBOAT_STATION, "rep": 1},
            {"id": "wait_next", "text": "Step back and wait for the next boat", "mod": 0.02, "move": Location.BOAT_DECK},
        ])
        return choices

    def _stern_rise_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "move_stern", "text": "Move toward the rising stern", "mod": 0.03, "move": Location.A_DECK},
            {"id": "jump_prepare", "text": "Prepare to jump clear when she goes", "mod": 0.02, "move": Location.BOAT_DECK},
            {"id": "find_float", "text": "Search for floating debris or deck chairs", "mod": 0.04, "move": Location.BOAT_DECK, "item": "debris"},
        ]
        if any(i.get("id") == "lifebelt" for i in s.inventory):
            choices.append({"id": "secure_belt", "text": "Double-check your lifebelt is secure", "mod": 0.06, "move": s.location})
        return choices

    def _class_divide_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = []
        if p.get("Pclass") == 3 and s.location not in [Location.BOAT_DECK.value, Location.LIFEBOAT_STATION.value]:
            choices.extend([
                {"id": "break_gate", "text": "Break through the locked gate", "mod": 0.05, "move": Location.CORRIDOR, "risk": "injury", "rep": -1},
                {"id": "find_crew_door", "text": "Search for an unlocked crew passage", "mod": 0.08, "move": Location.CORRIDOR},
            ])
        else:
            choices.append({"id": "hold_position", "text": "Hold your position on deck", "mod": 0.02, "move": s.location})
        choices.append({"id": "help_trapped", "text": "Try to help trapped passengers escape", "mod": 0.03, "move": Location.CORRIDOR, "rep": 2})
        return choices

    def _plunge_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "climb_stern", "text": "Climb toward the rising stern", "mod": 0.04, "move": Location.A_DECK, "energy": 2},
            {"id": "hold_rail", "text": "Hold onto the railing and brace", "mod": 0.02, "move": s.location},
            {"id": "jump_early", "text": "Jump into the water now (avoid the suction)", "mod": 0.01, "move": Location.WATER, "condition": Condition.WET},
        ]
        if s.flags.get("in_lifeboat"):
            choices = [{"id": "row_away", "text": "Row hard to get away from the suction", "mod": 0.20, "move": Location.RESCUED}]
        return choices

    def _last_boats_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = []
        is_priority = p.get("Sex") == "female" or p.get("Age", 30) < 16
        if is_priority and s.location in [Location.BOAT_DECK.value, Location.LIFEBOAT_STATION.value]:
            choices.append({"id": "last_boat", "text": "Board one of the last lifeboats", "mod": 0.20, "move": Location.RESCUED, "flag": "in_lifeboat"})
        choices.extend([
            {"id": "collapsible_a", "text": "Run toward Collapsible A (being prepared)", "mod": 0.08, "move": Location.BOAT_DECK},
            {"id": "collapsible_b", "text": "Head to Collapsible B on the officers' quarters", "mod": 0.10, "move": Location.BOAT_DECK, "risk": "injury"},
        ])
        if p.get("Age", 30) > 50 or s.condition == Condition.INJURED.value:
            choices.append({"id": "accept_fate", "text": "Help others and accept your fate with dignity", "mod": 0.05, "move": s.location, "rep": 5})
        return choices

    def _breakup_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "ride_plunge", "text": "Ride the stern down as she goes under", "mod": -0.05, "move": Location.WATER, "condition": Condition.INJURED},
            {"id": "jump_clear", "text": "Jump clear of the ship", "mod": 0.03, "move": Location.WATER, "condition": Condition.WET},
            {"id": "climb_on", "text": "Climb onto the overturned Collapsible B", "mod": 0.15, "move": Location.COLLAPSIBLE, "risk": "injury"},
        ]
        if s.flags.get("in_lifeboat"):
            choices = [{"id": "watch_horror", "text": "Watch in horror from the lifeboat", "mod": 0.15, "move": Location.RESCUED}]
        return choices

    def _final_moments_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "swim_away", "text": "Swim hard away from the suction", "mod": 0.05, "move": Location.WATER, "energy": 3},
            {"id": "find_debris", "text": "Grab onto floating debris", "mod": 0.08, "move": Location.WATER, "item": "debris"},
            {"id": "help_swimmer", "text": "Help another swimmer stay afloat", "mod": 0.03, "move": Location.WATER, "rep": 2, "energy": 2},
        ]
        if any(i.get("id") == "debris" for i in s.inventory):
            choices.append({"id": "use_debris", "text": "Climb onto your debris and conserve energy", "mod": 0.10, "move": Location.WATER})
        return choices

    def _plunge_final_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "tread_water", "text": "Tread water and stay calm", "mod": 0.02, "move": Location.WATER},
            {"id": "swim_boat", "text": "Swim toward a distant lifeboat", "mod": 0.05, "move": Location.WATER, "energy": 4},
            {"id": "group_huddle", "text": "Group with other survivors to share warmth", "mod": 0.06, "move": Location.WATER, "flag": "group_huddle"},
        ]
        if s.condition == Condition.HYPOTHERMIA.value:
            choices = [{"id": "slip_away", "text": "Consciousness fades as hypothermia takes hold...", "mod": -0.10, "move": Location.WATER}]
        return choices

    def _aftermath_choices(self, s: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        final = self._compute_final_survival(s, p)
        if s.location in [Location.RESCUED.value, Location.COLLAPSIBLE.value]:
            return [{"id": "survived", "text": "You survived the sinking", "mod": 0, "final": True}]
        if final > 0.5:
            return [{"id": "rescued_later", "text": "You cling to life until rescued by the Carpathia", "mod": 0, "final": True}]
        return [{"id": "perished", "text": "The cold Atlantic claims you", "mod": 0, "final": True}]

    # ================================================================== #
    # NARRATIVES
    # ================================================================== #
    def _impact_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        loc = "cabin" if s.location == Location.CABIN.value else "room"
        if p.get("Pclass") == 1:
            return f"You are in your {loc} on A-Deck. The crystal chandeliers sway. A muffled crunch echoes through the hull."
        if p.get("Pclass") == 2:
            return f"Your {loc} on D-Deck shudders. The vibration stops abruptly. The engines have fallen silent."
        return f"Deep in the bowels of the ship, your {loc} in steerage shakes. The hum of the engines dies."

    def _initial_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        if p.get("Pclass") == 1:
            return 'A steward knocks politely. "Sorry to disturb, sir, but we have struck something. No danger, but please put on warm clothes."'
        if p.get("Pclass") == 2:
            return "Passengers mill in the corridors. Some laugh it off. Others look concerned. A crewman walks past with a grim face."
        return "Water seeps under the door. The air smells of bilge. Someone shouts in a language you don't understand. It's time to move."

    def _rising_water_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        if s.location == Location.CABIN.value:
            return "The carpet is wet. Your feet sink slightly. Outside, you hear rushing water and the clank of watertight doors closing."
        return "The corridor tilts slightly downward toward the bow. People are moving upward, some carrying children, some carrying nothing but fear."

    def _lifeboat_order_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        if p.get("Sex") == "female" or p.get("Age", 30) < 16:
            return 'An officer stands by the lifeboat. "Women and children first!" he shouts. Hands reach to help you. Men stand back, faces pale.'
        return "You watch women and children being helped into the boats. Some men try to rush forward and are pushed back by crew. The air smells of salt and coal smoke."

    def _first_boats_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        return 'The first boat drops into the black water. It\'s half-empty. "Room for more!" someone cries, but fear has frozen many in place.'

    def _stern_rise_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        return 'The deck tilts dramatically. You grip a railing. The band plays "Autumn" now, the notes drifting across the chaos like a lullaby for the dying.'

    def _class_divide_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        if p.get("Pclass") == 3:
            return 'A locked gate blocks the stairwell. A steward yells "Stay back!" but water is rising behind you. Time is running out.'
        return "You pass frightened steerage passengers being directed upward. The hierarchy of the ship is dissolving into the hierarchy of survival."

    def _plunge_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        return "The bow is completely submerged. Water rushes across the well deck. The ship groans, a sound like a great beast being torn apart."

    def _last_boats_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        return 'Officers shout "No more room!" Collapsible boats are being dragged across the deck. The deck angle is now severe. You slide if you don\'t hold on.'

    def _breakup_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        return "The lights go out. In the darkness, the ship's spine breaks with a thunderous crack. The bow plunges, pulling the stern vertical."

    def _final_moments_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        return "You are in the water. The ship's stern stands like a black tower against the stars, then slides under with a terrible roar. The suction pulls you down."

    def _plunge_final_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        return "The Atlantic is -2°C. Your muscles seize. Around you, voices grow quieter. The stars are impossibly bright. You think of home."

    def _aftermath_narrative(self, s: SimulationState, p: Dict[str, Any]) -> str:
        if s.location == Location.RESCUED.value:
            return "You huddle in the lifeboat, weeping, praying, or simply staring at the empty sea where 1,500 souls just disappeared."
        if self._compute_final_survival(s, p) > 0.5:
            return "Somehow, you cling to consciousness. Hours later, a light appears. The Carpathia. You are one of the 706."
        return "The cold takes you gently, like sleep. Your name will be read in churches. Your body will never be found."

    # ================================================================== #
    # PUBLIC API
    # ================================================================== #
    def initialize_simulation(self, passenger_data: Dict[str, Any], initial_probability: float) -> Dict[str, Any]:
        self.state = SimulationState()
        self.state.passenger = passenger_data
        self.state.survival_probability = float(initial_probability)
        self.state.simulation_active = True
        self.state.event_idx = 0
        self.state.current_time = datetime(1912, 4, 14, 23, 40).isoformat()
        if passenger_data.get("Pclass") == 1:
            self.state.inventory.append(dict(self.ITEMS["warm_clothes"]))

        event = self._timeline[0]
        narrative = event.get_narrative(self.state, passenger_data)
        self.state.narrative_history.append(narrative)

        return {
            "started": True,
            "current_time": event.time_str,
            "survival_probability": self.state.survival_probability,
            "message": "⚠️ The Titanic has struck an iceberg!",
            "narrative": narrative,
            "status": self._get_status_dict(),
            "next_event": self._event_to_dict(event),
            "state": self.state.to_dict(),
        }

    def make_decision(self, decision_id: str, state_dict: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if state_dict:
            self.state = SimulationState.from_dict(state_dict)

        if not self.state.simulation_active:
            return {"error": "Simulation not active"}

        if self.state.event_idx >= len(self._timeline):
            return {"error": "Simulation already complete"}

        event = self._timeline[self.state.event_idx]
        choices = event.get_choices(self.state, self.state.passenger)
        choice = next((c for c in choices if c["id"] == decision_id), None)

        if choice is None:
            return {"error": f"Invalid decision: {decision_id}"}

        self._apply_choice(choice)
        if event.auto_effect:
            event.auto_effect(self.state)
        self._apply_time_decay(event.minutes)

        self.state.decisions_log.append({
            "time": event.time_str,
            "decision": choice["text"],
            "event": event.description,
        })

        self.state.event_idx += 1

        if self.state.event_idx < len(self._timeline):
            narrative = self._timeline[self.state.event_idx].get_narrative(self.state, self.state.passenger)
        else:
            narrative = self._aftermath_narrative(self.state, self.state.passenger)
        self.state.narrative_history.append(narrative)

        if self.state.event_idx >= len(self._timeline) or choice.get("final"):
            self.state.simulation_active = False
            final_prob = self._compute_final_survival(self.state, self.state.passenger)
            return {
                "complete": True,
                "final_probability": final_prob,
                "survived": final_prob > 0.5,
                "narrative": narrative,
                "status": self._get_status_dict(),
                "decisions": self.state.decisions_log,
                "message": self._get_final_message(final_prob),
                "next_event": None,
                "state": self.state.to_dict(),
            }

        return self._build_response()

    def get_status(self, state_dict: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if state_dict:
            self.state = SimulationState.from_dict(state_dict)
        if not self.state.simulation_active:
            return {"active": False}
        nxt = self._timeline[self.state.event_idx] if self.state.event_idx < len(self._timeline) else None
        return {
            "active": True,
            "current_time": nxt.time_str if nxt else "2:20 AM",
            "survival_probability": self.state.survival_probability,
            "status": self._get_status_dict(),
            "decisions_made": len(self.state.decisions_log),
            "events_remaining": len(self._timeline) - self.state.event_idx,
            "next_event": self._event_to_dict(nxt) if nxt else None,
            "state": self.state.to_dict(),
        }

    def to_dict(self) -> Dict[str, Any]:
        return self.state.to_dict()

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TitanicSimulator":
        sim = cls()
        sim.state = SimulationState.from_dict(data)
        return sim

    # ================================================================== #
    # INTERNALS
    # ================================================================== #
    def _apply_choice(self, choice: Dict[str, Any]) -> None:
        s = self.state
        if "mod" in choice:
            s.survival_probability += choice["mod"]
        if "move" in choice:
            s.location = choice["move"].value if isinstance(choice["move"], Location) else str(choice["move"])
        if "condition" in choice:
            s.condition = choice["condition"].value if isinstance(choice["condition"], Condition) else str(choice["condition"])
        if "panic" in choice:
            s.panic_level = min(10, s.panic_level + choice["panic"])
        if "energy" in choice:
            s.energy = max(0, s.energy - choice["energy"])
        if "rep" in choice:
            s.reputation = max(0, min(10, s.reputation + choice["rep"]))
        if "item" in choice and choice["item"] in self.ITEMS:
            if not any(i.get("id") == choice["item"] for i in s.inventory):
                s.inventory.append(dict(self.ITEMS[choice["item"]]))
        if "risk" in choice and random.random() < 0.3:
            s.condition = Condition.INJURED.value
            s.survival_probability -= 0.05
        if "flag" in choice:
            s.flags[choice["flag"]] = True
        if "companion" in choice:
            s.companions.append({"name": "Unknown survivor", "relation": "stranger", "age": 30, "condition": Condition.INJURED.value, "alive": True})
        s.survival_probability = max(0.0, min(1.0, s.survival_probability))

    def _apply_time_decay(self, minutes: int) -> None:
        s = self.state
        if minutes > 30:
            s.survival_probability -= (minutes - 30) * 0.002
        if s.location == Location.WATER.value:
            s.warmth = max(0, s.warmth - 2)
            if s.warmth <= 3:
                s.condition = Condition.HYPOTHERMIA.value
                s.survival_probability -= 0.08
            else:
                s.condition = Condition.WET.value
        if s.location in [Location.RESCUED.value, Location.COLLAPSIBLE.value]:
            s.panic_level = max(0, s.panic_level - 2)
            s.warmth = min(10, s.warmth + 1)
        s.survival_probability = max(0.0, min(1.0, s.survival_probability))

    def _compute_final_survival(self, s: SimulationState, p: Dict[str, Any]) -> float:
        prob = s.survival_probability
        loc_mods = {Location.RESCUED.value: 0.30, Location.COLLAPSIBLE.value: 0.15, Location.WATER.value: -0.20, Location.CABIN.value: -0.40}
        prob += loc_mods.get(s.location, 0.0)
        cond_mods = {Condition.HYPOTHERMIA.value: -0.25, Condition.INJURED.value: -0.15, Condition.EXHAUSTED.value: -0.10, Condition.PANICKED.value: -0.08}
        prob += cond_mods.get(s.condition, 0.0)
        inv_ids = {i.get("id") for i in s.inventory}
        if "lifebelt" in inv_ids:
            prob += 0.10
        if "debris" in inv_ids and s.location == Location.WATER.value:
            prob += 0.08
        if "warm_clothes" in inv_ids:
            prob += 0.05
        if p.get("Sex") == "female":
            prob += 0.08
        if p.get("Age", 30) < 16:
            prob += 0.05
        return float(max(0.0, min(1.0, prob)))

    def _apply_condition(self, s: SimulationState, condition: Condition, probability: float) -> None:
        if random.random() < probability:
            s.condition = condition.value

    def _set_location(self, s: SimulationState, location: Location) -> None:
        s.location = location.value

    def _modify_panic(self, s: SimulationState, delta: int) -> None:
        s.panic_level = max(0, min(10, s.panic_level + delta))

    def _get_status_dict(self) -> Dict[str, Any]:
        return {
            "location": self.state.location,
            "condition": self.state.condition,
            "panic_level": self.state.panic_level,
            "warmth": self.state.warmth,
            "energy": self.state.energy,
            "reputation": self.state.reputation,
            "inventory": self.state.inventory,
            "companions": self.state.companions,
            "flags": self.state.flags,
        }

    def _event_to_dict(self, event: Optional[Event]) -> Optional[Dict[str, Any]]:
        if not event:
            return None
        choices = event.get_choices(self.state, self.state.passenger)
        return {
            "time": event.time_str,
            "minutes_from_impact": event.minutes,
            "event": event.description,
            "narrative": event.get_narrative(self.state, self.state.passenger),
            "choices": [{"id": c["id"], "text": c["text"], "risk": c.get("risk"), "energy_cost": c.get("energy")} for c in choices],
        }

    def _build_response(self) -> Dict[str, Any]:
        event = self._timeline[self.state.event_idx] if self.state.event_idx < len(self._timeline) else None
        return {
            "complete": False,
            "survival_probability": round(self.state.survival_probability, 3),
            "current_time": event.time_str if event else "2:20 AM",
            "narrative": self.state.narrative_history[-1] if self.state.narrative_history else "",
            "status": self._get_status_dict(),
            "message": f"Your survival probability is now {self.state.survival_probability:.0%}.",
            "next_event": self._event_to_dict(event),
            "decisions": self.state.decisions_log,
            "state": self.state.to_dict(),
        }

    def _get_final_message(self, prob: float) -> str:
        if prob > 0.7:
            return "You survived against the odds. The Carpathia finds you at dawn."
        if prob > 0.5:
            return "You survived, but you will never forget this night."
        if prob > 0.3:
            return "You fought hard, but the Atlantic was merciless."
        return "You became one of the 1,500 souls lost in the deep."
