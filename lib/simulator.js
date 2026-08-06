const Location = {
  CABIN: 'cabin',
  CORRIDOR: 'corridor',
  GRAND_STAIRCASE: 'grand_staircase',
  BOAT_DECK: 'boat_deck',
  LIFEBOAT_STATION: 'lifeboat_station',
  A_DECK: 'a_deck',
  B_DECK: 'b_deck',
  STEERAGE: 'steerage',
  KITCHEN: 'kitchen',
  WATER: 'in_water',
  COLLAPSIBLE: 'collapsible_boat',
  RESCUED: 'rescued',
};

const Condition = {
  HEALTHY: 'healthy',
  WET: 'wet',
  INJURED: 'injured',
  EXHAUSTED: 'exhausted',
  HYPOTHERMIA: 'hypothermia',
  PANICKED: 'panicked',
  TRAPPED: 'trapped',
};

const ITEMS = {
  lifebelt: { id: 'lifebelt', name: 'Lifebelt', description: 'Cork and canvas life preserver', usable: true },
  warm_clothes: { id: 'warm_clothes', name: 'Warm clothes', description: 'Heavy wool and layers', usable: true },
  debris: { id: 'debris', name: 'Floating debris', description: 'Wooden panel or deck chair', usable: true },
};

const TIMELINE = [
  {
    time: '11:40 PM',
    minutes: 0,
    desc: 'A terrible shudder runs through the ship. The engines stop.',
    choices: (s, p) => [
      { id: 'investigate', text: 'Go out and see what\'s happening', mod: 0.02, move: Location.CORRIDOR },
      { id: 'stay_put', text: 'Stay in your cabin and wait for instructions', mod: -0.05, move: Location.CABIN },
      { id: 'dress_warm', text: 'Put on warm clothes and lifebelt immediately', mod: 0.08, move: Location.CABIN, item: 'warm_clothes', flag: 'has_belt' },
      ...(p.Sex === 'female' || p.Age < 16 ? [{ id: 'find_family', text: 'Gather your family immediately', mod: 0.05, move: Location.CORRIDOR, flag: 'family_together' }] : []),
    ],
    narrative: (s, p) => {
      const loc = s.location === Location.CABIN ? 'cabin' : 'room';
      if (p.Pclass === 1) return `You are in your ${loc} on A-Deck. The crystal chandeliers sway. A muffled crunch echoes through the hull.`;
      if (p.Pclass === 2) return `Your ${loc} on D-Deck shudders. The vibration stops abruptly. The engines have fallen silent.`;
      return `Deep in the bowels of the ship, your ${loc} in steerage shakes. The hum of the engines dies.`;
    },
  },
  {
    time: '11:45 PM',
    minutes: 5,
    desc: 'The ship is dead in the water. Stewards begin knocking on doors.',
    choices: (s, p) => [
      { id: 'go_deck', text: 'Head up to the boat deck', mod: 0.05, move: Location.BOAT_DECK },
      { id: 'help_others', text: 'Help other passengers find their way', mod: 0.03, move: Location.CORRIDOR, rep: 2 },
      { id: 'return_cabin', text: 'Go back for valuables and warm clothes', mod: -0.08, move: Location.CABIN, item: 'warm_clothes' },
      ...(p.Pclass === 3 ? [{ id: 'break_through', text: 'Try to find a way up from steerage', mod: 0.02, move: Location.CORRIDOR, risk: 'injury' }] : []),
    ],
    narrative: (s, p) => {
      if (p.Pclass === 1) return 'A steward knocks politely. "Sorry to disturb, sir, but we have struck something. No danger, but please put on warm clothes."';
      if (p.Pclass === 2) return 'Passengers mill in the corridors. Some laugh it off. Others look concerned. A crewman walks past with a grim face.';
      return 'Water seeps under the door. The air smells of bilge. Someone shouts in a language you don\'t understand. It\'s time to move.';
    },
  },
  {
    time: '11:55 PM',
    minutes: 15,
    desc: 'The forward compartments are flooding. The ship begins to list forward.',
    choices: (s, p) => [
      { id: 'stairs_up', text: 'Climb the grand staircase upward', mod: 0.04, move: Location.GRAND_STAIRCASE },
      { id: 'crew_stairs', text: 'Use the crew stairwell (faster but narrow)', mod: 0.06, move: Location.BOAT_DECK, risk: 'injury' },
      { id: 'assist_wounded', text: 'Help an injured person reach the deck', mod: 0.01, move: Location.CORRIDOR, rep: 3, companion: true },
      ...(s.flags.family_together ? [{ id: 'stay_with_family', text: 'Stay with your family and move as a group', mod: 0.03, move: Location.CORRIDOR, flag: 'group_move' }] : []),
    ],
    narrative: () => 'The corridor tilts slightly downward toward the bow. People are moving upward, some carrying children, some carrying nothing but fear.',
    auto: (s) => { if (Math.random() < 0.1) s.condition = Condition.WET; },
  },
  {
    time: '12:05 AM',
    minutes: 25,
    desc: 'Captain Smith orders: "Abandon ship. Women and children first."',
    choices: (s, p) => {
      const isPriority = p.Sex === 'female' || p.Age < 16;
      const opts = [];
      if (isPriority) {
        opts.push({ id: 'approach_boat', text: 'Approach the lifeboat station calmly', mod: 0.15, move: Location.LIFEBOAT_STATION });
        opts.push({ id: 'refuse_separation', text: 'Refuse to leave without your husband', mod: -0.05, move: Location.BOAT_DECK, flag: 'refused_separation' });
      } else {
        opts.push({ id: 'help_launch', text: 'Help crew load women and children', mod: 0.10, move: Location.LIFEBOAT_STATION, rep: 2 });
        opts.push({ id: 'find_collapsible', text: 'Search for the collapsible boats', mod: 0.05, move: Location.BOAT_DECK });
      }
      opts.push({ id: 'panic_push', text: 'Push through the crowd toward a boat', mod: -0.10, move: Location.LIFEBOAT_STATION, panic: 3 });
      return opts;
    },
    narrative: (s, p) => {
      if (p.Sex === 'female' || p.Age < 16) return 'An officer stands by the lifeboat. "Women and children first!" he shouts. Hands reach to help you. Men stand back, faces pale.';
      return 'You watch women and children being helped into the boats. Some men try to rush forward and are pushed back by crew. The air smells of salt and coal smoke.';
    },
  },
  {
    time: '12:15 AM',
    minutes: 35,
    desc: 'Lifeboat 7 is lowered—only 28 people in a boat built for 65.',
    choices: (s, p) => {
      const opts = [];
      const isPriority = p.Sex === 'female' || p.Age < 16;
      if (isPriority && [Location.BOAT_DECK, Location.LIFEBOAT_STATION].includes(s.location)) {
        opts.push({ id: 'board_boat', text: 'Board the lifeboat', mod: 0.25, move: Location.RESCUED, flag: 'in_lifeboat' });
      } else if (s.reputation >= 6) {
        opts.push({ id: 'crew_allows', text: 'Crew recognizes you from helping and lets you assist', mod: 0.08, move: Location.LIFEBOAT_STATION });
      }
      opts.push(
        { id: 'keep_helping', text: 'Continue helping others into boats', mod: 0.05, move: Location.LIFEBOAT_STATION, rep: 1 },
        { id: 'wait_next', text: 'Step back and wait for the next boat', mod: 0.02, move: Location.BOAT_DECK },
      );
      return opts;
    },
    narrative: () => 'The first boat drops into the black water. It\'s half-empty. "Room for more!" someone cries, but fear has frozen many in place.',
  },
  {
    time: '12:30 AM',
    minutes: 50,
    desc: 'The bow is visibly sinking. The stern lifts slightly. Chaos grows.',
    choices: (s) => [
      { id: 'move_stern', text: 'Move toward the rising stern', mod: 0.03, move: Location.A_DECK },
      { id: 'jump_prepare', text: 'Prepare to jump clear when she goes', mod: 0.02, move: Location.BOAT_DECK },
      { id: 'find_float', text: 'Search for floating debris or deck chairs', mod: 0.04, move: Location.BOAT_DECK, item: 'debris' },
      ...(s.inventory.some(i => i.id === 'lifebelt') ? [{ id: 'secure_belt', text: 'Double-check your lifebelt is secure', mod: 0.06 }] : []),
    ],
    narrative: () => 'The deck tilts dramatically. You grip a railing. The band plays "Autumn" now, the notes drifting across the chaos like a lullaby for the dying.',
    auto: (s) => { s.panic_level = Math.min(10, s.panic_level + 2); },
  },
  {
    time: '12:45 AM',
    minutes: 65,
    desc: 'Third-class passengers are trapped below by locked gates. The list worsens.',
    choices: (s, p) => {
      const opts = [];
      if (p.Pclass === 3 && ![Location.BOAT_DECK, Location.LIFEBOAT_STATION].includes(s.location)) {
        opts.push({ id: 'break_gate', text: 'Break through the locked gate', mod: 0.05, move: Location.CORRIDOR, risk: 'injury', rep: -1 });
        opts.push({ id: 'find_crew_door', text: 'Search for an unlocked crew passage', mod: 0.08, move: Location.CORRIDOR });
      } else {
        opts.push({ id: 'hold_position', text: 'Hold your position on deck', mod: 0.02, move: s.location });
      }
      opts.push({ id: 'help_trapped', text: 'Try to help trapped passengers escape', mod: 0.03, move: Location.CORRIDOR, rep: 2 });
      return opts;
    },
    narrative: (s, p) => {
      if (p.Pclass === 3) return 'A locked gate blocks the stairwell. A steward yells "Stay back!" but water is rising behind you. Time is running out.';
      return 'You pass frightened steerage passengers being directed upward. The hierarchy of the ship is dissolving into the hierarchy of survival.';
    },
  },
  {
    time: '1:00 AM',
    minutes: 80,
    desc: 'The forward well deck is underwater. The band plays on the boat deck.',
    choices: (s, p) => [
      { id: 'climb_stern', text: 'Climb toward the rising stern', mod: 0.04, move: Location.A_DECK, energy: 2 },
      { id: 'hold_rail', text: 'Hold onto the railing and brace', mod: 0.02, move: s.location },
      { id: 'jump_early', text: 'Jump into the water now (avoid the suction)', mod: 0.01, move: Location.WATER, condition: Condition.WET },
      ...(s.flags.in_lifeboat ? [{ id: 'row_away', text: 'Row hard to get away from the suction', mod: 0.20, move: Location.RESCUED }] : []),
    ],
    narrative: () => 'The bow is completely submerged. Water rushes across the well deck. The ship groans, a sound like a great beast being torn apart.',
    auto: (s) => { if (Math.random() < 0.2) s.condition = Condition.EXHAUSTED; },
  },
  {
    time: '1:15 AM',
    minutes: 95,
    desc: 'The last regular lifeboats are leaving. Collapsibles are being prepared.',
    choices: (s, p) => {
      const opts = [];
      const isPriority = p.Sex === 'female' || p.Age < 16;
      if (isPriority && [Location.BOAT_DECK, Location.LIFEBOAT_STATION].includes(s.location)) {
        opts.push({ id: 'last_boat', text: 'Board one of the last lifeboats', mod: 0.20, move: Location.RESCUED, flag: 'in_lifeboat' });
      }
      opts.push(
        { id: 'collapsible_a', text: 'Run toward Collapsible A (being prepared)', mod: 0.08, move: Location.BOAT_DECK },
        { id: 'collapsible_b', text: 'Head to Collapsible B on the officers\' quarters', mod: 0.10, move: Location.BOAT_DECK, risk: 'injury' },
      );
      if (p.Age > 50 || s.condition === Condition.INJURED) {
        opts.push({ id: 'accept_fate', text: 'Help others and accept your fate with dignity', mod: 0.05, move: s.location, rep: 5 });
      }
      return opts;
    },
    narrative: () => 'Officers shout "No more room!" Collapsible boats are being dragged across the deck. The deck angle is now severe. You slide if you don\'t hold on.',
  },
  {
    time: '1:30 AM',
    minutes: 110,
    desc: 'The ship\'s lights flicker. The stern rises high into the air.',
    choices: (s) => [
      { id: 'ride_plunge', text: 'Ride the stern down as she goes under', mod: -0.05, move: Location.WATER, condition: Condition.INJURED },
      { id: 'jump_clear', text: 'Jump clear of the ship', mod: 0.03, move: Location.WATER, condition: Condition.WET },
      { id: 'climb_on', text: 'Climb onto the overturned Collapsible B', mod: 0.15, move: Location.COLLAPSIBLE, risk: 'injury' },
      ...(s.flags.in_lifeboat ? [{ id: 'watch_horror', text: 'Watch in horror from the lifeboat', mod: 0.15, move: Location.RESCUED }] : []),
    ],
    narrative: () => 'The lights go out. In the darkness, the ship\'s spine breaks with a thunderous crack. The bow plunges, pulling the stern vertical.',
    auto: (s) => { s.panic_level = Math.min(10, s.panic_level + 3); },
  },
  {
    time: '1:45 AM',
    minutes: 125,
    desc: 'The ship groans like a wounded beast. Everything not bolted down slides forward.',
    choices: (s) => [
      { id: 'swim_away', text: 'Swim hard away from the suction', mod: 0.05, move: Location.WATER, energy: 3 },
      { id: 'find_debris', text: 'Grab onto floating debris', mod: 0.08, move: Location.WATER, item: 'debris' },
      { id: 'help_swimmer', text: 'Help another swimmer stay afloat', mod: 0.03, move: Location.WATER, rep: 2, energy: 2 },
      ...(s.inventory.some(i => i.id === 'debris') ? [{ id: 'use_debris', text: 'Climb onto your debris and conserve energy', mod: 0.10, move: Location.WATER }] : []),
    ],
    narrative: () => 'You are in the water. The ship\'s stern stands like a black tower against the stars, then slides under with a terrible roar. The suction pulls you down.',
  },
  {
    time: '2:00 AM',
    minutes: 140,
    desc: 'The Titanic begins her final plunge. The stern stands almost vertical.',
    choices: (s) => [
      { id: 'tread_water', text: 'Tread water and stay calm', mod: 0.02, move: Location.WATER },
      { id: 'swim_boat', text: 'Swim toward a distant lifeboat', mod: 0.05, move: Location.WATER, energy: 4 },
      { id: 'group_huddle', text: 'Group with other survivors to share warmth', mod: 0.06, move: Location.WATER, flag: 'group_huddle' },
      ...(s.condition === Condition.HYPOTHERMIA ? [{ id: 'slip_away', text: 'Consciousness fades as hypothermia takes hold...', mod: -0.10, move: Location.WATER }] : []),
    ],
    narrative: (s, p) => {
      return 'The Atlantic is -2°C. Your muscles seize. Around you, voices grow quieter. The stars are impossibly bright. You think of home.';
    },
  },
  {
    time: '2:20 AM',
    minutes: 160,
    desc: 'The Titanic slips beneath the waves. The sea is filled with screaming.',
    choices: (s, p) => {
      const final = computeFinalSurvival(s, p);
      if (s.location === Location.RESCUED || s.location === Location.COLLAPSIBLE) {
        return [{ id: 'survived', text: 'You survived the sinking', mod: 0, final: true }];
      }
      if (final > 0.5) {
        return [{ id: 'rescued_later', text: 'You cling to life until rescued by the Carpathia', mod: 0, final: true }];
      }
      return [{ id: 'perished', text: 'The cold Atlantic claims you', mod: 0, final: true }];
    },
    narrative: (s, p) => {
      if (s.location === Location.RESCUED) return 'You huddle in the lifeboat, weeping, praying, or simply staring at the empty sea where 1,500 souls just disappeared.';
      if (computeFinalSurvival(s, p) > 0.5) return 'Somehow, you cling to consciousness. Hours later, a light appears. The Carpathia. You are one of the 706.';
      return 'The cold takes you gently, like sleep. Your name will be read in churches. Your body will never be found.';
    },
    auto: (s) => { s.location = Location.WATER; },
  },
];

