import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════
// HISTORICAL SCENARIO ENGINE
// ═══════════════════════════════════════════════════
const SCENARIOS = [
  {
    id: 'collision',
    time: '11:40 PM — April 14, 1912',
    title: 'The Collision',
    narrative: `A faint grinding shudder runs through the deck. The engines stop. In the silence, you hear distant shouting from the forward compartments. A crewman rushes past shouting **"Iceberg! We've struck an iceberg!"**

Some passengers are already putting on lifebelts. Others are laughing it off — *"The Titanic is unsinkable."*

**What do you do?`,
    choices: [
      { id: 'stay_cabin', text: '🛏️ Stay in your cabin and wait for official instructions', impact: -0.18 },
      { id: 'go_deck', text: '🚶 Go immediately to the boat deck with your lifebelt', impact: +0.22 },
      { id: 'investigate', text: '🔍 Try to learn more from crew or other passengers', impact: +0.05 }
    ]
  },
  {
    id: 'evacuation',
    time: '12:05 AM — 35 minutes after impact',
    title: 'Evacuation Begins',
    narrative: `The bow is visibly down. Officers are shouting **"Women and children first!"** The deck is chaotic. Some passengers still believe the ship is unsinkable.

**What do you do?`,
    choices: [
      { id: 'queue', text: '🛟 Queue calmly at the nearest lifeboat station', impact: +0.16 },
      { id: 'find_family', text: '👨‍👩‍👧 Search for family members before approaching boats', impact: -0.14 },
      { id: 'return', text: '💼 Go back inside to fetch valuables or warmer clothes', impact: -0.22 }
    ]
  },
  {
    id: 'crisis',
    time: '12:45 AM — Lifeboat Crisis',
    title: 'The Lifeboat Crisis',
    narrative: `Panic is setting in. On the **port side**, 2nd Officer Lightoller is enforcing "women and children ONLY" with a revolver. On the **starboard side**, 1st Officer Murdoch allows men if there is room.

**What do you do?`,
    choices: [
      { id: 'accept_seat', text: '🛟 Accept a lifeboat seat if offered', impact: +0.28 },
      { id: 'sacrifice', text: '⚓ Give your seat to a woman or child', impact: +0.08 },
      { id: 'sneak', text: '🧥 Hide under a tarp or disguise yourself', impact: +0.06 },
      { id: 'argue', text: '💢 Argue or try to force your way onto a boat', impact: -0.28 }
    ]
  },
  {
    id: 'plunge',
    time: '2:15 AM — The Final Plunge',
    title: 'The Ship Breaks',
    narrative: `The stern rises until it is nearly vertical. The lights blink once, then go out forever. You hear a thunderous roar as the ship's structure collapses.

**What do you do?`,
    choices: [
      { id: 'jump_swim', text: '🌊 Jump into the water and swim away from the suction', impact: +0.10 },
      { id: 'debris', text: '🪵 Leap onto a floating collapsible or wooden panel', impact: +0.26 },
      { id: 'hold_rail', text: '⚓ Hold onto the railing as the ship goes under', impact: -0.24 },
      { id: 'stay', text: '🕯️ Stay on the stern hoping for rescue', impact: -0.32 }
    ]
  }
];

// ═══════════════════════════════════════════════════
// STATE PROCESSOR
// ═══════════════════════════════════════════════════
function processDecision(state, decisionId) {
  if (state.complete) {
    return { error: 'Simulation already complete' };
  }

  const scenario = SCENARIOS[state.scenarioIndex];
  if (!scenario) {
    return { error: 'Invalid scenario index' };
  }

  const choice = scenario.choices.find(c => c.id === decisionId);
  if (!choice) {
    return { error: `Invalid decision: ${decisionId}` };
  }

  // Apply impact
  let newProb = state.currentProbability + choice.impact;

  // Sex bonus/penalty in final scenario
  if (state.scenarioIndex === 3) {
    if (state.passengerData?.sex === 'female') newProb += 0.05;
    else newProb -= 0.03;
  }

  newProb = Math.max(0.02, Math.min(0.98, newProb));
  state.currentProbability = newProb;

  state.history.push({
    scenario: scenario.id,
    choice: choice.id,
    time: scenario.time,
    impact: choice.impact,
    before: newProb - choice.impact,
    after: newProb
  });

  state.scenarioIndex += 1;

  // Final result
  if (state.scenarioIndex >= SCENARIOS.length) {
    state.complete = true;
    state.survived = state.currentProbability > 0.5;

    const survived = state.survived;
    const prob = state.currentProbability;
    state.finalNarrative = survived
      ? `## You Survived 🛟\n\nFinal probability: **${(prob * 100).toFixed(0)}%**.\n\n${prob > 0.75 ? 'Your decisions were nearly flawless.' : 'You survived by the narrowest of margins.'}\n\nAt 4:10 AM, the **RMS Carpathia** arrived. **705 survived. 1,517 did not.**`
      : `## You Perished 🌊\n\nFinal probability: **${(prob * 100).toFixed(0)}%**.\n\n${prob < 0.20 ? 'Your fate mirrored the majority of victims.' : 'You came close, but the odds were overwhelming.'}`;
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
      state: state
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
      choices: nextScenario.choices.map(c => ({ id: c.id, text: c.text }))
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
    state: state
  };
}

// ═══════════════════════════════════════════════════
// MAIN HANDLER — STATELESS (Vercel-safe)
// ═══════════════════════════════════════════════════
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      action,
      start,
      passenger_data,
      decision_id,
      state: clientState,
      initial_probability,
      current_probability
    } = body;

    // ── START SIMULATION ──
    if (action === 'start' || start === true) {
      const baseProb = typeof initial_probability === 'number' && !isNaN(initial_probability)
        ? initial_probability
        : 0.5;

      const state = {
        passengerData: passenger_data || {},
        baseProbability: baseProb,
        currentProbability: baseProb,
        scenarioIndex: 0,
        history: [],
        complete: false,
        survived: null,
        finalNarrative: null
      };

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
        state: state
      });
    }

    // ── PROCESS DECISION ──
    if (action === 'decide' || decision_id) {
      // ── FIX: Must receive state from client (Vercel has no server memory) ──
      if (!clientState) {
        return NextResponse.json(
          { error: 'Simulation state required. Please restart the simulation.' },
          { status: 400 }
        );
      }

      // Use client state directly
      const state = JSON.parse(JSON.stringify(clientState));

      // Optional: sync probability if client tracked it separately
      if (typeof current_probability === 'number' && !isNaN(current_probability)) {
        state.currentProbability = current_probability;
      }

      const result = processDecision(state, decision_id);
      if (result.error) {
        return NextResponse.json({ error: result.error, state: state }, { status: 400 });
      }

      return NextResponse.json(buildResponse(result.state, result.choice, result.scenario));
    }

    // ── STATUS CHECK ──
    if (action === 'status' && clientState) {
      return NextResponse.json({
        complete: clientState.complete,
        survived: clientState.survived,
        survival_probability: clientState.currentProbability,
        scenario_index: clientState.scenarioIndex,
        total_scenarios: SCENARIOS.length,
        history: clientState.history
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

// ── GET for polling / shareable links ──
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateParam = searchParams.get('state');
    if (!stateParam) {
      return NextResponse.json({ error: 'State required' }, { status: 400 });
    }
    const state = JSON.parse(decodeURIComponent(stateParam));
    return NextResponse.json({
      complete: state.complete,
      survived: state.survived,
      survival_probability: state.currentProbability,
      scenario_index: state.scenarioIndex,
      total_scenarios: SCENARIOS.length,
      history: state.history
    });
  } catch {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }
}
