import { NextResponse } from 'next/server';

// ── Session Store (swap for Redis in production) ──
const sessions = new Map();

// ═══════════════════════════════════════════════════
// SURVIVAL PREDICTION ENGINE
// ═══════════════════════════════════════════════════
function calculateProbability(data) {
  let score = 0.38;

  if (data.pclass === 1) score += 0.22;
  else if (data.pclass === 2) score += 0.08;
  else score -= 0.05;

  if (data.sex === 'female') score += 0.32;
  else score -= 0.18;

  if (data.age < 5) score += 0.15;
  else if (data.age < 16) score += 0.10;
  else if (data.age > 60) score -= 0.12;
  else if (data.age > 45) score -= 0.05;

  if (data.familySize >= 1 && data.familySize <= 3) score += 0.05;
  else if (data.familySize > 4) score -= 0.10;
  else if (data.familySize === 0) score -= 0.02;

  if (data.fare > 80) score += 0.04;
  else if (data.fare < 10) score -= 0.03;

  return Math.max(0.03, Math.min(0.97, score));
}

function getVerdict(prob) {
  if (prob >= 0.75) return { label: 'Likely Survivor', icon: '🛟', color: 'green' };
  if (prob >= 0.50) return { label: 'Moderate Chance', icon: '⚖️', color: 'amber' };
  if (prob >= 0.30) return { label: 'Uncertain Fate', icon: '🌫️', color: 'orange' };
  return { label: 'High Risk', icon: '🌊', color: 'red' };
}

