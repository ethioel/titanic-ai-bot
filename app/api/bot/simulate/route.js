import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════
// IN-MEMORY SESSION STORE (use Redis in production)
// ═══════════════════════════════════════════════════
const simSessions = new Map();

// ═══════════════════════════════════════════════════
// DATA NORMALIZER (matches interview/predict routes)
// ═══════════════════════════════════════════════════
function normalizeData(raw) {
  const get = (keys) => {
    for (const k of keys) if (raw?.[k] !== undefined && raw?.[k] !== null) return raw[k];
    return undefined;
  };

  const age = Number(get(['age', 'Age']));
  const pclass = Number(get(['pclass', 'Pclass']));
  const sex = String(get(['sex', 'Sex']) ?? '').toLowerCase().trim();
  const fare = Number(get(['fare', 'Fare']));
  const embarked = String(get(['embarked', 'Embarked']) ?? '').toUpperCase().trim();
  
  let familySize = Number(get(['familySize', 'family_size', 'FamilySize']));
  if (isNaN(familySize)) {
    const sibSp = Number(get(['sibSp', 'SibSp']) ?? 0);
    const parch = Number(get(['parch', 'Parch']) ?? 0);
    familySize = sibSp + parch;
  }

  return {
    name: String(get(['name', 'Name']) ?? 'Passenger'),
    age: !isNaN(age) && age >= 0 && age <= 120 ? age : 30,
    pclass: [1, 2, 3].includes(pclass) ? pclass : 3,
    sex: sex === 'female' || sex === 'male' ? sex : 'male',
    fare: !isNaN(fare) && fare >= 0 ? fare : (pclass === 1 ? 60 : pclass === 2 ? 20 : 8),
    familySize: !isNaN(familySize) && familySize >= 0 ? familySize : 0,
    embarked: ['S', 'C', 'Q'].includes(embarked) ? embarked : 'S'
  };
}

// ═══════════════════════════════════════════════════
// BASE SURVIVAL ENGINE (identical to interview/predict)
// ═══════════════════════════════════════════════════
function calculateBaseProbability(d) {
  let score = 0.38;

  if (d.pclass === 1) score += 0.22;
  else if (d.pclass === 2) score += 0.08;
  else score -= 0.05;

  if (d.sex === 'female') score += 0.32;
  else score -= 0.18;

  if (d.age < 5) score += 0.15;
  else if (d.age < 16) score += 0.10;
  else if (d.age > 60) score -= 0.12;
  else if (d.age > 45) score -= 0.05;

  if (d.familySize >= 1 && d.familySize <= 3) score += 0.05;
  else if (d.familySize > 4) score -= 0.10;
  else if (d.familySize === 0) score -= 0.02;

  if (d.fare > 80) score += 0.04;
  else if (d.fare < 10) score -= 0.03;

  return Math.max(0.03, Math.min(0.97, score));
}

