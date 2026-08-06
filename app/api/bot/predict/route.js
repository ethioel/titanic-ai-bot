import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// ═══════════════════════════════════════════════════
// UNIFIED SURVIVAL ENGINE (syncs with interview route)
// ═══════════════════════════════════════════════════
function normalizeInput(raw) {
  // Accepts BOTH PascalCase (legacy) and camelCase (new interview)
  const get = (keys) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null) return raw[k];
    }
    return undefined;
  };

  const age = Number(get(['age', 'Age']));
  const pclass = Number(get(['pclass', 'Pclass']));
  const sex = String(get(['sex', 'Sex']) ?? '').toLowerCase().trim();
  const fare = Number(get(['fare', 'Fare']));
  const embarked = String(get(['embarked', 'Embarked']) ?? '').toUpperCase().trim();
  
  // Family: accept pre-calculated familySize OR SibSp+Parch
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

function calculateProbability(d) {
  let score = 0.38; // Historical base rate

  // Class (deck access & lifeboat proximity)
  if (d.pclass === 1) score += 0.22;
  else if (d.pclass === 2) score += 0.08;
  else score -= 0.05;

  // Sex ("Women and children first")
  if (d.sex === 'female') score += 0.32;
  else score -= 0.18;

  // Age
  if (d.age < 5) score += 0.15;
  else if (d.age < 16) score += 0.10;
  else if (d.age > 60) score -= 0.12;
  else if (d.age > 45) score -= 0.05;

  // Family
  if (d.familySize >= 1 && d.familySize <= 3) score += 0.05;
  else if (d.familySize > 4) score -= 0.10;
  else if (d.familySize === 0) score -= 0.02;

  // Fare (correlates with cabin deck)
  if (d.fare > 80) score += 0.04;
  else if (d.fare < 10) score -= 0.03;

  // Embarkation (Cherbourg had more 1st Class)
  if (d.embarked === 'C') score += 0.02;
  else if (d.embarked === 'Q') score -= 0.01;

  return Math.max(0.03, Math.min(0.97, score));
}

function getVerdict(prob) {
  if (prob >= 0.75) return { label: 'Likely Survivor', icon: '🛟', color: 'green', hex: '#22c55e' };
  if (prob >= 0.50) return { label: 'Moderate Chance', icon: '⚖️', color: 'amber', hex: '#f59e0b' };
  if (prob >= 0.30) return { label: 'Uncertain Fate', icon: '🌫️', color: 'orange', hex: '#f97316' };
  return { label: 'High Risk', icon: '🌊', color: 'red', hex: '#ef4444' };
}

