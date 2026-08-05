import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { passenger_data, prediction } = body;

    if (!passenger_data) {
      return NextResponse.json(
        { error: 'Passenger data required' },
        { status: 400 }
      );
    }

    const currentProb = prediction?.probability || 0.5;
    const counterfactuals = generateCounterfactuals(passengerData, currentProb);

    return NextResponse.json({
      current_probability: currentProb,
      counterfactuals: counterfactuals,
      best_action: counterfactuals[0] || null
    });

  } catch (error) {
    console.error('Counterfactual error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function generateCounterfactuals(passengerData, currentProb) {
  const scenarios = [];
  const data = passengerData;

  // Scenario 1: Class upgrade
  if (data.Pclass && data.Pclass > 1) {
    const altData = { ...data, Pclass: 1 };
    const altProb = calculateProbability(altData);
    scenarios.push({
      id: 'upgrade_class',
      scenario: 'Upgrade to 1st Class',
      change: `Pclass ${data.Pclass} → 1`,
      original_value: data.Pclass,
      new_value: 1,
      current_probability: currentProb,
      new_probability: altProb,
      improvement: altProb - currentProb,
      description: `Upgrading to 1st Class would ${altProb > currentProb ? 'increase' : 'decrease'} your survival odds by ${(Math.abs(altProb - currentProb) * 100).toFixed(1)}%`,
      feasibility: 'High',
      action: 'purchase upgrade'
    });
  }

  // Scenario 2: Gender (if male)
  if (data.Sex === 'male') {
    const altData = { ...data, Sex: 'female' };
    const altProb = calculateProbability(altData);
    scenarios.push({
      id: 'change_gender',
      scenario: 'Gender Change',
      change: 'Male → Female',
      original_value: data.Sex,
      new_value: 'female',
      current_probability: currentProb,
      new_probability: altProb,
      improvement: altProb - currentProb,
      description: `Being female would ${altProb > currentProb ? 'increase' : 'decrease'} your survival odds by ${(Math.abs(altProb - currentProb) * 100).toFixed(1)}%`,
      feasibility: 'Impossible',
      action: 'n/a'
    });
  }

  // Scenario 3: Age (if adult, make child)
  const age = data.Age || 30;
  if (age > 18) {
    const altData = { ...data, Age: 8 };
    const altProb = calculateProbability(altData);
    scenarios.push({
      id: 'become_child',
      scenario: 'Travel as Child',
      change: `Age ${age} → 8`,
      original_value: age,
      new_value: 8,
      current_probability: currentProb,
      new_probability: altProb,
      improvement: altProb - currentProb,
      description: `Traveling as a child would ${altProb > currentProb ? 'increase' : 'decrease'} your survival odds by ${(Math.abs(altProb - currentProb) * 100).toFixed(1)}%`,
      feasibility: 'Low',
      action: 'n/a'
    });
  }

  // Scenario 4: Family size
  const family = (data.SibSp || 0) + (data.Parch || 0);
  if (family === 0) {
    const altData = { ...data, SibSp: 1, Parch: 1 };
    const altProb = calculateProbability(altData);
    scenarios.push({
      id: 'add_family',
      scenario: 'Travel with Family',
      change: `Alone → 2 family members`,
      original_value: 0,
      new_value: 2,
      current_probability: currentProb,
      new_probability: altProb,
      improvement: altProb - currentProb,
      description: `Traveling with family would ${altProb > currentProb ? 'increase' : 'decrease'} your survival odds by ${(Math.abs(altProb - currentProb) * 100).toFixed(1)}%`,
      feasibility: 'Medium',
      action: 'invite family'
    });
  }

  // Scenario 5: Higher fare
  const fare = data.Fare || 32;
  if (fare < 100) {
    const altData = { ...data, Fare: 200 };
    const altProb = calculateProbability(altData);
    scenarios.push({
      id: 'increase_fare',
      scenario: 'Higher Fare',
      change: `Fare £${fare} → £200`,
      original_value: fare,
      new_value: 200,
      current_probability: currentProb,
      new_probability: altProb,
      improvement: altProb - currentProb,
      description: `Paying a higher fare would ${altProb > currentProb ? 'increase' : 'decrease'} your survival odds by ${(Math.abs(altProb - currentProb) * 100).toFixed(1)}%`,
      feasibility: 'Medium',
      action: 'spend more'
    });
  }

  // Sort by improvement (best actions first)
  scenarios.sort((a, b) => b.improvement - a.improvement);

  // Add recommendations
  scenarios.forEach((s, i) => {
    const rank = i + 1;
    if (s.improvement > 0.05) {
      s.recommendation = `✅ Recommended: ${s.scenario} (${rank === 1 ? 'Best option!' : `#${rank} best option`})`;
    } else if (s.improvement < -0.05) {
      s.recommendation = `⚠️ Avoid: ${s.scenario} would decrease your odds`;
    } else {
      s.recommendation = `ℹ️ ${s.scenario} would have minimal impact`;
    }
  });

  return scenarios;
}

function calculateProbability(data) {
  let prob = 0.38;

  // Class factor
  if (data.Pclass === 1) prob += 0.25;
  else if (data.Pclass === 2) prob += 0.10;
  else prob -= 0.05;

  // Gender factor
  if (data.Sex === 'female') prob += 0.30;
  else prob -= 0.15;

  // Age factor
  const age = data.Age || 30;
  if (age < 12) prob += 0.12;
  else if (age > 60) prob -= 0.08;
  else if (age > 40) prob += 0.03;

  // Family factor
  const family = (data.SibSp || 0) + (data.Parch || 0);
  if (family >= 1 && family <= 3) prob += 0.06;
  else if (family > 4) prob -= 0.04;

  // Embarkation port
  if (data.Embarked === 'C') prob += 0.03;
  else if (data.Embarked === 'Q') prob -= 0.02;

  // Fare factor
  const fare = data.Fare || 32;
  if (fare > 200) prob += 0.05;
  else if (fare > 100) prob += 0.02;
  else if (fare < 10) prob -= 0.03;

  return Math.max(0, Math.min(1, prob));
}