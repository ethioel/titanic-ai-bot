import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Sample historical passenger manifest
const HISTORICAL_PASSENGERS = [
  {
    name: 'John Jacob Astor IV',
    age: 47,
    gender: 'male',
    class: 1,
    survived: false,
    bio: 'American businessman, real estate builder, investor, inventor, writer, lieutenant colonel in the Spanish-American War.'
  },
  {
    name: 'Molly Brown',
    age: 44,
    gender: 'female',
    class: 1,
    survived: true,
    bio: 'American socialite and philanthropist who encouraged the crew of Lifeboat 6 to return to look for survivors.'
  },
  {
    name: 'Rose DeWitt Bukater',
    age: 17,
    gender: 'female',
    class: 1,
    survived: true,
    bio: 'Fictional first-class passenger known for her courage and determination during the sinking.'
  },
  {
    name: 'Thomas Andrews',
    age: 39,
    gender: 'male',
    class: 1,
    survived: false,
    bio: 'Shipbuilder and naval architect, chief designer of the Titanic.'
  },
  {
    name: 'Benjamin Guggenheim',
    age: 46,
    gender: 'male',
    class: 1,
    survived: false,
    bio: 'American businessman who famously refused a lifeboat seat, saying "We are dressed in our best and are prepared to go down as gentlemen."'
  },
  {
    name: 'Isidor Straus',
    age: 67,
    gender: 'male',
    class: 1,
    survived: false,
    bio: 'American businessman and co-owner of Macy\'s department store.'
  },
  {
    name: 'Margaret Tobin Brown',
    age: 44,
    gender: 'female',
    class: 1,
    survived: true,
    bio: 'Socialite and activist who helped organize survivors in Lifeboat 6.'
  },
  {
    name: 'Daniel Buckley',
    age: 21,
    gender: 'male',
    class: 3,
    survived: true,
    bio: 'Irish immigrant who survived by jumping into a lifeboat.'
  },
  {
    name: 'Margaret Hayes',
    age: 41,
    gender: 'female',
    class: 2,
    survived: true,
    bio: 'Second-class passenger who survived with her child.'
  },
  {
    name: 'William McMaster Murdoch',
    age: 39,
    gender: 'male',
    class: 1,
    survived: false,
    bio: 'First Officer who was on watch when the Titanic struck the iceberg.'
  },
  {
    name: 'Frederick Fleet',
    age: 24,
    gender: 'male',
    class: 1,
    survived: true,
    bio: 'Lookout who first spotted the iceberg.'
  },
  {
    name: 'Elizabeth Shutes',
    age: 40,
    gender: 'female',
    class: 1,
    survived: true,
    bio: 'Governess to the Graham family, survived in Lifeboat 3.'
  },
  {
    name: 'Madeleine Astor',
    age: 18,
    gender: 'female',
    class: 1,
    survived: true,
    bio: 'Second wife of John Jacob Astor, survived in Lifeboat 4.'
  },
  {
    name: 'John D. Long',
    age: 38,
    gender: 'male',
    class: 3,
    survived: false,
    bio: 'Third-class passenger from England.'
  },
  {
    name: 'Arthur G. Peuchen',
    age: 52,
    gender: 'male',
    class: 1,
    survived: true,
    bio: 'Canadian soldier and businessman who survived in Lifeboat 6.'
  }
];