// ═══════════════════════════════════════════════════
// HISTORICAL SCENARIO ENGINE
// ═══════════════════════════════════════════════════
const SCENARIOS = [
  {
    id: 'collision',
    time: '11:40 PM — April 14, 1912',
    title: 'The Collision',
    narrative: `A faint grinding shudder runs through the deck. The engines stop. The lights flicker, then hold. In the silence, you hear distant shouting from the forward compartments. A crewman rushes past your cabin shouting **"Iceberg! We've struck an iceberg!"**

The ship is taking on water in the forward holds, but the band is still playing in the lounge. Some passengers are already putting on lifebelts. Others are laughing it off — *"The Titanic is unsinkable."*

**What do you do?`,
    choices: [
      {
        id: 'stay_cabin',
        text: '🛏️ Stay in your cabin and wait for official instructions',
        impact: -0.18,
        outcome: `You wait. The list to port grows steeper. By the time you venture out, the corridors are flooding and the stairwells are jammed with panicked steerage passengers. Many who stayed in their cabins — like 1st Class passenger Washington Roebling — never made it to the boat deck.`
      },
      {
        id: 'go_deck',
        text: '🚶 Go immediately to the boat deck with your lifebelt',
        impact: +0.22,
        outcome: `You arrive early. The boat deck is calm. Officers are methodically uncovering lifeboats. You watch as Rocket signals burst overhead — the first distress call. Your early positioning gives you time to assess the situation and secure a place near Lifeboat 7.`
      },
      {
        id: 'investigate',
        text: '🔍 Try to learn more from crew or other passengers',
        impact: +0.05,
        outcome: `You learn from a stoker that water is flooding Boiler Room 6. The news spreads in hushed whispers through the smoking room. You gain valuable information, but the delay costs you your preferred position at the boats.`
      }
    ]
  },
  {
    id: 'evacuation',
    time: '12:05 AM — 35 minutes after impact',
    title: 'Evacuation Begins',
    narrative: `The bow is visibly down. The band has moved to the boat deck and is playing ragtime. Officers are shouting **"Women and children first!"** with increasing urgency. 

Lifeboat 7 is being loaded — it holds 65 people but only has 28 aboard. A 1st Class gentleman is arguing with Officer Murdoch. Below, 3rd Class passengers are trapped behind gated stairwells, pounding on the barriers.

**What do you do?`,
    choices: [
      {
        id: 'queue',
        text: '🛟 Queue calmly at the nearest lifeboat station',
        impact: +0.16,
        outcome: `Your patience pays off. Officer Lightoller (port side) or Murdoch (starboard) directs you efficiently. You maintain dignity under pressure — a trait noted by survivors. The boat lowers smoothly into the freezing black water.`
      },
      {
        id: 'find_family',
        text: '👨‍👩‍👧 Search for family members before approaching boats',
        impact: -0.14,
        outcome: `The search takes precious minutes. The Straus couple refused to separate. The Allison family searched for their toddler until it was too late — all three perished. By the time you return, the boats are gone or half-filled and already swinging out.`
      },
      {
        id: 'return',
        text: '💼 Go back inside to fetch valuables or warmer clothes',
        impact: -0.22,
        outcome: `A fatal delay. Benjamin Guggenheim returned to change into his finest evening wear. He was last seen sitting in the Grand Staircase with a brandy. The corridors are now tilting at 10 degrees. The way back up is blocked by rising water.`
      }
    ]
  },
  {
    id: 'crisis',
    time: '12:45 AM — Lifeboat Crisis',
    title: 'The Lifeboat Crisis',
    narrative: `The ship's bow is deep underwater. The propellers are rising out of the sea. Panic is setting in. 

On the **port side**, 2nd Officer Lightoller is enforcing "women and children ONLY" with a revolver. On the **starboard side**, 1st Officer Murdoch allows men if there is room. Lifeboat 1 leaves with only 12 people — capacity 40. Lifeboat 4 is being loaded from A-Deck via the windows.

**What do you do?`,
    choices: [
      {
        id: 'accept_seat',
        text: '🛟 Accept a lifeboat seat if offered',
        impact: +0.28,
        outcome: `You are pulled into a boat — perhaps Lifeboat 13 or 15. The drop to the water is 60 feet. The sea is a black, calm mirror reflecting the ship's blazing lights. You hear the band playing "Nearer, My God, to Thee" as you pull away.`
      },
      {
        id: 'sacrifice',
        text: '⚓ Give your seat to a woman or child',
        impact: +0.08,
        outcome: `A heroic act. Isidor Straus refused a seat while women remained. His wife Ida refused to leave him. They were last seen arm-in-arm on deck. You have chosen dignity, but your survival odds now depend entirely on finding another way off.`
      },
      {
        id: 'sneak',
        text: '🧥 Hide under a tarp or disguise yourself',
        impact: +0.06,
        outcome: `Daniel Buckley, a 21-year-old Irishman, hid under a blanket in a lifeboat and survived. Your deception works — the boat is lowered. But you carry the weight of knowing someone else might have taken that seat.`
      },
      {
        id: 'argue',
        text: '💢 Argue or try to force your way onto a boat',
        impact: -0.28,
        outcome: `Officer Lightoller fires his pistol into the air. You are pushed back. The crew is now using oars to keep desperate swimmers from swamping the boats. You have burned your bridge with the officers who control the remaining launches.`
      }
    ]
  },
  {
    id: 'plunge',
    time: '2:15 AM — The Final Plunge',
    title: 'The Ship Breaks',
    narrative: `The Titanic's bow is completely submerged. The stern rises until it is nearly vertical — a 30,000-ton steel tower against the starry sky. 

The lights blink once, then go out forever. You hear a thunderous roar as the ship's structure collapses — boilers exploding, furniture crashing down through 9 decks, the grand piano tumbling into the abyss. The stern hangs for a moment, then slides down with a sucking sound that survivors described as "the moan of a dying giant."

**What do you do?`,
    choices: [
      {
        id: 'jump_swim',
        text: '🌊 Jump into the water and swim away from the suction',
        impact: +0.10,
        outcome: `The water is -2°C — below the freezing point due to salt. The shock takes your breath away. You swim hard away from the vortex. Charles Joughin, the baker, treaded water for 2 hours after drinking heavily. You have minutes before hypothermia sets in.`
      },
      {
        id: 'debris',
        text: '🪵 Leap onto a floating collapsible or wooden panel',
        impact: +0.26,
        outcome: `You find Collapsible A or B — both floated off the deck as the ship sank. It is swamped and unstable, but it keeps you out of the water. You huddle with 30 others, feet frozen in the icy sloshing, waiting for dawn.`
      },
      {
        id: 'hold_rail',
        text: '⚓ Hold onto the railing as the ship goes under',
        impact: -0.24,
        outcome: `The suction is immense. You are pulled down with the ship, then released 60 feet below the surface. You fight for the surface, but your lungs are burning. Most who went down with the ship never resurfaced.`
      },
      {
        id: 'stay',
        text: '🕯️ Stay on the stern hoping for rescue',
        impact: -0.32,
        outcome: `The stern settles back almost level for a moment, then sinks rapidly. You are trapped inside as the ship becomes your coffin. The last signal from the Titanic's wireless went out at 2:17 AM. There is no one coming to this part of the ship.`
      }
    ]
  }
];