function createInitialState(passenger, baseProbability) {
  const inventory = [];
  if (passenger.Pclass === 1) {
    inventory.push({ ...ITEMS.warm_clothes });
  }

  return {
    passenger,
    survival_probability: Math.max(0.1, Math.min(0.9, baseProbability)),
    simulation_active: true,
    event_idx: 0,
    current_time: '1912-04-14T23:40:00',
    location: Location.CABIN,
    condition: Condition.HEALTHY,
    panic_level: 0,
    warmth: 10,
    energy: 10,
    reputation: 5,
    companions: [],
    inventory,
    decisions_log: [],
    narrative_history: [],
    flags: {},
  };
}

function computeFinalSurvival(state, passenger) {
  let prob = state.survival_probability;

  const locMods = {
    [Location.RESCUED]: 0.30,
    [Location.COLLAPSIBLE]: 0.15,
    [Location.WATER]: -0.20,
    [Location.CABIN]: -0.40,
  };
  prob += (locMods[state.location] || 0);

  const condMods = {
    [Condition.HYPOTHERMIA]: -0.25,
    [Condition.INJURED]: -0.15,
    [Condition.EXHAUSTED]: -0.10,
    [Condition.PANICKED]: -0.08,
  };
  prob += (condMods[state.condition] || 0);

  const invIds = new Set(state.inventory.map(i => i.id));
  if (invIds.has('lifebelt')) prob += 0.10;
  if (invIds.has('debris') && state.location === Location.WATER) prob += 0.08;
  if (invIds.has('warm_clothes')) prob += 0.05;

  if (passenger.Sex === 'female') prob += 0.08;
  if (passenger.Age < 16) prob += 0.05;

  return Math.max(0, Math.min(1, prob));
}