export async function POST(request) {
  try {
    const body = await request.json();
    const passengerData = body.passenger_data || body;

    // Find matching historical passengers
    const matches = findMatches(passengerData);
    
    // Get the best match
    const bestMatch = matches[0];
    
    // Generate narrative
    const narrative = generateNarrative(passengerData, bestMatch);

    return NextResponse.json({
      twin: {
        name: bestMatch.name,
        age: bestMatch.age,
        gender: bestMatch.gender,
        class: bestMatch.class,
        survived: bestMatch.survived,
        similarity: bestMatch.similarity,
        bio: bestMatch.bio
      },
      narrative: narrative,
      top_matches: matches.slice(0, 5)
    });

  } catch (error) {
    console.error('Twin matching error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function findMatches(passengerData) {
  const matches = HISTORICAL_PASSENGERS.map(historical => {
    let score = 0;
    let details = [];

    // Class match (weight: 0.3)
    if (passengerData.Pclass === historical.class) {
      score += 0.3;
      details.push('same class');
    } else {
      const diff = Math.abs(passengerData.Pclass - historical.class);
      score += Math.max(0, 0.3 - diff * 0.1);
    }

    // Gender match (weight: 0.25)
    if (passengerData.Sex === historical.gender) {
      score += 0.25;
      details.push('same gender');
    }

    // Age match (weight: 0.2)
    const age = passengerData.Age || 30;
    const ageDiff = Math.abs(age - historical.age);
    if (ageDiff < 5) {
      score += 0.2;
      details.push('similar age');
    } else if (ageDiff < 10) {
      score += 0.1;
    }

    // Family match (weight: 0.15)
    const family = (passengerData.SibSp || 0) + (passengerData.Parch || 0);
    // Estimate historical family size based on known info
    const histFamily = estimateHistoricalFamily(historical);
    if (Math.abs(family - histFamily) < 2) {
      score += 0.15;
    }

    // Fare match (weight: 0.1)
    const fare = passengerData.Fare || 32;
    const histFare = estimateHistoricalFare(historical);
    const fareRatio = Math.min(fare, histFare) / Math.max(fare, histFare);
    score += fareRatio * 0.1;

    return {
      ...historical,
      similarity: score,
      match_details: details
    };
  });

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);
  
  return matches;
}

function estimateHistoricalFamily(historical) {
  // Rough estimate based on known historical data
  if (historical.name.includes('Astor') || historical.name.includes('Straus')) {
    return 1; // Usually traveling with spouse
  }
  if (historical.bio && historical.bio.includes('mother') || historical.bio.includes('father')) {
    return 2;
  }
  if (historical.class === 3) {
    return Math.random() * 3;
  }
  return Math.random() * 2;
}

function estimateHistoricalFare(historical) {
  const baseFares = { 1: 200, 2: 50, 3: 15 };
  const base = baseFares[historical.class] || 32;
  // Add some variation
  return base * (0.5 + Math.random() * 0.5);
}

function generateNarrative(passengerData, twin) {
  const survivedText = twin.survived ? 'survived' : 'did not survive';
  const classNames = { 1: '1st Class', 2: '2nd Class', 3: '3rd Class' };
  const className = classNames[twin.class] || 'Unknown Class';
  
  let narrative = `Your historical twin is **${twin.name}**`;

  if (twin.age) {
    narrative += `, a ${twin.age}-year-old ${twin.gender}`;
  } else {
    narrative += `, a ${twin.gender}`;
  }

  narrative += ` traveling in ${className} who ${survivedText}.`;
  narrative += `\n\nYou share ${(twin.similarity * 100).toFixed(0)}% similarity in your passenger profile.`;

  // Add details
  if (twin.match_details && twin.match_details.length > 0) {
    narrative += `\n\n**Why you match:** ${twin.match_details.join(', ')}.`;
  }

  // Add bio
  if (twin.bio) {
    narrative += `\n\n**About ${twin.name.split(' ')[0]}:** ${twin.bio}`;
  }

  // Add survival context
  if (twin.survived) {
    narrative += `\n\n${twin.name} successfully boarded a lifeboat and survived the disaster. Like them, you share qualities that contributed to survival.`;
  } else {
    narrative += `\n\n${twin.name} was among those who did not survive. Their experience highlights the challenges faced during the disaster.`;
  }

  // Add personal connection
  narrative += `\n\n**Your connection:** ${generatePersonalConnection(passengerData, twin)}`;

  return narrative;
}

function generatePersonalConnection(passengerData, twin) {
  const connections = [];
  
  if (passengerData.Sex === twin.gender) {
    if (twin.gender === 'female') {
      connections.push('Both of you are women in a time when women\'s roles were changing dramatically.');
    } else {
      connections.push('Both of you are men who faced the societal expectations of the era.');
    }
  }

  if (passengerData.Pclass === twin.class) {
    const classNames = { 1: 'privileged', 2: 'middle', 3: 'working' };
    connections.push(`You both traveled in ${classNames[twin.class]} class, sharing a similar experience of the journey.`);
  }

  if (connections.length === 0) {
    connections.push(`You and ${twin.name} share a parallel journey across time, connected through the Titanic's history.`);
  }

  return connections.join(' ');
}