// ═══════════════════════════════════════════════════
// EXPLANATION ENGINE
// ═══════════════════════════════════════════════════
function generateFactors(d, prob) {
  const factors = [];

  // Sex
  if (d.sex === 'female') {
    factors.push({
      feature: 'Gender',
      value: 'Female',
      impact: +0.32,
      direction: 'positive',
      reason: 'The "women and children first" protocol (Second Officer Lightoller\'s enforcement) gave women priority access to port-side lifeboats.'
    });
  } else {
    factors.push({
      feature: 'Gender',
      value: 'Male',
      impact: -0.18,
      direction: 'negative',
      reason: 'Adult men were systematically denied lifeboat seats. Only 20% of male passengers survived compared to 74% of females.'
    });
  }

  // Class
  const classLabels = { 1: 'First Class', 2: 'Second Class', 3: 'Third Class' };
  if (d.pclass === 1) {
    factors.push({
      feature: 'Ticket Class',
      value: classLabels[d.pclass],
      impact: +0.22,
      direction: 'positive',
      reason: '1st Class cabins were on upper decks (A–E) with direct access to the boat deck. 62% of 1st Class passengers survived.'
    });
  } else if (d.pclass === 2) {
    factors.push({
      feature: 'Ticket Class',
      value: classLabels[d.pclass],
      impact: +0.08,
      direction: 'positive',
      reason: '2nd Class passengers had moderate deck access. 47% survived — better than 3rd Class, but many men were still denied boats.'
    });
  } else {
    factors.push({
      feature: 'Ticket Class',
      value: classLabels[d.pclass],
      impact: -0.05,
      direction: 'negative',
      reason: '3rd Class was confined to lower decks (F–G) with maze-like corridors and gated stairwells. Only 24% survived.'
    });
  }

  // Age
  if (d.age < 16) {
    factors.push({
      feature: 'Age',
      value: `${d.age} years`,
      impact: d.age < 5 ? +0.15 : +0.10,
      direction: 'positive',
      reason: `Children under 16 were given lifeboat priority alongside women. ${d.age < 5 ? 'Very young children were often lifted directly into boats by crewmen.' : ''}`
    });
  } else if (d.age > 60) {
    factors.push({
      feature: 'Age',
      value: `${d.age} years`,
      impact: -0.12,
      direction: 'negative',
      reason: 'Elderly passengers faced reduced mobility navigating tilting decks, steep staircases, and the 2-hour wait in freezing conditions.'
    });
  } else if (d.age > 45) {
    factors.push({
      feature: 'Age',
      value: `${d.age} years`,
      impact: -0.05,
      direction: 'slight-negative',
      reason: 'Middle-aged adults had no priority advantage and faced the same access barriers as other adults.'
    });
  }

  // Family
  if (d.familySize >= 1 && d.familySize <= 3) {
    factors.push({
      feature: 'Family Size',
      value: `${d.familySize} members`,
      impact: +0.05,
      direction: 'positive',
      reason: 'Small families could coordinate quickly and secure adjacent lifeboat seats without causing loading delays.'
    });
  } else if (d.familySize > 4) {
    factors.push({
      feature: 'Family Size',
      value: `${d.familySize} members`,
      impact: -0.10,
      direction: 'negative',
      reason: 'Large families (like the Sages, who lost 9 members) struggled to stay together, causing fatal delays at the boats.'
    });
  } else if (d.familySize === 0) {
    factors.push({
      feature: 'Family Size',
      value: 'Alone',
      impact: -0.02,
      direction: 'slight-negative',
      reason: 'Solo travelers moved faster but lacked the social network to secure seats or share information about boat availability.'
    });
  }

  // Fare
  if (d.fare > 80) {
    factors.push({
      feature: 'Fare',
      value: `£${d.fare}`,
      impact: +0.04,
      direction: 'slight-positive',
      reason: 'Higher fares correlated with upper-deck cabins and closer proximity to lifeboat stations.'
    });
  } else if (d.fare < 10) {
    factors.push({
      feature: 'Fare',
      value: `£${d.fare}`,
      impact: -0.03,
      direction: 'slight-negative',
      reason: 'Very low fares indicated steerage accommodation deep in the ship, far from escape routes.'
    });
  }

  // Sort by absolute impact
  factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  return factors;
}

// ═══════════════════════════════════════════════════
// COUNTERFACTUAL ENGINE ("What If?")
// ═══════════════════════════════════════════════════
function generateCounterfactuals(d, baseProb) {
  const scenarios = [];

  const run = (changes, label, narrative) => {
    const alt = { ...d, ...changes };
    const altProb = calculateProbability(alt);
    const delta = altProb - baseProb;
    if (Math.abs(delta) < 0.01) return; // Skip negligible changes
    scenarios.push({
      scenario: label,
      changes,
      new_probability: altProb,
      new_verdict: getVerdict(altProb),
      delta,
      delta_pct: (delta * 100).toFixed(1),
      direction: delta > 0 ? 'increase' : 'decrease',
      narrative
    });
  };

  // 1. Gender swap
  if (d.sex === 'male') {
    run(
      { sex: 'female' },
      'If you were female',
      `As a woman, your survival probability would jump significantly. 74% of female passengers survived versus only 20% of men.`
    );
  } else {
    run(
      { sex: 'male' },
      'If you were male',
      `As a man, your odds would drop sharply. Adult men were expected to "stand back" while women and children boarded.`
    );
  }

  // 2. Class upgrade
  if (d.pclass > 1) {
    run(
      { pclass: 1, fare: Math.max(d.fare, 80) },
      'If you traveled 1st Class',
      `First Class passengers had cabins on upper decks and direct access to the boat deck. 62% survived compared to 24% in 3rd Class.`
    );
  }

  // 3. Class downgrade
  if (d.pclass < 3) {
    run(
      { pclass: 3, fare: Math.min(d.fare, 8) },
      'If you traveled 3rd Class',
      `Steerage passengers were trapped below deck by maze-like corridors and gated stairwells. Only 24% survived.`
    );
  }

  // 4. Age regression (child)
  if (d.age >= 16) {
    run(
      { age: 6 },
      'If you were a child',
      `Children under 16 were given lifeboat priority alongside women. Boys under 14 had survival rates near 50%.`
    );
  }

  // 5. Age progression (elderly)
  if (d.age < 60) {
    run(
      { age: 70 },
      'If you were elderly',
      `Passengers over 60 faced mobility challenges on tilting decks and in freezing water. Their survival rate was under 15%.`
    );
  }

  // 6. Solo vs Family
  if (d.familySize > 0) {
    run(
      { familySize: 0 },
      'If you traveled alone',
      `Solo travelers moved faster but had no one to advocate for them at the boats.`
    );
  } else {
    run(
      { familySize: 2 },
      'If you had family aboard',
      `Small families coordinated well, but large groups caused fatal delays (like the Sage family, who lost 9 members).`
    );
  }

  // Sort by absolute impact
  scenarios.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return scenarios.slice(0, 4); // Top 4 most impactful
}

