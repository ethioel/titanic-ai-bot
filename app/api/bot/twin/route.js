import { NextResponse } from 'next/server';

const PASSENGERS = [
  { name: "John Jacob Astor IV", age: 47, sex: 'male', pclass: 1, fare: 227.5, familySize: 1, survived: false, story: "The richest man aboard. He helped his pregnant wife into Lifeboat 4, then stood back. His body was recovered days later.", significance: "Wealth could not buy survival that night." },
  { name: "Margaret 'Molly' Brown", age: 44, sex: 'female', pclass: 1, fare: 151.5, familySize: 1, survived: true, story: "A Colorado socialite who took command of Lifeboat 6, demanding the crew return to search for survivors.", significance: "Her leadership saved lives in the freezing Atlantic." },
  { name: "Benjamin Guggenheim", age: 46, sex: 'male', pclass: 1, fare: 79.2, familySize: 1, survived: false, story: "When told to put on a lifebelt, he replied: 'We are dressed in our best and are prepared to go down as gentlemen.'", significance: "One of the most famous acts of aristocratic dignity in disaster history." },
  { name: "Isidor Straus", age: 67, sex: 'male', pclass: 1, fare: 221.8, familySize: 1, survived: false, story: "Co-owner of Macy's. He refused a lifeboat seat while women remained. His wife Ida refused to leave him.", significance: "A 40-year marriage ended in mutual devotion." },
  { name: "Lady Lucile Duff Gordon", age: 48, sex: 'female', pclass: 1, fare: 39.6, familySize: 1, survived: true, story: "A famous fashion designer who escaped in Lifeboat 1 with only 12 people aboard — capacity was 40.", significance: "Her survival was controversial and heavily scrutinized at the inquiry." },
  { name: "Jack Phillips", age: 25, sex: 'male', pclass: 1, fare: 0, familySize: 0, survived: false, story: "The senior wireless operator who sent the CQD distress calls until water flooded the radio room.", significance: "His distress signals reached the Carpathia, saving 705 lives." },
  { name: "Eleanor Widener", age: 50, sex: 'female', pclass: 1, fare: 211.5, familySize: 2, survived: true, story: "Philanthropist who survived in Lifeboat 4 but lost both her husband and son.", significance: "Her grief built one of the world's greatest libraries." },
  { name: "Lawrence Beesley", age: 34, sex: 'male', pclass: 2, fare: 13.0, familySize: 0, survived: true, story: "A science teacher who jumped from the sinking ship and swam to Collapsible D.", significance: "His book became the definitive first-hand historical record." },
  { name: "Esther Hart", age: 48, sex: 'female', pclass: 2, fare: 26.25, familySize: 2, survived: true, story: "She had a premonition of disaster and slept fully clothed. She grabbed her daughter and reached the boat deck immediately.", significance: "Her intuition and quick action saved her and her daughter." },
  { name: "Charles Aldworth", age: 30, sex: 'male', pclass: 2, fare: 13.0, familySize: 0, survived: false, story: "A chauffeur traveling to America for work. Like many 2nd Class men, he was denied lifeboat access.", significance: "2nd Class men had the lowest survival rate of any group." },
  { name: "Anna Turja", age: 20, sex: 'female', pclass: 3, fare: 9.84, familySize: 0, survived: true, story: "A Finnish domestic servant who survived in Lifeboat 15. She spoke no English and did not understand what was happening.", significance: "One of the longest-living survivors; her interviews preserved 3rd Class experience." },
  { name: "Daniel Buckley", age: 21, sex: 'male', pclass: 3, fare: 7.82, familySize: 0, survived: true, story: "An Irish immigrant who hid under a tarpaulin in a lifeboat after a crewman threw a blanket over him.", significance: "Survived the Titanic only to die in the Great War six years later." },
  { name: "Millvina Dean", age: 2, sex: 'female', pclass: 3, fare: 20.25, familySize: 3, survived: true, story: "The youngest passenger aboard. She was lowered into Lifeboat 10 in a mail sack.", significance: "The final living link to the Titanic; she spent her life at maritime memorials." },
  { name: "Joseph Laroche", age: 25, sex: 'male', pclass: 2, fare: 41.6, familySize: 3, survived: false, story: "A Haitian-French engineer and the only known Black male passenger. He placed his pregnant wife and two daughters into a lifeboat.", significance: "A rare documented case of a Black passenger; his family survived due to his sacrifice." },
  { name: "Catherine McGowan", age: 42, sex: 'female', pclass: 3, fare: 7.75, familySize: 0, survived: false, story: "An Irish woman traveling to join her sister in New York. She had never been on a ship before.", significance: "Represents the thousands of hopeful immigrants whose dreams ended that night." },
  { name: "Charles Joughin", age: 33, sex: 'male', pclass: 3, fare: 0, familySize: 0, survived: true, story: "The ship's chief baker. After helping load lifeboats, he drank whiskey and treaded water for 2 hours.", significance: "The last survivor to leave the ship; alcohol may have prevented fatal hypothermia." }
];

