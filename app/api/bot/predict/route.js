// app/api/bot/predict/route.js

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request) {
  try {
    const body = await request.json();
    const passengerData = body;

    // Validate required fields
    const required = ['Pclass', 'Sex', 'Age', 'SibSp', 'Parch', 'Fare', 'Embarked'];
    const missing = required.filter(f => passengerData[f] === undefined || passengerData[f] === null);
    
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const modelPath = path.join(process.cwd(), 'data', 'models', 'titanic_ensemble.pkl');
    const hasModel = fs.existsSync(modelPath);

    let prediction;

    if (hasModel) {
      prediction = await predictWithPython(passengerData);
    } else {
      prediction = predictFallback(passengerData);
    }

    const explanations = generateExplanations(passengerData, prediction);
    const counterfactuals = generateCounterfactuals(passengerData, prediction);

    return NextResponse.json({
      ...prediction,
      explanations,
      counterfactuals,
      model_used: hasModel ? 'ensemble' : 'fallback',
    });

  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function predictWithPython(passengerData) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'backend', 'predict.py');
    const pythonProcess = spawn('python', [scriptPath, JSON.stringify(passengerData)]);

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => { result += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { error += data.toString(); });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(result));
        } catch (e) {
          reject(new Error('Failed to parse prediction result'));
        }
      } else {
        reject(new Error(error || `Process exited with code ${code}`));
      }
    });
  });
}

function predictFallback(passengerData) {
  let prob = 0.38;
  const classRates = { 1: 0.62, 2: 0.47, 3: 0.24 };
  if (passengerData.Pclass in classRates) prob = classRates[passengerData.Pclass];

  if (passengerData.Sex === 'female') prob += 0.25;
  else prob -= 0.15;

  const age = passengerData.Age || 30;
  if (age < 12) prob += 0.12;
  else if (age > 60) prob -= 0.08;
  else if (age > 40) prob += 0.03;

  const family = (passengerData.SibSp || 0) + (passengerData.Parch || 0);
  if (family >= 1 && family <= 3) prob += 0.06;
  else if (family > 4) prob -= 0.04;

  if (passengerData.Embarked === 'C') prob += 0.03;
  else if (passengerData.Embarked === 'Q') prob -= 0.02;

  prob = Math.max(0, Math.min(1, prob));

  return {
    survived: prob > 0.5,
    probability: prob,
    confidence: Math.abs(prob - 0.5) * 2,
    feature_importance: {
      'Pclass': 0.25,
      'Sex': 0.30,
      'Age': 0.15,
      'FamilySize': 0.12,
      'Fare': 0.10,
      'Embarked': 0.08,
    },
  };
}

function generateExplanations(passengerData, prediction) {
  const factors = [];

  if (passengerData.Sex === 'female') {
    factors.push({ feature: 'Sex', impact: 0.25, description: 'Women were prioritized in lifeboat loading' });
  } else {
    factors.push({ feature: 'Sex', impact: -0.15, description: 'Men had lower priority for lifeboats' });
  }

  if (passengerData.Pclass === 1) {
    factors.push({ feature: 'Pclass', impact: 0.20, description: '1st Class passengers had best access to lifeboats' });
  } else if (passengerData.Pclass === 2) {
    factors.push({ feature: 'Pclass', impact: 0.10, description: '2nd Class passengers had moderate access' });
  } else {
    factors.push({ feature: 'Pclass', impact: -0.10, description: '3rd Class passengers had limited access' });
  }

  const age = passengerData.Age || 30;
  if (age < 12) {
    factors.push({ feature: 'Age', impact: 0.12, description: 'Children were given priority' });
  } else if (age > 60) {
    factors.push({ feature: 'Age', impact: -0.08, description: 'Elderly passengers faced challenges' });
  }

  const family = (passengerData.SibSp || 0) + (passengerData.Parch || 0);
  if (family >= 1 && family <= 3) {
    factors.push({ feature: 'FamilySize', impact: 0.06, description: 'Small families had better survival' });
  } else if (family > 4) {
    factors.push({ feature: 'FamilySize', impact: -0.04, description: 'Large families struggled to stay together' });
  }

  factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return factors.map(f => ({
    feature: f.feature,
    value: passengerData[f.feature] || 'Unknown',
    impact: f.impact,
    description: f.description,
    direction: f.impact > 0 ? 'positive' : 'negative',
  }));
}

function generateCounterfactuals(passengerData, prediction) {
  const currentProb = prediction.probability;
  const counterfactuals = [];

  if (passengerData.Pclass > 1) {
    const alt = { ...passengerData, Pclass: 1 };
    const altProb = predictFallback(alt).probability;
    counterfactuals.push({
      scenario: 'Upgrade to 1st Class',
      change: `Pclass ${passengerData.Pclass} → 1`,
      new_probability: altProb,
      improvement: altProb - currentProb,
      description: `Upgrading to 1st Class would ${altProb > currentProb ? 'increase' : 'decrease'} your survival odds by ${(Math.abs(altProb - currentProb) * 100).toFixed(1)}%`,
    });
  }

  if (passengerData.Sex === 'male') {
    const alt = { ...passengerData, Sex: 'female' };
    const altProb = predictFallback(alt).probability;
    counterfactuals.push({
      scenario: 'Gender Change',
      change: 'Male → Female',
      new_probability: altProb,
      improvement: altProb - currentProb,
      description: `Being female would ${altProb > currentProb ? 'increase' : 'decrease'} your survival odds by ${(Math.abs(altProb - currentProb) * 100).toFixed(1)}%`,
    });
  }

  if ((passengerData.Age || 30) > 30) {
    const alt = { ...passengerData, Age: 8 };
    const altProb = predictFallback(alt).probability;
    counterfactuals.push({
      scenario: 'Travel as Child',
      change: `Age ${passengerData.Age} → 8`,
      new_probability: altProb,
      improvement: altProb - currentProb,
      description: `Traveling as a child would ${altProb > currentProb ? 'increase' : 'decrease'} your survival odds by ${(Math.abs(altProb - currentProb) * 100).toFixed(1)}%`,
    });
  }

  if (passengerData.Fare < 100) {
    const alt = { ...passengerData, Fare: 200 };
    const altProb = predictFallback(alt).probability;
    counterfactuals.push({
      scenario: 'Higher Fare',
      change: `Fare £${passengerData.Fare} → £200`,
      new_probability: altProb,
      improvement: altProb - currentProb,
      description: `Paying a higher fare would ${altProb > currentProb ? 'increase' : 'decrease'} your survival odds by ${(Math.abs(altProb - currentProb) * 100).toFixed(1)}%`,
    });
  }

  counterfactuals.sort((a, b) => Math.abs(b.improvement) - Math.abs(a.improvement));
  return counterfactuals;
}