// ═══════════════════════════════════════════════════
// SMART NLP EXTRACTORS
// ═══════════════════════════════════════════════════
function extractName(msg) {
  const cleaned = msg
    .trim()
    .replace(/^(hi|hello|hey|greetings|my name is|i am|call me|i'm|name[:\s]+|this is)\s+/i, '')
    .replace(/[.!,]+$/, '')
    .trim();
  return cleaned.length >= 1 && cleaned.length < 50 && !/^\d+$/.test(cleaned) ? cleaned : null;
}

function extractAge(msg) {
  const patterns = [
    /(?:age|aged|i am|i'm)\s+(\d{1,3})/i,
    /(\d{1,3})\s*(?:years?|yrs?|yo|y\.o\.)/i,
    /\b(\d{1,3})\b/
  ];
  for (const p of patterns) {
    const m = msg.match(p);
    if (m) {
      const v = parseInt(m[1], 10);
      if (v >= 0 && v <= 120) return v;
    }
  }
  return null;
}

function extractSex(msg) {
  const m = msg.toLowerCase();
  if (/\b(female|woman|girl|lady|she|miss|mrs|ms|♀|f)\b/.test(m)) return 'female';
  if (/\b(male|man|boy|gentleman|he|mr|sir|♂|m)\b/.test(m)) return 'male';
  return null;
}

function extractClass(msg) {
  const m = msg.toLowerCase();
  if (/\b(first|1st|suite|luxury|premium)\b/.test(m) || msg === '1') return 1;
  if (/\b(second|2nd|standard)\b/.test(m) || msg === '2') return 2;
  if (/\b(third|3rd|steerage|economy)\b/.test(m) || msg === '3') return 3;
  const n = msg.match(/\b([123])\b/);
  if (n) return parseInt(n[1]);
  return null;
}

function extractEmbarked(msg) {
  const m = msg.toLowerCase();
  if (/\b(southampton|south)\b/.test(m) || msg.toUpperCase() === 'S') return 'S';
  if (/\b(cherbourg)\b/.test(m) || msg.toUpperCase() === 'C') return 'C';
  if (/\b(queenstown|queens|cobh)\b/.test(m) || msg.toUpperCase() === 'Q') return 'Q';
  const c = msg.match(/\b([sqc])\b/i);
  if (c) return c[1].toUpperCase();
  return null;
}

function extractFamily(msg) {
  const m = msg.toLowerCase();
  if (/\b(alone|by myself|nobody|no one|zero|0)\b/.test(m)) {
    return { sibSp: 0, parch: 0, familySize: 0 };
  }
  const nums = msg.match(/\d+/g);
  if (nums && nums.length >= 2) {
    return {
      sibSp: parseInt(nums[0]),
      parch: parseInt(nums[1]),
      familySize: parseInt(nums[0]) + parseInt(nums[1])
    };
  }
  if (nums && nums.length === 1) {
    return { sibSp: parseInt(nums[0]), parch: 0, familySize: parseInt(nums[0]) };
  }
  return null;
}

function extractFare(msg) {
  const match = msg.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const v = parseFloat(match[1]);
    if (v >= 0 && v <= 1000) return v;
  }
  return null;
}

// ═══════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════
export async function POST(request) {
  try {
    const body = await request.json();
    const { session_id, message, passenger_data: clientData } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // ── Get or init session ──
    let session = sessions.get(session_id);
    if (!session) {
      session = { step: 'welcome', data: {}, history: [] };
      
      // If client sends recovered data, fast-forward
      if (clientData && typeof clientData === 'object') {
        const recovered = normalizeClientData(clientData);
        if (recovered.name) {
          session.data = recovered;
          session.step = determineStep(recovered);
        }
      }
      
      sessions.set(session_id, session);
    }

    const input = String(message || '').trim();
    const data = session.data;
    let response = {};

    // ── Global Reset ──
    if (/^(reset|restart|start over|new|begin again)$/i.test(input)) {
      session.step = 'welcome';
      session.data = {};
      session.history = [];
      return NextResponse.json({
        message: 'Session reset. **Welcome aboard the RMS Titanic.** Please tell me your name.',
        step: 'welcome',
        passenger_data: {},
        actions: []
      });
    }

    // ═══════════════════════════════════════════════
    // STATE MACHINE — server owns the step
    // ═══════════════════════════════════════════════
    switch (session.step) {
      
      // ── WELCOME: first message is treated as name ──
      case 'welcome': {
        const name = extractName(input);
        if (name) {
          data.name = name;
          session.step = 'gender';
          response = {
            message: `Welcome aboard, **${name}**! Please state your gender.`,
            step: 'gender',
            passenger_data: data,
            actions: [
              { id: 'sex_male', text: '♂️ Male' },
              { id: 'sex_female', text: '♀️ Female' }
            ]
          };
        } else {
          session.step = 'name';
          response = {
            message: "I didn't catch that. Please tell me your name for the passenger manifest.",
            step: 'name',
            passenger_data: data,
            actions: []
          };
        }
        break;
      }

      // ── NAME: only reached if welcome failed to extract ──
      case 'name': {
        const name = extractName(input);
        if (!name) {
          response = {
            message: 'Please provide a valid name (letters only, max 50 characters).',
            step: 'name',
            passenger_data: data,
            actions: []
          };
        } else {
          data.name = name;
          session.step = 'gender';
          response = {
            message: `Thank you, **${name}**. Please state your gender.`,
            step: 'gender',
            passenger_data: data,
            actions: [
              { id: 'sex_male', text: '♂️ Male' },
              { id: 'sex_female', text: '♀️ Female' }
            ]
          };
        }
        break;
      }

      // ── GENDER ──
      case 'gender': {
        const sex = extractSex(input);
        if (!sex) {
          response = {
            message: "I didn't catch that. Please specify **Male** or **Female**.",
            step: 'gender',
            passenger_data: data,
            actions: [
              { id: 'sex_male', text: '♂️ Male' },
              { id: 'sex_female', text: '♀️ Female' }
            ]
          };
        } else {
          data.sex = sex;
          session.step = 'age';
          response = {
            message: `Gender recorded. How old are you?\n\nValid range: **0–120 years**.`,
            step: 'age',
            passenger_data: data,
            actions: []
          };
        }
        break;
      }

      // ── AGE ──
      case 'age': {
        const age = extractAge(input);
        if (age === null) {
          response = {
            message: '⚠️ **Invalid age.** Please enter a numeric age between **0 and 120**.',
            step: 'age',
            passenger_data: data,
            actions: []
          };
        } else {
          data.age = age;
          session.step = 'class';
          response = {
            message: `Age **${age}** recorded. Which passenger class is your ticket?`,
            step: 'class',
            passenger_data: data,
            actions: [
              { id: 'class_1', text: '🥇 First Class' },
              { id: 'class_2', text: '🥈 Second Class' },
              { id: 'class_3', text: '🥉 Third Class' }
            ]
          };
        }
        break;
      }

      // ── CLASS ──
      case 'class': {
        const pclass = extractClass(input);
        if (!pclass) {
          response = {
            message: 'Please specify a valid class: **First (1)**, **Second (2)**, or **Third (3)**.',
            step: 'class',
            passenger_data: data,
            actions: [
              { id: 'class_1', text: '🥇 First Class' },
              { id: 'class_2', text: '🥈 Second Class' },
              { id: 'class_3', text: '🥉 Third Class' }
            ]
          };
        } else {
          data.pclass = pclass;
          session.step = 'embarked';
          const names = { 1: '1st Class', 2: '2nd Class', 3: '3rd Class' };
          response = {
            message: `${names[pclass]}. Which port did you embark from?\n\n**S** — Southampton\n**C** — Cherbourg\n**Q** — Queenstown`,
            step: 'embarked',
            passenger_data: data,
            actions: [
              { id: 'embark_S', text: 'S — Southampton' },
              { id: 'embark_C', text: 'C — Cherbourg' },
              { id: 'embark_Q', text: 'Q — Queenstown' }
            ]
          };
        }
        break;
      }

      // ── EMBARKED ──
      case 'embarked': {
        const embarked = extractEmbarked(input);
        if (!embarked) {
          response = {
            message: 'Please enter **S** (Southampton), **C** (Cherbourg), or **Q** (Queenstown).',
            step: 'embarked',
            passenger_data: data,
            actions: [
              { id: 'embark_S', text: 'S — Southampton' },
              { id: 'embark_C', text: 'C — Cherbourg' },
              { id: 'embark_Q', text: 'Q — Queenstown' }
            ]
          };
        } else {
          data.embarked = embarked;
          session.step = 'family';
          const ports = { S: 'Southampton', C: 'Cherbourg', Q: 'Queenstown' };
          response = {
            message: `Embarked from **${ports[embarked]}**. How many family members are traveling with you?\n\nEnter two numbers (siblings/spouses, parents/children) e.g. **"1 2"**, or say **"alone"**.`,
            step: 'family',
            passenger_data: data,
            actions: [
              { id: 'fam_0', text: '0 — Traveling alone' },
              { id: 'fam_1', text: '1 family member' },
              { id: 'fam_2', text: '2 family members' },
              { id: 'fam_3', text: '3+ family members' }
            ]
          };
        }
        break;
      }

      // ── FAMILY ──
      case 'family': {
        const fam = extractFamily(input);
        if (!fam) {
          response = {
            message: 'Please enter valid family numbers (e.g. **1 0**) or say **alone**.',
            step: 'family',
            passenger_data: data,
            actions: [
              { id: 'fam_0', text: '0 — Traveling alone' },
              { id: 'fam_1', text: '1 family member' },
              { id: 'fam_2', text: '2 family members' },
              { id: 'fam_3', text: '3+ family members' }
            ]
          };
        } else {
          Object.assign(data, fam);
          session.step = 'fare';
          response = {
            message:
              fam.familySize === 0
                ? `Traveling alone. Final question: What was your ticket fare in **pounds (£)**?\n\nTypical: £3–£30 (Third), £10–£60 (Second), £30+ (First).`
                : `Family of **${fam.familySize}** recorded. Final question: What was your ticket fare in **pounds (£)**?`,
            step: 'fare',
            passenger_data: data,
            actions: []
          };
        }
        break;
      }

      // ── FARE ──
      case 'fare': {
        let fare = extractFare(input);
        if (fare === null) {
          fare = data.pclass === 1 ? 60 : data.pclass === 2 ? 20 : 8;
        }
        data.fare = fare;
        session.step = 'complete';

        const prob = calculateProbability(data);
        const verdict = getVerdict(prob);

        response = {
          message: `## Survival Analysis Complete\n\n**Passenger:** ${data.name}\n**Profile:** ${data.age} years, ${data.sex}, Class ${data.pclass}, ${data.familySize === 0 ? 'alone' : data.familySize + ' family members'}\n\n**Base Survival Probability: ${(prob * 100).toFixed(0)}%** ${verdict.icon} *${verdict.label}*\n\nYour profile has been analyzed against 1912 historical data. What would you like to do?`,
          step: 'complete',
          passenger_data: data,
          prediction: { probability: prob, verdict },
          actions: [
            { id: 'show_twin', text: '🔍 Find Historical Twin' },
            { id: 'start_simulation', text: '🚨 Run Survival Simulation' },
            { id: 'reset', text: '🔄 Start Over' }
          ]
        };
        break;
      }

      // ── COMPLETE / ACTION MENU ──
      case 'complete': {
        const low = input.toLowerCase();
        const prob = calculateProbability(data);
        const verdict = getVerdict(prob);

        if (low.match(/twin|historical|match/)) {
          response = {
            message: '🔍 Searching the passenger manifest archives for your historical twin...',
            step: 'complete',
            passenger_data: data,
            prediction: { probability: prob, verdict },
            action: 'show_twin'
          };
        } else if (low.match(/simulat|emergency|scenario|run/)) {
          response = {
            message: '🚨 **Emergency Simulation Initializing...**',
            step: 'complete',
            passenger_data: data,
            prediction: { probability: prob, verdict },
            action: 'start_simulation'
          };
        } else if (low.match(/predict|chance|probability|analysis/)) {
          response = {
            message: `📊 **${data.name}**, your survival probability is **${(prob * 100).toFixed(0)}%**.\n\n${verdict.icon} **${verdict.label}**`,
            step: 'complete',
            passenger_data: data,
            prediction: { probability: prob, verdict },
            actions: [
              { id: 'show_twin', text: '🔍 Find Historical Twin' },
              { id: 'start_simulation', text: '🚨 Run Survival Simulation' },
              { id: 'reset', text: '🔄 Start Over' }
            ]
          };
        } else {
          response = {
            message: 'Please choose an action below, or type **reset** to start over.',
            step: 'complete',
            passenger_data: data,
            prediction: { probability: prob, verdict },
            actions: [
              { id: 'show_twin', text: '🔍 Find Historical Twin' },
              { id: 'start_simulation', text: '🚨 Run Survival Simulation' },
              { id: 'reset', text: '🔄 Start Over' }
            ]
          };
        }
        break;
      }

      // ── Fallback ──
      default: {
        session.step = 'welcome';
        response = {
          message: "Let's start over. **Welcome aboard!** Please tell me your name.",
          step: 'welcome',
          passenger_data: data,
          actions: []
        };
      }
    }

    // ── Persist session ──
    session.history.push({ role: 'user', content: input, time: Date.now() });
    session.history.push({ role: 'bot', content: response.message, time: Date.now() });
    sessions.set(session_id, session);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Interview API Error:', error);
    return NextResponse.json(
      { error: 'Engine failure', message: '⚠️ The bridge is experiencing technical difficulties. Please try again.' },
      { status: 500 }
    );
  }
}

// ── Helpers ──
function normalizeClientData(raw) {
  const get = (keys) => {
    for (const k of keys) if (raw?.[k] !== undefined && raw?.[k] !== null) return raw[k];
    return undefined;
  };
  
  const age = Number(get(['age', 'Age']));
  const pclass = Number(get(['pclass', 'Pclass']));
  const sex = String(get(['sex', 'Sex']) ?? '').toLowerCase().trim();
  const fare = Number(get(['fare', 'Fare']));
  
  let familySize = Number(get(['familySize', 'family_size', 'FamilySize']));
  if (isNaN(familySize)) {
    const sibSp = Number(get(['sibSp', 'SibSp']) ?? 0);
    const parch = Number(get(['parch', 'Parch']) ?? 0);
    familySize = sibSp + parch;
  }

  return {
    name: String(get(['name', 'Name']) ?? '').trim(),
    age: !isNaN(age) && age >= 0 && age <= 120 ? age : undefined,
    pclass: [1, 2, 3].includes(pclass) ? pclass : undefined,
    sex: sex === 'female' || sex === 'male' ? sex : undefined,
    fare: !isNaN(fare) && fare >= 0 ? fare : undefined,
    familySize: !isNaN(familySize) && familySize >= 0 ? familySize : undefined,
    embarked: String(get(['embarked', 'Embarked']) ?? '').toUpperCase().trim() || undefined
  };
}

function determineStep(data) {
  if (!data.name) return 'welcome';
  if (!data.sex) return 'gender';
  if (!data.age) return 'age';
  if (!data.pclass) return 'class';
  if (!data.embarked) return 'embarked';
  if (!data.familySize) return 'family';
  if (!data.fare) return 'fare';
  return 'complete';
}