function normalizeData(raw) {
  if (!raw || typeof raw !== 'object') raw = {};
  
  const get = (keys) => {
    for (const k of keys) if (raw[k] !== undefined && raw[k] !== null) return raw[k];
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
    familySize = (!isNaN(sibSp) ? sibSp : 0) + (!isNaN(parch) ? parch : 0);
  }

  return {
    name: String(get(['name', 'Name']) ?? 'Unknown Passenger').trim(),
    age: !isNaN(age) && age >= 0 && age <= 120 ? age : 30,
    pclass: [1, 2, 3].includes(pclass) ? pclass : 3,
    sex: sex === 'female' || sex === 'male' ? sex : 'male',
    fare: !isNaN(fare) && fare >= 0 ? fare : (pclass === 1 ? 60 : pclass === 2 ? 20 : 8),
    familySize: !isNaN(familySize) && familySize >= 0 ? familySize : 0
  };
}

function calculateSimilarity(user, hist) {
  let score = 0;
  const reasons = [];

  if (user.sex === hist.sex) {
    score += 30;
    reasons.push(hist.sex === 'female' ? 'same gender (women had priority)' : 'same gender');
  }

  if (user.pclass === hist.pclass) {
    score += 25;
    const names = { 1: '1st Class', 2: '2nd Class', 3: '3rd Class' };
    reasons.push(`same ticket class (${names[hist.pclass]})`);
  } else {
    const diff = Math.abs(user.pclass - hist.pclass);
    score += Math.max(0, 25 - diff * 12);
  }

  const ageDiff = Math.abs(user.age - hist.age);
  if (ageDiff <= 3) { score += 25; reasons.push('very similar age'); }
  else if (ageDiff <= 8) { score += 18; reasons.push('similar age'); }
  else if (ageDiff <= 15) { score += 10; }
  else if (ageDiff <= 25) { score += 4; }

  const famDiff = Math.abs(user.familySize - hist.familySize);
  if (famDiff === 0) { score += 10; reasons.push('same family size'); }
  else if (famDiff <= 1) { score += 6; }
  else if (famDiff <= 2) { score += 2; }

  const maxFare = Math.max(user.fare, hist.fare);
  const minFare = Math.min(user.fare, hist.fare);
  if (maxFare > 0) {
    const ratio = minFare / maxFare;
    score += ratio * 10;
    if (ratio > 0.7) reasons.push('similar fare bracket');
  }

  const similarity = Math.min(0.98, Math.max(0.10, score / 100));
  return { score, similarity, reasons };
}

function findMatches(user) {
  const results = PASSENGERS.map(p => {
    const { similarity, reasons } = calculateSimilarity(user, p);
    return { ...p, similarity, matchReasons: reasons };
  });
  results.sort((a, b) => b.similarity - a.similarity);
  return results;
}

function generateNarrative(user, twin, allMatches) {
  const survivedIcon = twin.survived ? '🛟' : '🌊';
  const survivedText = twin.survived ? 'survived' : 'perished';
  const classNames = { 1: 'First Class', 2: 'Second Class', 3: 'Third Class' };
  
  let text = `## ${twin.name}\n`;
  text += `${survivedIcon} **${twin.age}-year-old ${twin.sex === 'female' ? 'woman' : 'man'}** • ${classNames[twin.pclass] || 'Unknown Class'}\n`;
  text += `**Fate:** ${survivedText.toUpperCase()}\n\n`;
  text += `${twin.story}\n\n`;
  text += `**Historical Significance:** ${twin.significance}\n\n`;
  text += `**Profile Match: ${(twin.similarity * 100).toFixed(0)}%**\n`;
  
  if (twin.matchReasons && twin.matchReasons.length > 0) {
    text += `You match because: ${twin.matchReasons.join(', ')}.\n\n`;
  }

  const others = allMatches.slice(1, 4).filter(m => m.similarity > 0.25);
  if (others.length > 0) {
    text += `**Other close matches:**\n`;
    others.forEach(m => {
      text += `• ${m.name} (${m.age}y, ${classNames[m.pclass] || 'Unknown'}) — ${(m.similarity * 100).toFixed(0)}% match\n`;
    });
  }

  return text;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawData = body.passenger_data || body || {};
    const user = normalizeData(rawData);
    
    const matches = findMatches(user);
    const twin = matches[0];

    const narrative = generateNarrative(user, twin, matches);

    return NextResponse.json({
      name: twin.name,
      age: twin.age,
      sex: twin.sex,
      pclass: twin.pclass,
      fare: twin.fare,
      survived: twin.survived,
      similarity: twin.similarity,
      narrative: narrative,
      top_matches: matches.slice(0, 5).map(m => ({
        name: m.name,
        age: m.age,
        pclass: m.pclass,
        sex: m.sex,
        survived: m.survived,
        similarity: m.similarity
      }))
    });

  } catch (error) {
    console.error('Twin API Error:', error);
    return NextResponse.json(
      { error: 'Twin search failed', message: 'The historical records are temporarily unavailable.' },
      { status: 500 }
    );
  }
}