function applyChoice(state, choice) {
  if (choice.mod !== undefined) state.survival_probability += choice.mod;
  if (choice.move) state.location = choice.move;
  if (choice.condition) state.condition = choice.condition;
  if (choice.panic) state.panic_level = Math.min(10, state.panic_level + choice.panic);
  if (choice.energy) state.energy = Math.max(0, state.energy - choice.energy);
  if (choice.rep !== undefined) state.reputation = Math.max(0, Math.min(10, state.reputation + choice.rep));
  if (choice.item && ITEMS[choice.item]) {
    if (!state.inventory.some(i => i.id === choice.item)) {
      state.inventory.push({ ...ITEMS[choice.item] });
    }
  }
  if (choice.risk && Math.random() < 0.3) {
    state.condition = Condition.INJURED;
    state.survival_probability -= 0.05;
  }
  if (choice.flag) state.flags[choice.flag] = true;
  if (choice.companion) {
    state.companions.push({ name: 'Unknown survivor', relation: 'stranger', age: 30, condition: Condition.INJURED, alive: true });
  }

  state.survival_probability = Math.max(0, Math.min(1, state.survival_probability));
}

function applyTimeDecay(state, minutes) {
  if (minutes > 30) {
    state.survival_probability -= (minutes - 30) * 0.002;
  }
  if (state.location === Location.WATER) {
    state.warmth = Math.max(0, state.warmth - 2);
    if (state.warmth <= 3) {
      state.condition = Condition.HYPOTHERMIA;
      state.survival_probability -= 0.08;
    } else {
      state.condition = Condition.WET;
    }
  }
  if ([Location.RESCUED, Location.COLLAPSIBLE].includes(state.location)) {
    state.panic_level = Math.max(0, state.panic_level - 2);
    state.warmth = Math.min(10, state.warmth + 1);
  }
  state.survival_probability = Math.max(0, Math.min(1, state.survival_probability));
}