// ═══════════════════════════════════════════════════
// SIMULATION STATE MANAGER
// ═══════════════════════════════════════════════════
function createState(sessionId, passengerData, baseProb) {
  return {
    sessionId,
    passengerData,
    baseProbability: baseProb,
    currentProbability: baseProb,
    scenarioIndex: 0,
    history: [],
    complete: false,
    survived: null,
    finalNarrative: null
  };
}

function processDecision(state, decisionId) {
  if (state.complete) {
    return { error: 'Simulation already complete', state };
  }

  const scenario = SCENARIOS[state.scenarioIndex];
  if (!scenario) {
    return { error: 'Invalid scenario state', state };
  }

  const choice = scenario.choices.find(c => c.id === decisionId);
  if (!choice) {
    return { error: `Invalid decision: ${decisionId}`, state };
  }

  // Apply impact
  const oldProb = state.currentProbability;
  let newProb = oldProb + choice.impact;

  // Sex bonus/penalty in final scenario (historical: women more likely to be rescued from water)
  if (state.scenarioIndex === 3) {
    if (state.passengerData.sex === 'female') newProb += 0.05;
    else newProb -= 0.03;
  }

  // Clamp
  newProb = Math.max(0.02, Math.min(0.98, newProb));
  state.currentProbability = newProb;

  // Record history
  state.history.push({
    scenario: scenario.id,
    choice: choice.id,
    time: scenario.time,
    impact: choice.impact,
    before: oldProb,
    after: newProb
  });

  // Advance
  state.scenarioIndex += 1;

  // Check completion
  if (state.scenarioIndex >= SCENARIOS.length) {
    state.complete = true;
    state.survived = state.currentProbability > 0.5;

    // Build final narrative
    const survived = state.survived;
    const prob = state.currentProbability;
    state.finalNarrative = survived
      ? `## You Survived 🛟\n\nAgainst the odds, you made it. Your final survival probability was **${(prob * 100).toFixed(0)}%**.\n\n${prob > 0.75 ? 'Your decisions were nearly flawless — you acted with the calm efficiency of historical survivors like Molly Brown and Lawrence Beesley.' : 'You survived, but by the narrowest of margins. Like many who lived, luck played as large a role as courage.'}\n\nAt 4:10 AM, the **RMS Carpathia** arrived, her rockets painting the dawn sky red. You were hauled aboard, wrapped in blankets, and given hot coffee. **705 survived. 1,517 did not.**`
      : `## You Perished 🌊\n\nYour final survival probability fell to **${(prob * 100).toFixed(0)}%**.\n\n${prob < 0.20 ? 'Your fate mirrored the majority of male passengers in 3rd Class — trapped by geography, social hierarchy, and the cruel mathematics of insufficient lifeboats.' : 'You came close. Perhaps you reached a lifeboat but were turned away. Perhaps you jumped too late, or the cold took you before Carpathia arrived.'}\n\nThe **Mackay-Bennett** recovery ship found your body days later, or you rest in the deep, 12,000 feet below the North Atlantic surface. **1,517 souls were lost.**`;
  }

  return { state, choice, scenario };
}

