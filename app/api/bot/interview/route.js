import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Interview state management
const sessions = new Map();

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      session_id, 
      message, 
      step = 'welcome', 
      passenger_data = {} 
    } = body;

    // Initialize session if new
    if (!sessions.has(session_id)) {
      sessions.set(session_id, {
        step: 'welcome',
        passenger_data: {},
        history: [],
        created: new Date()
      });
    }

    const session = sessions.get(session_id);
    session.history.push({ role: 'user', content: message, timestamp: new Date() });

    // Process interview flow
    let response = await processInterview(message, step, passenger_data, session);

    // Update session
    session.step = response.step || step;
    session.passenger_data = response.passenger_data || passenger_data;
    session.history.push({ role: 'assistant', content: response.message, timestamp: new Date() });
    sessions.set(session_id, session);

    return NextResponse.json({
      message: response.message,
      step: response.step,
      passenger_data: response.passenger_data,
      actions: response.actions || [],
      prediction: response.prediction || null,
      twin: response.twin || null,
      action: response.action || null
    });

  } catch (error) {
    console.error('Interview error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function processInterview(message, step, passengerData, session) {
  // Extract passenger info from message
  const extracted = extractPassengerInfo(message, passengerData);

  switch (step) {
    case 'welcome':
      return handleWelcome(message, passengerData);
    
    case 'name':
      return handleName(message, passengerData);
    
    case 'gender':
      return handleGender(message, passengerData);
    
    case 'age':
      return handleAge(message, passengerData);
    
    case 'class':
      return handleClass(message, passengerData);
    
    case 'embarked':
      return handleEmbarked(message, passengerData);
    
    case 'family':
      return handleFamily(message, passengerData);
    
    case 'fare':
      return handleFare(message, passengerData);
    
    case 'complete':
      return handleComplete(message, passengerData, session);
    
    default:
      return {
        message: "I'm not sure I understand. Let's continue with your passenger registration.",
        step: 'name'
      };
  }
}

function extractPassengerInfo(message, currentData) {
  const data = { ...currentData };
  
  // Extract name
  const nameMatch = message.match(/my name is ([a-zA-Z\s]+)/i) || 
                    message.match(/i am ([a-zA-Z\s]+)/i);
  if (nameMatch && !data.name) {
    data.name = nameMatch[1].trim();
  }

  // Extract gender
  if (message.match(/male|man|gentleman|mister|mr/i)) {
    data.Sex = 'male';
  } else if (message.match(/female|woman|lady|miss|mrs/i)) {
    data.Sex = 'female';
  }

  // Extract age
  const ageMatch = message.match(/(\d+)\s*(?:years?|yrs?|yo)/i);
  if (ageMatch) {
    data.Age = parseInt(ageMatch[1]);
  }

  // Extract class
  if (message.match(/first|1st|1 class|suite|luxury|premium/i)) {
    data.Pclass = 1;
  } else if (message.match(/second|2nd|2 class|standard/i)) {
    data.Pclass = 2;
  } else if (message.match(/third|3rd|3 class|steerage|economy/i)) {
    data.Pclass = 3;
  }

  // Extract embarked
  if (message.match(/southampton|south|s\b/i)) {
    data.Embarked = 'S';
  } else if (message.match(/cherbourg|c\b/i)) {
    data.Embarked = 'C';
  } else if (message.match(/queenstown|q\b/i)) {
    data.Embarked = 'Q';
  }

  return data;
}

function handleWelcome(message, passengerData) {
  return {
    message: `Welcome aboard, traveler! I'm your historical guide for this journey.

I'll help you create your passenger profile, then analyze your survival chances, find your historical twin, and run a real-time emergency simulation.

Let's start with some basic questions. What is your name?`,
    step: 'name',
    passenger_data: passengerData
  };
}

function handleName(message, passengerData) {
  const name = message.trim();
  if (name.toLowerCase() === 'skip') {
    passengerData.name = 'Anonymous Passenger';
  } else {
    passengerData.name = name;
  }

  return {
    message: `Nice to meet you, ${passengerData.name}! 

Next question: Are you male or female?`,
    step: 'gender',
    passenger_data: passengerData
  };
}

function handleGender(message, passengerData) {
  const data = extractPassengerInfo(message, passengerData);
  
  if (!data.Sex) {
    return {
      message: "I didn't catch that. Are you male or female?",
      step: 'gender',
      passenger_data: passengerData
    };
  }

  const genderDisplay = data.Sex === 'male' ? 'male' : 'female';
  return {
    message: `Thank you. You're a ${genderDisplay} passenger.

How old are you?`,
    step: 'age',
    passenger_data: { ...passengerData, ...data }
  };
}

function handleAge(message, passengerData) {
  const data = extractPassengerInfo(message, passengerData);
  
  if (!data.Age || data.Age < 0 || data.Age > 120) {
    return {
      message: "Please enter a valid age (0-120).",
      step: 'age',
      passenger_data: passengerData
    };
  }

  return {
    message: `Age ${data.Age}. Understood.

Which ticket class are you traveling in?
- 1st Class (Luxury)
- 2nd Class (Standard)
- 3rd Class (Economy)`,
    step: 'class',
    passenger_data: { ...passengerData, ...data }
  };
}

function handleClass(message, passengerData) {
  const data = extractPassengerInfo(message, passengerData);
  
  if (!data.Pclass) {
    return {
      message: "Please select a class: 1st, 2nd, or 3rd.",
      step: 'class',
      passenger_data: passengerData
    };
  }

  const classNames = { 1: '1st Class', 2: '2nd Class', 3: '3rd Class' };
  
  return {
    message: `${classNames[data.Pclass]}. Excellent.

Which port did you embark from?
- S (Southampton)
- C (Cherbourg)
- Q (Queenstown)`,
    step: 'embarked',
    passenger_data: { ...passengerData, ...data }
  };
}

function handleEmbarked(message, passengerData) {
  const data = extractPassengerInfo(message, passengerData);
  
  if (!data.Embarked) {
    return {
      message: "Please enter S, C, or Q for your embarkation port.",
      step: 'embarked',
      passenger_data: passengerData
    };
  }

  const portNames = { S: 'Southampton', C: 'Cherbourg', Q: 'Queenstown' };

  return {
    message: `You embarked from ${portNames[data.Embarked]}.

How many family members are traveling with you?
- Siblings/Spouses: 0-10
- Parents/Children: 0-10`,
    step: 'family',
    passenger_data: { ...passengerData, ...data }
  };
}

function handleFamily(message, passengerData) {
  // Extract family numbers
  const numbers = message.match(/\d+/g);
  let sibsp = 0;
  let parch = 0;

  if (numbers && numbers.length >= 2) {
    sibsp = parseInt(numbers[0]);
    parch = parseInt(numbers[1]);
  } else if (numbers && numbers.length === 1) {
    sibsp = parseInt(numbers[0]);
  }

  // Also try to parse from text
  if (message.match(/no family|alone|by myself/i)) {
    sibsp = 0;
    parch = 0;
  }

  const data = { ...passengerData, SibSp: sibsp, Parch: parch };

  return {
    message: `Family: ${sibsp} siblings/spouses, ${parch} parents/children.

Finally, what was your ticket fare? (in pounds)`,
    step: 'fare',
    passenger_data: data
  };
}

function handleFare(message, passengerData) {
  const fareMatch = message.match(/(\d+(?:\.\d+)?)/);
  let fare = 32;

  if (fareMatch) {
    fare = parseFloat(fareMatch[1]);
  }

  const data = { ...passengerData, Fare: fare };

  // Complete profile
  return {
    message: `✅ Profile complete! Thank you, ${data.name || 'passenger'}.

Here's your passenger summary:
- Name: ${data.name || 'Anonymous'}
- Gender: ${data.Sex}
- Age: ${data.Age}
- Class: ${['', '1st', '2nd', '3rd'][data.Pclass]}
- Embarked: ${data.Embarked}
- Family: ${data.SibSp + data.Parch} members
- Fare: £${data.Fare}

Would you like me to:
1. 🔮 Predict your survival chances
2. 👥 Find your historical twin
3. 🚨 Start emergency simulation
4. 🔄 All of the above`,
    step: 'complete',
    passenger_data: data,
    actions: [
      { id: 'predict', text: '🔮 Predict Survival' },
      { id: 'twin', text: '👥 Find Historical Twin' },
      { id: 'simulate', text: '🚨 Start Simulation' },
      { id: 'all', text: '🔄 Do Everything' }
    ]
  };
}

async function handleComplete(message, passengerData, session) {
  const action = message.toLowerCase();
  
  // Check for action keywords
  if (action.includes('predict') || action.includes('chance') || action.includes('survival')) {
    // Trigger prediction
    const prediction = await getPrediction(passengerData);
    return {
      message: generatePredictionMessage(prediction, passengerData),
      step: 'complete',
      passenger_data: passengerData,
      prediction: prediction,
      action: 'show_prediction'
    };
  }

  if (action.includes('twin') || action.includes('historical') || action.includes('match')) {
    const twin = await getHistoricalTwin(passengerData);
    return {
      message: "I've found your historical twin!",
      step: 'complete',
      passenger_data: passengerData,
      twin: twin,
      action: 'show_twin'
    };
  }

  if (action.includes('simulate') || action.includes('emergency') || action.includes('sim')) {
    return {
      message: "🚨 Starting emergency simulation...",
      step: 'complete',
      passenger_data: passengerData,
      action: 'start_simulation'
    };
  }

  if (action.includes('all') || action.includes('everything')) {
    return {
      message: "🔄 Running full analysis...",
      step: 'complete',
      passenger_data: passengerData,
      action: 'do_everything'
    };
  }

  return {
    message: "What would you like to do? Choose from: Predict, Twin, Simulate, or All.",
    step: 'complete',
    passenger_data: passengerData
  };
}

// Helper functions (simplified versions)
async function getPrediction(passengerData) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bot/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passengerData)
    });
    return await response.json();
  } catch {
    // Fallback prediction
    const prob = calculateFallbackProbability(passengerData);
    return {
      survived: prob > 0.5,
      probability: prob,
      confidence: Math.abs(prob - 0.5) * 2
    };
  }
}