// ═══════════════════════════════════════════════════
// NARRATIVE GENERATOR
// ═══════════════════════════════════════════════════
function generateNarrative(d, prob, verdict, factors) {
  const classNames = { 1: 'First', 2: 'Second', 3: 'Third' };
  let text = `## Survival Analysis: ${d.name}\n\n`;
  text += `**${verdict.icon} ${verdict.label}** — ${(prob * 100).toFixed(0)}% probability\n\n`;
  text += `As a **${d.age}-year-old ${d.sex}** in **${classNames[d.pclass]} Class**`;
  text += d.familySize > 0 ? ` with **${d.familySize} family members**` : ` traveling **alone**`;
  text += `, your profile aligns with the ${prob > 0.5 ? 'survivor' : 'victim'} demographics of April 15, 1912.\n\n`;

  // Top 2 factors
  const top = factors.slice(0, 2);
  text += `**Primary factors:**\n`;
  top.forEach(f => {
    const arrow = f.direction === 'positive' ? '▲' : '▼';
    text += `${arrow} **${f.feature}:** ${f.reason}\n`;
  });

  return text;
}

// ═══════════════════════════════════════════════════
// OPTIONAL PYTHON MODEL (serverless-safe)
// ═══════════════════════════════════════════════════
async function predictWithPython(passengerData) {
  const modelPath = path.join(process.cwd(), 'data', 'models', 'titanic_ensemble.pkl');
  if (!fs.existsSync(modelPath)) return null;

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'backend', 'predict.py');
    const pythonProcess = spawn('python', [scriptPath, JSON.stringify(passengerData)]);

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => { result += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { error += data.toString(); });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try { resolve(JSON.parse(result)); } 
        catch (e) { reject(new Error('Failed to parse Python output')); }
      } else {
        reject(new Error(error || `Python exited ${code}`));
      }
    });

    // Timeout for serverless safety
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python model timeout'));
    }, 8000);
  });
}

// ═══════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════
export async function POST(request) {
  try {
    const body = await request.json();
    const raw = body.passenger_data || body;
    const d = normalizeInput(raw);

    // ── Try Python model first, fallback gracefully ──
    let prob, source;
    try {
      const pyResult = await predictWithPython(raw);
      if (pyResult && typeof pyResult.probability === 'number') {
        prob = pyResult.probability;
        source = 'ensemble';
      } else {
        throw new Error('No Python result');
      }
    } catch {
      prob = calculateProbability(d);
      source = 'historical-engine';
    }

    const verdict = getVerdict(prob);
    const factors = generateFactors(d, prob);
    const counterfactuals = generateCounterfactuals(d, prob);
    const narrative = generateNarrative(d, prob, verdict, factors);

    return NextResponse.json({
      survived: prob > 0.5,
      probability: prob,
      confidence: Math.abs(prob - 0.5) * 2,
      verdict,
      narrative,
      factors,
      counterfactuals,
      model_used: source,
      passenger_summary: {
        name: d.name,
        age: d.age,
        sex: d.sex,
        pclass: d.pclass,
        familySize: d.familySize,
        fare: d.fare,
        embarked: d.embarked
      }
    });

  } catch (error) {
    console.error('Predict API Error:', error);
    return NextResponse.json(
      { 
        error: 'Prediction engine failure',
        message: '⚠️ The analytical engine is temporarily offline. Please try again.'
      },
      { status: 500 }
    );
  }
}