function buildResponse(state, choice, scenario) {
  if (state.complete) {
    return {
      complete: true,
      survived: state.survived,
      survival_probability: state.currentProbability,
      message: state.finalNarrative,
      history: state.history,
      state: serializeState(state)
    };
  }

  const nextScenario = SCENARIOS[state.scenarioIndex];
  return {
    complete: false,
    survived: null,
    survival_probability: state.currentProbability,
    current_time: nextScenario.time,
    current_scenario: {
      id: nextScenario.id,
      title: nextScenario.title,
      narrative: nextScenario.narrative,
      choices: nextScenario.choices.map(c => ({
        id: c.id,
        text: c.text
      }))
    },
    last_outcome: choice ? {
      choice: choice.text,
      narrative: choice.outcome,
      impact: choice.impact
    } : null,
    message: choice 
      ? `**${choice.text}**\n\n${choice.outcome}\n\n---\n\n**Survival Probability: ${(state.currentProbability * 100).toFixed(0)}%**\n\n${nextScenario.narrative}`
      : nextScenario.narrative,
    history: state.history,
    state: serializeState(state)
  };
}

function serializeState(state) {
  // Strip non-serializable if any
  return JSON.parse(JSON.stringify(state));
}

// ═══════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Support both old API (action) and new API (start/decision_id)
    const { 
      action, 
      session_id, 
      passenger_data, 
      decision_id, 
      state: clientState,
      start,
      initial_probability,
      current_probability
    } = body;

    const sid = session_id || `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // ── START SIMULATION ──
    if (action === 'start' || start === true) {
      const raw = passenger_data || {};
      const data = normalizeData(raw);
      
      // Calculate base probability (prefer provided, else compute)
      let baseProb = typeof initial_probability === 'number' && !isNaN(initial_probability)
        ? initial_probability
        : calculateBaseProbability(data);

      const state = createState(sid, data, baseProb);
      simSessions.set(sid, state);

      const firstScenario = SCENARIOS[0];
      return NextResponse.json({
        complete: false,
        survived: null,
        survival_probability: baseProb,
        current_time: firstScenario.time,
        current_scenario: {
          id: firstScenario.id,
          title: firstScenario.title,
          narrative: firstScenario.narrative,
          choices: firstScenario.choices.map(c => ({ id: c.id, text: c.text }))
        },
        message: `**${firstScenario.title}**\n${firstScenario.time}\n\n${firstScenario.narrative}`,
        history: [],
        state: serializeState(state)
      });
    }

    // ── PROCESS DECISION ──
    if (action === 'decide' || decision_id) {
      // Prefer server state, fallback to client state
      let state = simSessions.get(sid);
      if (!state && clientState) {
        state = { ...clientState, passengerData: normalizeData(clientState.passengerData || {}) };
      }
      if (!state) {
        return NextResponse.json({ error: 'Simulation not found. Please restart.' }, { status: 400 });
      }

      // ── FIX: Update probability if client sends current tracking ──
      if (typeof current_probability === 'number' && !isNaN(current_probability)) {
        state.currentProbability = current_probability;
      }

      const result = processDecision(state, decision_id);
      if (result.error) {
        return NextResponse.json({ error: result.error, state: serializeState(result.state) }, { status: 400 });
      }

      // Persist
      simSessions.set(sid, result.state);
      return NextResponse.json(buildResponse(result.state, result.choice, result.scenario));
    }

    // ── STATUS CHECK ──
    if (action === 'status') {
      const state = simSessions.get(sid) || clientState;
      if (!state) {
        return NextResponse.json({ error: 'No active simulation' }, { status: 400 });
      }
      return NextResponse.json({
        complete: state.complete,
        survived: state.survived,
        survival_probability: state.currentProbability,
        scenario_index: state.scenarioIndex,
        history: state.history
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use: start, decide, or status' }, { status: 400 });

  } catch (error) {
    console.error('Simulation API Error:', error);
    return NextResponse.json(
      { error: 'Simulation engine failure', message: '⚠️ The scenario engine has struck an iceberg. Please restart.' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════
// GET STATUS (for polling / shareable links)
// ═══════════════════════════════════════════════════
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateParam = searchParams.get('state');
    const sid = searchParams.get('session_id');

    let state = null;
    if (sid && simSessions.has(sid)) {
      state = simSessions.get(sid);
    } else if (stateParam) {
      state = JSON.parse(decodeURIComponent(stateParam));
    }

    if (!state) {
      return NextResponse.json({ error: 'No simulation state found' }, { status: 404 });
    }

    return NextResponse.json({
      complete: state.complete,
      survived: state.survived,
      survival_probability: state.currentProbability,
      scenario_index: state.scenarioIndex,
      total_scenarios: SCENARIOS.length,
      history: state.history,
      passenger: state.passengerData?.name || 'Unknown'
    });
  } catch {
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
  }
}
