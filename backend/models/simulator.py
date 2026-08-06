from __future__ import annotations

import logging
import random
from copy import deepcopy
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum, auto
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
class Companion:
    name: str
    relation: str  # spouse, child, sibling, stranger
    age: int
    condition: Condition = Condition.HEALTHY
    alive: bool = True


@dataclass
class InventoryItem:
    id: str
    name: str
    description: str
    usable: bool = True


@dataclass
class SimulationState:
    """Full serializable state for serverless APIs."""
    passenger: Dict[str, Any] = field(default_factory=dict)
    survival_probability: float = 0.5
    simulation_active: bool = False
    event_idx: int = 0
    current_time_iso: Optional[str] = None
    
    # Dynamic state
    location: str = Location.CABIN.value
    condition: str = Condition.HEALTHY.value
    panic_level: int = 0  # 0-10
    warmth: int = 10  # 0-10 (decreases in water/cold)
    energy: int = 10  # 0-10
    reputation: int = 5  # 0-10 (how crew/others perceive you)
    
    companions: List[Dict[str, Any]] = field(default_factory=list)
    inventory: List[Dict[str, Any]] = field(default_factory=list)
    decisions_log: List[Dict[str, Any]] = field(default_factory=list)
    narrative_history: List[str] = field(default_factory=list)
    
    # Flags that unlock future choices
    flags: Dict[str, bool] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SimulationState":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


class Event:
    """A single moment in the sinking timeline."""
    
    def __init__(
        self,
        time_str: str,
        minutes_from_impact: int,
        description: str,
        get_choices: Callable[[SimulationState, Dict[str, Any]], List[Dict[str, Any]]],
        get_narrative: Callable[[SimulationState, Dict[str, Any]], str],
        auto_effect: Optional[Callable[[SimulationState], None]] = None,
    ):
        self.time_str = time_str
        self.minutes_from_impact = minutes_from_impact
        self.description = description
        self.get_choices = get_choices
        self.get_narrative = get_narrative
        self.auto_effect = auto_effect


