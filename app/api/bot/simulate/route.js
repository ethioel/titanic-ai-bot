import { NextResponse } from 'next/server';

// Simulation state
const simulations = new Map();

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      passenger_data, 
      start = false, 
      decision_id = null,
      session_id = `sim_${Date.now()}`
    } = body;

    // Initialize simulation
    if (start && passenger_data) {
      const simulation = initializeSimulation(passenger_data);
      simulations.set(session_id, simulation);
      
      return NextResponse.json({
        started: true,
        ...simulation.getStatus()
      });
    }

    // Process decision
    if (decision_id) {
      const simulation = simulations.get(session_id);
      if (!simulation) {
        return NextResponse.json(
          { error: 'Simulation not found' },
          { status: 404 }
        );
      }

      const result = simulation.makeDecision(decision_id);
      return NextResponse.json(result);
    }

    // Get status
    const simulation = simulations.get(session_id);
    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(simulation.getStatus());

  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

class TitanicSimulator {
  constructor(passengerData) {
    this.passenger = passengerData;
    this.startTime = new Date(1912, 3, 14, 23, 40);
    this.currentTime = new Date(this.startTime);
    this.survivalProbability = 0.5;
    this.decisions = [];
    this.events = [];
    this.step = 0;
    this.complete = false;
    this.survived = false;
    
    this.buildTimeline();
  }

  buildTimeline() {
    this.timeline = [
      {
        id: 'impact',
        time: '11:40 PM',
        minutes: 0,
        event: 'Titanic strikes iceberg on starboard side',
        description: 'The ship has hit an iceberg! Water begins entering forward compartments.',
        choices: null
      },
      {
        id: 'response',
        time: '11:45 PM',
        minutes: 5,
        event: 'Water enters forward compartments',
        description: 'The crew is assessing damage. Passengers are beginning to notice the ship listing.',
        choices: [
          { id: 'go_upper', text: 'Head to the upper deck immediately', modifier: 0.05 },
          { id: 'stay_cabin', text: 'Go back to your cabin for belongings', modifier: -0.08 },
          { id: 'help_others', text: 'Help others in your area', modifier: 0.02 }
        ]
      },
      {
        id: 'lifeboats',
        time: '11:50 PM',
        minutes: 10,
        event: 'First lifeboats prepared',
        description: 'Lifeboats are being prepared for launch. Women and children first.',
        choices: [
          { id: 'rush_lifeboat', text: 'Rush to the lifeboat station', modifier: 0.12 },
          { id: 'help_launch', text: 'Assist with lifeboat preparation', modifier: 0.05 },
          { id: 'wait', text: 'Wait for official instructions', modifier: -0.05 }
        ]
      },
      {
        id: 'panic',
        time: '11:55 PM',
        minutes: 15,
        event: 'Panic spreads',
        description: 'The ship is listing more severely. Panic is spreading among passengers.',
        choices: [
          { id: 'stay_calm', text: 'Stay calm and follow procedures', modifier: 0.03 },
          { id: 'panic', text: 'Panic and push towards lifeboats', modifier: -0.08 },
          { id: 'help', text: 'Help others remain calm', modifier: 0.02 }
        ]
      },
      {
        id: 'launch',
        time: '12:00 AM',
        minutes: 20,
        event: 'Lifeboats launching',
        description: 'Lifeboats are being launched. Many are only half full.',
        choices: [
          { id: 'board', text: 'Board a lifeboat if possible', modifier: 0.15 },
          { id: 'stay', text: 'Stay on the ship', modifier: -0.20 },
          { id: 'help_launch', text: 'Help launch more lifeboats', modifier: 0.03 }
        ]
      },
      {
        id: 'final',
        time: '12:15 AM',
        minutes: 35,
        event: 'Final moments',
        description: 'The ship is sinking rapidly. Final decisions must be made.',
        choices: [
          { id: 'jump', text: 'Jump into the water', modifier: -0.10 },
          { id: 'stay_until_end', text: 'Stay on the ship until the end', modifier: -0.15 },
          { id: 'find_raft', text: 'Find debris to hold onto', modifier: 0.08 }
        ]
      }
    ];
  }

  getStatus() {
    const currentEvent = this.timeline[this.step] || null;
    
    return {
      active: !this.complete,
      current_time: this.currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      survival_probability: this.survivalProbability,
      decisions_made: this.decisions.length,
      events_remaining: this.timeline.length - this.step,
      next_event: currentEvent,
      complete: this.complete,
      survived: this.survived,
      decisions: this.decisions
    };
  }

  makeDecision(decisionId) {
    const currentEvent = this.timeline[this.step];
    
    if (!currentEvent || !currentEvent.choices) {
      return {
        error: 'No decision available'
      };
    }

    const choice = currentEvent.choices.find(c => c.id === decisionId);
    if (!choice) {
      return {
        error: 'Invalid decision'
      };
    }

    // Apply modifier
    this.survivalProbability = Math.max(0, Math.min(1, this.survivalProbability + choice.modifier));

    // Record decision
    this.decisions.push({
      time: currentEvent.time,
      decision: choice.text,
      modifier: choice.modifier,
      new_probability: this.survivalProbability,
      event: currentEvent.event
    });

    // Move to next event
    this.step++;
    this.currentTime = new Date(this.currentTime.getTime() + (currentEvent.minutes || 5) * 60000);

    // Check if complete
    if (this.step >= this.timeline.length) {
      this.complete = true;
      this.survived = this.survivalProbability > 0.5;
      
      return {
        complete: true,
        survived: this.survived,
        final_probability: this.survivalProbability,
        decisions: this.decisions,
        message: `The simulation is complete. ${this.survived ? '🎉 You survived!' : '💔 You did not survive.'}`,
        survival_probability: this.survivalProbability,
        current_time: this.currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        next_event: null
      };
    }

    // Return next event
    const nextEvent = this.timeline[this.step];
    
    return {
      complete: false,
      survival_probability: this.survivalProbability,
      message: `Decision recorded: ${choice.text}. Your survival probability is now ${(this.survivalProbability * 100).toFixed(0)}%.`,
      current_time: this.currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      next_event: nextEvent,
      decisions: this.decisions
    };
  }
}

function initializeSimulation(passengerData) {
  // Calculate initial survival probability based on passenger data
  let initialProb = 0.38;
  
  // Class factor
  if (passengerData.Pclass === 1) initialProb += 0.25;
  else if (passengerData.Pclass === 2) initialProb += 0.10;
  else initialProb -= 0.05;
  
  // Gender factor
  if (passengerData.Sex === 'female') initialProb += 0.30;
  else initialProb -= 0.15;
  
  // Age factor
  const age = passengerData.Age || 30;
  if (age < 12) initialProb += 0.12;
  else if (age > 60) initialProb -= 0.08;
  
  // Family factor
  const family = (passengerData.SibSp || 0) + (passengerData.Parch || 0);
  if (family >= 1 && family <= 3) initialProb += 0.06;
  else if (family > 4) initialProb -= 0.04;
  
  initialProb = Math.max(0.1, Math.min(0.9, initialProb));

  const simulation = new TitanicSimulator(passengerData);
  simulation.survivalProbability = initialProb;
  
  return simulation;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get('session_id');

  if (!session_id || !simulations.has(session_id)) {
    return NextResponse.json(
      { error: 'Simulation not found' },
      { status: 404 }
    );
  }

  const simulation = simulations.get(session_id);
  return NextResponse.json(simulation.getStatus());
}