function calculateFallbackProbability(data) {
  let prob = 0.38; // Base survival rate
  
  // Class factor
  if (data.Pclass === 1) prob += 0.25;
  else if (data.Pclass === 2) prob += 0.1;
  else prob -= 0.05;
  
  // Gender factor
  if (data.Sex === 'female') prob += 0.3;
  else prob -= 0.2;
  
  // Age factor
  if (data.Age < 12) prob += 0.15;
  else if (data.Age < 30) prob += 0.05;
  else if (data.Age > 60) prob -= 0.1;
  
  // Family factor
  const family = (data.SibSp || 0) + (data.Parch || 0);
  if (family >= 1 && family <= 3) prob += 0.05;
  else if (family > 4) prob -= 0.05;
  
  return Math.max(0, Math.min(1, prob));
}

async function getHistoricalTwin(passengerData) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bot/twin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passengerData)
    });
    return await response.json();
  } catch {
    return { 
      name: 'Rose DeWitt Bukater', 
      similarity: 0.72,
      survived: true,
      narrative: "Your historical twin is Rose DeWitt Bukater, a 17-year-old 1st Class passenger who survived the sinking. Like you, she was traveling in luxury with her family. She was known for her courage and determination."
    };
  }
}

function generatePredictionMessage(prediction, data) {
  const prob = prediction.probability;
  const survived = prediction.survived;
  
  let message = `📊 **Survival Prediction**
  
Based on your passenger profile, your survival probability is **${(prob * 100).toFixed(1)}%**.

`;

  if (survived) {
    message += `✅ **You would likely survive!** Your profile matches survivors who had better access to lifeboats.`;
  } else {
    message += `❌ **You would likely not survive.** Your profile matches passengers who had limited access to lifeboats.`;
  }

  // Add specific factors
  const factors = [];
  if (data.Sex === 'female') factors.push('women were prioritized');
  if (data.Pclass === 1 || data.Pclass === 2) factors.push('higher class had better access');
  if ((data.SibSp || 0) + (data.Parch || 0) <= 3) factors.push('small families had better survival');

  if (factors.length > 0) {
    message += `\n\nKey factors: ${factors.join(', ')}.`;
  }

  return message;
}