class TitanicSimulator:
    """
    Immersive Titanic emergency simulator with historically accurate timeline,
    passenger-specific branching, and rich narrative generation.
    """
    
    # Passenger archetypes for narrative flavor
    ARCHETYPES = {
        "first_class_gentleman": {"deck_access": True, "lifeboat_priority": False, "formal": True},
        "first_class_lady": {"deck_access": True, "lifeboat_priority": True, "formal": True},
        "second_class_family": {"deck_access": True, "lifeboat_priority": True, "formal": False},
        "third_class_immigrant": {"deck_access": False, "lifeboat_priority": True, "formal": False},
        "crew_member": {"deck_access": True, "lifeboat_priority": False, "formal": False, "crew": True},
        "child": {"deck_access": True, "lifeboat_priority": True, "formal": False},
    }
    
    def __init__(self) -> None:
        self.state = SimulationState()
        self._timeline = self._build_timeline()
        self._base_probability = 0.5
    
    # ================================================================== #
    # HISTORICALLY ACCURATE TIMELINE (11:40 PM → 2:20 AM)
    # ================================================================== #
    def _build_timeline(self) -> List[Event]:
        events = []
        
        # 11:40 PM — Impact
        events.append(Event(
            time_str="11:40 PM",
            minutes_from_impact=0,
            description="A terrible shudder runs through the ship. The engines stop.",
            get_choices=self._impact_choices,
            get_narrative=self._impact_narrative,
        ))
        
        # 11:45 PM — Initial confusion
        events.append(Event(
            time_str="11:45 PM",
            minutes_from_impact=5,
            description="The ship is dead in the water. Stewards begin knocking on doors.",
            get_choices=self._initial_choices,
            get_narrative=self._initial_narrative,
        ))
        
        # 11:55 PM — Water rising
        events.append(Event(
            time_str="11:55 PM",
            minutes_from_impact=15,
            description="The forward compartments are flooding. The ship begins to list forward.",
            get_choices=self._rising_water_choices,
            get_narrative=self._rising_water_narrative,
            auto_effect=lambda s: self._apply_condition(s, Condition.WET, 0.1),
        ))
        
        # 12:05 AM — Lifeboats
        events.append(Event(
            time_str="12:05 AM",
            minutes_from_impact=25,
            description="Captain Smith orders: 'Abandon ship. Women and children first.'",
            get_choices=self._lifeboat_order_choices,
            get_narrative=self._lifeboat_order_narrative,
        ))
        
        # 12:15 AM — First boats launching
        events.append(Event(
            time_str="12:15 AM",
            minutes_from_impact=35,
            description="Lifeboat 7 is lowered—only 28 people in a boat built for 65.",
            get_choices=self._first_boats_choices,
            get_narrative=self._first_boats_narrative,
        ))
        
        # 12:30 AM — Stern rises
        events.append(Event(
            time_str="12:30 AM",
            minutes_from_impact=50,
            description="The bow is visibly sinking. The stern lifts slightly. Chaos grows.",
            get_choices=self._stern_rise_choices,
            get_narrative=self._stern_rise_narrative,
            auto_effect=lambda s: self._modify_panic(s, 2),
        ))
        
        # 12:45 AM — Class divide
        events.append(Event(
            time_str="12:45 AM",
            minutes_from_impact=65,
            description="Third-class passengers are trapped below by locked gates. The list worsens.",
            get_choices=self._class_divide_choices,
            get_narrative=self._class_divide_narrative,
        ))
        
        # 1:00 AM — The plunge accelerates
        events.append(Event(
            time_str="1:00 AM",
            minutes_from_impact=80,
            description="The forward well deck is underwater. The band plays on the boat deck.",
            get_choices=self._plunge_choices,
            get_narrative=self._plunge_narrative,
            auto_effect=lambda s: self._apply_condition(s, Condition.EXHAUSTED, 0.2),
        ))
        
        # 1:15 AM — Last regular boats
        events.append(Event(
            time_str="1:15 AM",
            minutes_from_impact=95,
            description="The last regular lifeboats are leaving. Collapsibles are being prepared.",
            get_choices=self._last_boats_choices,
            get_narrative=self._last_boats_narrative,
        ))
        
        # 1:30 AM — The breakup
        events.append(Event(
            time_str="1:30 AM",
            minutes_from_impact=110,
            description="The ship's lights flicker. The stern rises high into the air.",
            get_choices=self._breakup_choices,
            get_narrative=self._breakup_narrative,
            auto_effect=lambda s: self._modify_panic(s, 3),
        ))
        
        # 1:45 AM — Final moments
        events.append(Event(
            time_str="1:45 AM",
            minutes_from_impact=125,
            description="The ship groans like a wounded beast. Everything not bolted down slides forward.",
            get_choices=self._final_moments_choices,
            get_narrative=self._final_moments_narrative,
        ))
        
        # 2:00 AM — The plunge
        events.append(Event(
            time_str="2:00 AM",
            minutes_from_impact=140,
            description="The Titanic begins her final plunge. The stern stands almost vertical.",
            get_choices=self._plunge_final_choices,
            get_narrative=self._plunge_final_narrative,
        ))
        
        # 2:20 AM — Gone
        events.append(Event(
            time_str="2:20 AM",
            minutes_from_impact=160,
            description="The Titanic slips beneath the waves. The sea is filled with screaming.",
            get_choices=self._aftermath_choices,
            get_narrative=self._aftermath_narrative,
            auto_effect=lambda s: self._set_location(s, Location.WATER),
        ))
        
        return events
    
    # ================================================================== #
    # CHOICE GENERATORS (passenger-specific branching)
    # ================================================================== #
    def _impact_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "investigate", "text": "Go out and see what's happening", "modifier": 0.02, "move": Location.CORRIDOR},
            {"id": "stay_put", "text": "Stay in your cabin and wait for instructions", "modifier": -0.05, "move": Location.CABIN},
            {"id": "dress_warm", "text": "Put on warm clothes and lifebelt immediately", "modifier": 0.08, "item": "lifebelt", "move": Location.CABIN},
        ]
        if p.get("Sex") == "female" or p.get("Age", 30) < 16:
            choices.append({"id": "find_family", "text": "Gather your family immediately", "modifier": 0.05, "move": Location.CORRIDOR, "flag": "family_together"})
        return choices
    
    def _initial_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "go_deck", "text": "Head up to the boat deck", "modifier": 0.05, "move": Location.BOAT_DECK},
            {"id": "help_others", "text": "Help other passengers find their way", "modifier": 0.03, "move": Location.CORRIDOR, "reputation": 2},
            {"id": "return_cabin", "text": "Go back for valuables and warm clothes", "modifier": -0.08, "move": Location.CABIN, "item": "warm_clothes"},
        ]
        if p.get("Pclass") == 3:
            choices.append({"id": "break_through", "text": "Try to find a way up from steerage", "modifier": 0.02, "move": Location.CORRIDOR, "risk": "injury"})
        return choices
    
    def _rising_water_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "stairs_up", "text": "Climb the grand staircase upward", "modifier": 0.04, "move": Location.GRAND_STAIRCASE},
            {"id": "crew_stairs", "text": "Use the crew stairwell (faster but narrow)", "modifier": 0.06, "move": Location.BOAT_DECK, "risk": "injury"},
            {"id": "assist_wounded", "text": "Help an injured person reach the deck", "modifier": 0.01, "move": Location.CORRIDOR, "reputation": 3, "companion": "wounded_stranger"},
        ]
        if state.flags.get("family_together"):
            choices.append({"id": "stay_with_family", "text": "Stay with your family and move as a group", "modifier": 0.03, "move": Location.CORRIDOR, "flag": "group_move"})
        return choices
    
    def _lifeboat_order_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = []
        is_priority = p.get("Sex") == "female" or p.get("Age", 30) < 16
        
        if is_priority:
            choices.append({"id": "approach_boat", "text": "Approach the lifeboat station calmly", "modifier": 0.15, "move": Location.LIFEBOAT_STATION})
            choices.append({"id": "refuse_separation", "text": "Refuse to leave without your husband", "modifier": -0.05, "move": Location.BOAT_DECK, "flag": "refused_separation"})
        else:
            choices.append({"id": "help_launch", "text": "Help crew load women and children", "modifier": 0.10, "move": Location.LIFEBOAT_STATION, "reputation": 2})
            choices.append({"id": "find_collapsible", "text": "Search for the collapsible boats", "modifier": 0.05, "move": Location.BOAT_DECK})
        
        choices.append({"id": "panic_push", "text": "Push through the crowd toward a boat", "modifier": -0.10, "move": Location.LIFEBOAT_STATION, "condition": Condition.PANICKED})
        return choices
    
    def _first_boats_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = []
        is_priority = p.get("Sex") == "female" or p.get("Age", 30) < 16
        
        if is_priority and state.location in [Location.BOAT_DECK.value, Location.LIFEBOAT_STATION.value]:
            choices.append({"id": "board_boat", "text": "Board the lifeboat", "modifier": 0.25, "move": Location.RESCUED, "flag": "in_lifeboat"})
        elif state.reputation >= 6:
            choices.append({"id": "crew_allows", "text": "Crew recognizes you from helping and lets you assist", "modifier": 0.08, "move": Location.LIFEBOAT_STATION})
        
        choices.extend([
            {"id": "keep_helping", "text": "Continue helping others into boats", "modifier": 0.05, "move": Location.LIFEBOAT_STATION, "reputation": 1},
            {"id": "wait_next", "text": "Step back and wait for the next boat", "modifier": 0.02, "move": Location.BOAT_DECK},
        ])
        return choices
    
    def _stern_rise_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "move_stern", "text": "Move toward the rising stern", "modifier": 0.03, "move": Location.A_DECK},
            {"id": "jump_prepare", "text": "Prepare to jump clear when she goes", "modifier": 0.02, "move": Location.BOAT_DECK},
            {"id": "find_float", "text": "Search for floating debris or deck chairs", "modifier": 0.04, "move": Location.BOAT_DECK, "item": "debris"},
        ]
        if "lifebelt" in [i.get("id") for i in state.inventory]:
            choices.append({"id": "secure_belt", "text": "Double-check your lifebelt is secure", "modifier": 0.06, "move": state.location})
        return choices
    
    def _class_divide_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = []
        if p.get("Pclass") == 3 and state.location not in [Location.BOAT_DECK.value, Location.LIFEBOAT_STATION.value]:
            choices.append({"id": "break_gate", "text": "Break through the locked gate", "modifier": 0.05, "move": Location.CORRIDOR, "risk": "injury", "reputation": -1})
            choices.append({"id": "find_crew_door", "text": "Search for an unlocked crew passage", "modifier": 0.08, "move": Location.CORRIDOR})
        else:
            choices.append({"id": "hold_position", "text": "Hold your position on deck", "modifier": 0.02, "move": state.location})
        
        choices.append({"id": "help_trapped", "text": "Try to help trapped passengers escape", "modifier": 0.03, "move": Location.CORRIDOR, "reputation": 2})
        return choices
    
    def _plunge_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "climb_stern", "text": "Climb toward the rising stern", "modifier": 0.04, "move": Location.A_DECK, "energy_cost": 2},
            {"id": "hold_rail", "text": "Hold onto the railing and brace", "modifier": 0.02, "move": state.location},
            {"id": "jump_early", "text": "Jump into the water now (avoid the suction)", "modifier": 0.01, "move": Location.WATER, "condition": Condition.WET},
        ]
        if state.flags.get("in_lifeboat"):
            choices = [{"id": "row_away", "text": "Row hard to get away from the suction", "modifier": 0.20, "move": Location.RESCUED}]
        return choices
    
    def _last_boats_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = []
        is_priority = p.get("Sex") == "female" or p.get("Age", 30) < 16
        
        if is_priority and state.location in [Location.BOAT_DECK.value, Location.LIFEBOAT_STATION.value]:
            choices.append({"id": "last_boat", "text": "Board one of the last lifeboats", "modifier": 0.20, "move": Location.RESCUED, "flag": "in_lifeboat"})
        
        choices.extend([
            {"id": "collapsible_a", "text": "Run toward Collapsible A (being prepared)", "modifier": 0.08, "move": Location.BOAT_DECK},
            {"id": "collapsible_b", "text": "Head to Collapsible B on the officers' quarters", "modifier": 0.10, "move": Location.BOAT_DECK, "risk": "injury"},
        ])
        
        if p.get("Age", 30) > 50 or state.condition == Condition.INJURED.value:
            choices.append({"id": "accept_fate", "text": "Help others and accept your fate with dignity", "modifier": 0.05, "move": state.location, "reputation": 5})
        
        return choices
    
    def _breakup_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "ride_plunge", "text": "Ride the stern down as she goes under", "modifier": -0.05, "move": Location.WATER, "condition": Condition.INJURED},
            {"id": "jump_clear", "text": "Jump clear of the ship", "modifier": 0.03, "move": Location.WATER, "condition": Condition.WET},
            {"id": "climb_on", "text": "Climb onto the overturned Collapsible B", "modifier": 0.15, "move": Location.COLLAPSIBLE, "risk": "injury"},
        ]
        if state.flags.get("in_lifeboat"):
            choices = [{"id": "watch_horror", "text": "Watch in horror from the lifeboat", "modifier": 0.15, "move": Location.RESCUED}]
        return choices
    
    def _final_moments_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "swim_away", "text": "Swim hard away from the suction", "modifier": 0.05, "move": Location.WATER, "energy_cost": 3},
            {"id": "find_debris", "text": "Grab onto floating debris", "modifier": 0.08, "move": Location.WATER, "item": "debris"},
            {"id": "help_swimmer", "text": "Help another swimmer stay afloat", "modifier": 0.03, "move": Location.WATER, "reputation": 2, "energy_cost": 2},
        ]
        if "debris" in [i.get("id") for i in state.inventory]:
            choices.append({"id": "use_debris", "text": "Climb onto your debris and conserve energy", "modifier": 0.10, "move": Location.WATER})
        return choices
    
    def _plunge_final_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        choices = [
            {"id": "tread_water", "text": "Tread water and stay calm", "modifier": 0.02, "move": Location.WATER},
            {"id": "swim_boat", "text": "Swim toward a distant lifeboat", "modifier": 0.05, "move": Location.WATER, "energy_cost": 4},
            {"id": "group_huddle", "text": "Group with other survivors to share warmth", "modifier": 0.06, "move": Location.WATER, "flag": "group_huddle"},
        ]
        if state.condition == Condition.HYPOTHERMIA.value:
            choices = [{"id": "slip_away", "text": "Consciousness fades as hypothermia takes hold...", "modifier": -0.10, "move": Location.WATER}]
        return choices
    
    def _aftermath_choices(self, state: SimulationState, p: Dict[str, Any]) -> List[Dict[str, Any]]:
        # This is the final resolution
        final_survival = self._compute_final_survival(state, p)
        
        choices = []
        if state.location == Location.RESCUED.value or state.location == Location.COLLAPSIBLE.value:
            choices.append({"id": "survived", "text": "You survived the sinking", "modifier": 0.0, "final": True})
        elif final_survival > 0.5:
            choices.append({"id": "rescued_later", "text": "You cling to life until rescued by the Carpathia", "modifier": 0.0, "final": True})
        else:
            choices.append({"id": "perished", "text": "The cold Atlantic claims you", "modifier": 0.0, "final": True})
        
        return choices
    
    # ================================================================== #
    # NARRATIVE GENERATORS (rich, passenger-specific text)
    # ================================================================== #
    def _impact_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        loc = self._location_name(state.location)
        cls = p.get("Pclass", 3)
        narratives = {
            1: f"You are in your {loc} on A-Deck. The crystal chandeliers sway. A muffled crunch echoes through the hull.",
            2: f"Your {loc} on D-Deck shudders. The vibration stops abruptly. The engines have fallen silent.",
            3: f"Deep in the bowels of the ship, your {loc} in steerage shakes. The hum of the engines dies.",
        }
        return narratives.get(cls, narratives[3])
    
    def _initial_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        if p.get("Pclass") == 1:
            return "A steward knocks politely. 'Sorry to disturb, sir, but we have struck something. No danger, but please put on warm clothes.'"
        elif p.get("Pclass") == 2:
            return "Passengers mill in the corridors. Some laugh it off. Others look concerned. A crewman walks past with a grim face."
        else:
            return "Water seeps under the door. The air smells of bilge. Someone shouts in a language you don't understand. It's time to move."
    
    def _rising_water_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        if state.location == Location.CABIN.value:
            return "The carpet is wet. Your feet sink slightly. Outside, you hear rushing water and the clank of watertight doors closing."
        return "The corridor tilts slightly downward toward the bow. People are moving upward, some carrying children, some carrying nothing but fear."
    
    def _lifeboat_order_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        if p.get("Sex") == "female" or p.get("Age", 30) < 16:
            return "An officer stands by the lifeboat. 'Women and children first!' he shouts. Hands reach to help you. Men stand back, faces pale."
        return "You watch women and children being helped into the boats. Some men try to rush forward and are pushed back by crew. The air smells of salt and coal smoke."
    
    def _first_boats_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        return "The first boat drops into the black water. It's half-empty. 'Room for more!' someone cries, but fear has frozen many in place."
    
    def _stern_rise_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        return "The deck tilts dramatically. You grip a railing. The band plays 'Autumn' now, the notes drifting across the chaos like a lullaby for the dying."
    
    def _class_divide_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        if p.get("Pclass") == 3:
            return "A locked gate blocks the stairwell. A steward yells 'Stay back!' but water is rising behind you. Time is running out."
        return "You pass frightened steerage passengers being directed upward. The hierarchy of the ship is dissolving into the hierarchy of survival."
    
    def _plunge_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        return "The bow is completely submerged. Water rushes across the well deck. The ship groans, a sound like a great beast being torn apart."
    
    def _last_boats_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        return "Officers shout 'No more room!' Collapsible boats are being dragged across the deck. The deck angle is now severe. You slide if you don't hold on."
    
    def _breakup_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        return "The lights go out. In the darkness, the ship's spine breaks with a thunderous crack. The bow plunges, pulling the stern vertical."
    
    def _final_moments_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        return "You are in the water. The ship's stern stands like a black tower against the stars, then slides under with a terrible roar. The suction pulls you down."
    
    def _plunge_final_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        temp = 28 if p.get("Sex") == "female" and p.get("Age", 30) < 16 else 31  # Women/children had slightly more clothing
        return f"The Atlantic is -2°C. Your muscles seize. Around you, voices grow quieter. The stars are impossibly bright. You think of home."
    
    def _aftermath_narrative(self, state: SimulationState, p: Dict[str, Any]) -> str:
        if state.location == Location.RESCUED.value:
            return "You huddle in the lifeboat, weeping, praying, or simply staring at the empty sea where 1,500 souls just disappeared."
        elif self._compute_final_survival(state, p) > 0.5:
            return "Somehow, you cling to consciousness. Hours later, a light appears. The Carpathia. You are one of the 706."
        else:
            return "The cold takes you gently, like sleep. Your name will be read in churches. Your body will never be found."
    
    # ================================================================== #
    # PUBLIC API (backward-compatible)
    # ================================================================== #
    def initialize_simulation(
        self,
        passenger_data: Dict[str, Any],
        initial_probability: float,
    ) -> Dict[str, Any]:
        """Start simulation. Backward-compatible."""
        self.state = SimulationState()
        self.state.passenger = passenger_data
        self.state.survival_probability = float(initial_probability)
        self.state.simulation_active = True
        self.state.event_idx = 0
        self.state.current_time_iso = datetime(1912, 4, 14, 23, 40).isoformat()
        self._base_probability = float(initial_probability)
        
        # Initial inventory based on class
        if passenger_data.get("Pclass") == 1:
            self.state.inventory.append({"id": "warm_clothes", "name": "Heavy overcoat", "description": "First-class quality wool", "usable": True})
        
        event = self._timeline[0]
        narrative = event.get_narrative(self.state, passenger_data)
        self.state.narrative_history.append(narrative)
        
        return {
            "started": True,
            "current_time": "11:40 PM",
            "survival_probability": self.state.survival_probability,
            "message": "⚠️ The Titanic has struck an iceberg!",
            "narrative": narrative,
            "status": self._get_status_dict(),
            "next_event": self._event_to_dict(event),
            "state": self.state.to_dict(),
        }
    
    def make_decision(self, decision_id: str, state_dict: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process decision. Accepts optional state_dict for serverless mode.
        If state_dict provided, reconstructs from it before processing.
        """
        if state_dict:
            self.state = SimulationState.from_dict(state_dict)
        
        if not self.state.simulation_active:
            return {"error": "Simulation not active"}
        
        if self.state.event_idx >= len(self._timeline):
            return {"error": "Simulation already complete"}
        
        event = self._timeline[self.state.event_idx]
        choices = event.get_choices(self.state, self.state.passenger)
        
        if not choices:
            self.state.event_idx += 1
            return self._build_response()
        
        choice = next((c for c in choices if c["id"] == decision_id), None)
        if choice is None:
            return {"error": f"Invalid decision: {decision_id}"}
        
        # Apply choice effects
        self._apply_choice(choice)
        
        # Apply auto-effects from event
        if event.auto_effect:
            event.auto_effect(self.state)
        
        # Time-based survival decay (the longer you stay, the worse it gets)
        self._apply_time_decay(event.minutes_from_impact)
        
        # Log decision
        self.state.decisions_log.append({
            "time": event.time_str,
            "decision": choice["text"],
            "event": event.description,
        })
        
        # Advance
        self.state.event_idx += 1
        
        # Generate narrative for next event (or final)
        if self.state.event_idx < len(self._timeline):
            next_event = self._timeline[self.state.event_idx]
            narrative = next_event.get_narrative(self.state, self.state.passenger)
            self.state.narrative_history.append(narrative)
        else:
            narrative = self._aftermath_narrative(self.state, self.state.passenger)
            self.state.narrative_history.append(narrative)
        
        # Check completion
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
        """Get status. Optional state_dict for serverless."""
        if state_dict:
            self.state = SimulationState.from_dict(state_dict)
        
        if not self.state.simulation_active:
            return {"active": False}
        
        return {
            "active": True,
            "current_time": self._get_current_time_str(),
            "survival_probability": self.state.survival_probability,
            "status": self._get_status_dict(),
            "decisions_made": len(self.state.decisions_log),
            "events_remaining": len(self._timeline) - self.state.event_idx,
            "next_event": self._event_to_dict(self._timeline[self.state.event_idx]) if self.state.event_idx < len(self._timeline) else None,
            "state": self.state.to_dict(),
        }
    
    # ================================================================== #
    # STATE MANAGEMENT (serverless support)
    # ================================================================== #
    def to_dict(self) -> Dict[str, Any]:
        return self.state.to_dict()
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TitanicSimulator":
        sim = cls()
        sim.state = SimulationState.from_dict(data)
        return sim
    
    # ================================================================== #
    # INTERNAL LOGIC
    # ================================================================== #
    def _apply_choice(self, choice: Dict[str, Any]) -> None:
        """Apply all effects from a player choice."""
        # Probability modifier
        if "modifier" in choice:
            self.state.survival_probability += choice["modifier"]
        
        # Location change
        if "move" in choice:
            self._set_location(self.state, choice["move"])
        
        # Condition
        if "condition" in choice:
            self._apply_condition(self.state, choice["condition"], 1.0)
        
        # Panic
        if "condition" == Condition.PANICKED:
            self.state.panic_level = min(10, self.state.panic_level + 3)
        
        # Energy cost
        if "energy_cost" in choice:
            self.state.energy = max(0, self.state.energy - choice["energy_cost"])
        
        # Reputation
        if "reputation" in choice:
            self.state.reputation = max(0, min(10, self.state.reputation + choice["reputation"]))
        
        # Inventory
        if "item" in choice:
            item_map = {
                "lifebelt": {"id": "lifebelt", "name": "Lifebelt", "description": "Cork and canvas life preserver", "usable": True},
                "warm_clothes": {"id": "warm_clothes", "name": "Warm clothes", "description": "Heavy wool and layers", "usable": True},
                "debris": {"id": "debris", "name": "Floating debris", "description": "Wooden panel or deck chair", "usable": True},
            }
            if choice["item"] in item_map:
                self.state.inventory.append(item_map[choice["item"]])
        
        # Risk of injury
        if "risk" in choice and random.random() < 0.3:
            self._apply_condition(self.state, Condition.INJURED, 1.0)
            self.state.survival_probability -= 0.05
        
        # Flags
        if "flag" in choice:
            self.state.flags[choice["flag"]] = True
        
        # Companion
        if "companion" in choice:
            self.state.companions.append({
                "name": "Unknown survivor",
                "relation": "stranger",
                "age": 30,
                "condition": Condition.INJURED.value,
                "alive": True,
            })
    
    def _apply_time_decay(self, minutes: int) -> None:
        """Survival naturally decreases as the ship sinks further."""
        # Base decay: 0.2% per minute after first 30 minutes
        if minutes > 30:
            decay = (minutes - 30) * 0.002
            self.state.survival_probability -= decay
        
        # Hypothermia check if in water
        if self.state.location == Location.WATER.value:
            self.state.warmth = max(0, self.state.warmth - 2)
            if self.state.warmth <= 3:
                self.state.condition = Condition.HYPOTHERMIA.value
                self.state.survival_probability -= 0.08
            else:
                self.state.condition = Condition.WET.value
        
        # Panic recovery if safe
        if self.state.location in [Location.RESCUED.value, Location.COLLAPSIBLE.value]:
            self.state.panic_level = max(0, self.state.panic_level - 2)
            self.state.warmth = min(10, self.state.warmth + 1)
        
        # Clamp
        self.state.survival_probability = max(0.0, min(1.0, self.state.survival_probability))
    
    def _compute_final_survival(self, state: SimulationState, p: Dict[str, Any]) -> float:
        """Compute final survival probability based on end-state."""
        prob = state.survival_probability
        
        # Location bonuses/penalties
        location_mods = {
            Location.RESCUED.value: 0.30,
            Location.COLLAPSIBLE.value: 0.15,
            Location.WATER.value: -0.20,
            Location.CABIN.value: -0.40,
        }
        prob += location_mods.get(state.location, 0.0)
        
        # Condition effects
        condition_mods = {
            Condition.HYPOTHERMIA.value: -0.25,
            Condition.INJURED.value: -0.15,
            Condition.EXHAUSTED.value: -0.10,
            Condition.PANICKED.value: -0.08,
        }
        prob += condition_mods.get(state.condition, 0.0)
        
        # Inventory bonuses
        inv_ids = {i.get("id") for i in state.inventory}
        if "lifebelt" in inv_ids:
            prob += 0.10
        if "debris" in inv_ids and state.location == Location.WATER.value:
            prob += 0.08
        if "warm_clothes" in inv_ids:
            prob += 0.05
        
        # Passenger-specific historical factors
        if p.get("Sex") == "female":
            prob += 0.08  # Women had ~74% survival vs 20% for men
        if p.get("Age", 30) < 16:
            prob += 0.05  # Children prioritized
        
        return float(max(0.0, min(1.0, prob)))
    
    def _apply_condition(self, state: SimulationState, condition: Condition, probability: float) -> None:
        if random.random() < probability:
            state.condition = condition.value
    
    def _set_location(self, state: SimulationState, location: Location) -> None:
        if isinstance(location, Location):
            state.location = location.value
        else:
            state.location = str(location)
    
    def _modify_panic(self, state: SimulationState, delta: int) -> None:
        state.panic_level = max(0, min(10, state.panic_level + delta))
    
    def _get_current_time_str(self) -> str:
        if self.state.event_idx < len(self._timeline):
            return self._timeline[self.state.event_idx].time_str
        return "2:20 AM"
    
    def _location_name(self, location_value: str) -> str:
        names = {
            Location.CABIN.value: "cabin",
            Location.CORRIDOR.value: "corridor",
            Location.BOAT_DECK.value: "stateroom near the boat deck",
            Location.LIFEBOAT_STATION.value: "position at the lifeboat station",
            Location.WATER.value: "position in the freezing water",
        }
        return names.get(location_value, "location")
    
    def _get_status_dict(self) -> Dict[str, Any]:
        """Rich status object for frontend rendering."""
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
    
    def _event_to_dict(self, event: Event) -> Dict[str, Any]:
        choices = event.get_choices(self.state, self.state.passenger)
        return {
            "time": event.time_str,
            "minutes_from_impact": event.minutes_from_impact,
            "event": event.description,
            "narrative": event.get_narrative(self.state, self.state.passenger),
            "choices": [
                {
                    "id": c["id"],
                    "text": c["text"],
                    "risk": c.get("risk"),
                    "energy_cost": c.get("energy_cost"),
                }
                for c in choices
            ],
        }
    
    def _build_response(self) -> Dict[str, Any]:
        event = self._timeline[self.state.event_idx] if self.state.event_idx < len(self._timeline) else None
        
        return {
            "complete": False,
            "survival_probability": round(self.state.survival_probability, 3),
            "current_time": self._get_current_time_str(),
            "narrative": self.state.narrative_history[-1] if self.state.narrative_history else "",
            "status": self._get_status_dict(),
            "message": f"Your survival probability is now {self.state.survival_probability:.0%}.",
            "next_event": self._event_to_dict(event) if event else None,
            "decisions": self.state.decisions_log,
            "state": self.state.to_dict(),
        }
    
    def _get_final_message(self, prob: float) -> str:
        if prob > 0.7:
            return "You survived against the odds. The Carpathia finds you at dawn."
        elif prob > 0.5:
            return "You survived, but you will never forget this night."
        elif prob > 0.3:
            return "You fought hard, but the Atlantic was merciless."
        else:
            return "You became one of the 1,500 souls lost in the deep."