function getStatus(state) {
  return {
    location: state.location,
    condition: state.condition,
    panic_level: state.panic_level,
    warmth: state.warmth,
    energy: state.energy,
    reputation: state.reputation,
    inventory: state.inventory,
    companions: state.companions,
    flags: state.flags,
  };
}

export class TitanicSimulator {
  static initialize(passenger, baseProbability) {
    const state = createInitialState(passenger, baseProbability);
    const event = TIMELINE[0];
    const narrative = event.narrative(state, passenger);
    state.narrative_history.push(narrative);

    return {
      result: {
        started: true,
        current_time: event.time,
        survival_probability: state.survival_probability,
        message: '⚠️ The Titanic has struck an iceberg!',
        narrative,
        status: getStatus(state),
        next_event: {
          time: event.time,
          minutes_from_impact: event.minutes,
          event: event.desc,
          narrative,
          choices: event.choices(state, passenger).map(c => ({
            id: c.id,
            text: c.text,
            risk: c.risk || null,
            energy_cost: c.energy || null,
          })),
        },
      },
      state,
    };
  }

  static process(state, decisionId) {
    if (!state.simulation_active) {
      return { result: { error: 'Simulation not active' }, state };
    }

    if (state.event_idx >= TIMELINE.length) {
      return { result: { error: 'Simulation already complete' }, state };
    }

    const event = TIMELINE[state.event_idx];
    const choices = event.choices(state, state.passenger);
    const choice = choices.find(c => c.id === decisionId);

    if (!choice) {
      return { result: { error: `Invalid decision: ${decisionId}` }, state };
    }

    applyChoice(state, choice);
    if (event.auto) event.auto(state);
    applyTimeDecay(state, event.minutes);

    state.decisions_log.push({
      time: event.time,
      decision: choice.text,
      event: event.desc,
    });

    state.event_idx++;

    let narrative;
    if (state.event_idx < TIMELINE.length) {
      narrative = TIMELINE[state.event_idx].narrative(state, state.passenger);
    } else {
      narrative = TIMELINE[TIMELINE.length - 1].narrative(state, state.passenger);
    }
    state.narrative_history.push(narrative);

    if (state.event_idx >= TIMELINE.length || choice.final) {
      state.simulation_active = false;
      const finalProb = computeFinalSurvival(state, state.passenger);
      const survived = finalProb > 0.5;

      let message;
      if (finalProb > 0.7) message = 'You survived against the odds. The Carpathia finds you at dawn.';
      else if (finalProb > 0.5) message = 'You survived, but you will never forget this night.';
      else if (finalProb > 0.3) message = 'You fought hard, but the Atlantic was merciless.';
      else message = 'You became one of the 1,500 souls lost in the deep.';

      return {
        result: {
          complete: true,
          final_probability: finalProb,
          survived,
          narrative,
          status: getStatus(state),
          decisions: state.decisions_log,
          message,
          next_event: null,
        },
        state,
      };
    }

    const nextEvent = TIMELINE[state.event_idx];
    return {
      result: {
        complete: false,
        survival_probability: Math.round(state.survival_probability * 1000) / 1000,
        current_time: nextEvent.time,
        narrative,
        status: getStatus(state),
        message: `Your survival probability is now ${(state.survival_probability * 100).toFixed(0)}%.`,
        next_event: {
          time: nextEvent.time,
          minutes_from_impact: nextEvent.minutes,
          event: nextEvent.desc,
          narrative,
          choices: nextEvent.choices(state, state.passenger).map(c => ({
            id: c.id,
            text: c.text,
            risk: c.risk || null,
            energy_cost: c.energy || null,
          })),
        },
        decisions: state.decisions_log,
      },
      state,
    };
  }

  static getStatus(state) {
    if (!state.simulation_active) return { active: false };
    const nextEvent = TIMELINE[state.event_idx];
    return {
      active: true,
      current_time: nextEvent?.time || '2:20 AM',
      survival_probability: state.survival_probability,
      status: getStatus(state),
      decisions_made: state.decisions_log.length,
      events_remaining: TIMELINE.length - state.event_idx,
      next_event: nextEvent ? {
        time: nextEvent.time,
        minutes_from_impact: nextEvent.minutes,
        event: nextEvent.desc,
        narrative: nextEvent.narrative(state, state.passenger),
        choices: nextEvent.choices(state, state.passenger).map(c => ({
          id: c.id,
          text: c.text,
          risk: c.risk || null,
          energy_cost: c.energy || null,
        })),
      } : null,
    };
  }
}
