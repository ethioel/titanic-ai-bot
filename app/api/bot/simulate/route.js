import { NextResponse } from 'next/server';
import { TitanicSimulator } from '@/lib/simulator';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, passenger_data, decision_id, state } = body;

    // ── START ──
    if (action === 'start' && passenger_data) {
      // Compute base probability from passenger data (historical accuracy)
      let baseProb = 0.38;
      if (passenger_data.Pclass === 1) baseProb += 0.25;
      else if (passenger_data.Pclass === 2) baseProb += 0.10;
      else baseProb -= 0.05;

      if (passenger_data.Sex === 'female') baseProb += 0.30;
      else baseProb -= 0.15;

      const age = passenger_data.Age || 30;
      if (age < 12) baseProb += 0.12;
      else if (age > 60) baseProb -= 0.08;

      const family = (passenger_data.SibSp || 0) + (passenger_data.Parch || 0);
      if (family >= 1 && family <= 3) baseProb += 0.06;
      else if (family > 4) baseProb -= 0.04;

      baseProb = Math.max(0.1, Math.min(0.9, baseProb));

      const { result, state: newState } = TitanicSimulator.initialize(passenger_data, baseProb);
      return NextResponse.json({ ...result, state: newState });
    }

    // ── DECIDE ──
    if (action === 'decide' && state && decision_id) {
      const { result, state: newState } = TitanicSimulator.process(state, decision_id);
      if (result.error) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json({ ...result, state: newState });
    }

    // ── STATUS ──
    if (action === 'status' && state) {
      return NextResponse.json(TitanicSimulator.getStatus(state));
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const stateParam = searchParams.get('state');
  if (!stateParam) {
    return NextResponse.json({ error: 'State required' }, { status: 400 });
  }
  try {
    const state = JSON.parse(decodeURIComponent(stateParam));
    return NextResponse.json(TitanicSimulator.getStatus(state));
  } catch {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }
}
