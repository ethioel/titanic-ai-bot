import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Dynamic import for canvas (to avoid build failures if not installed)
let canvasLoaded = false;
let createCanvas, loadImage;

async function loadCanvas() {
  if (canvasLoaded) return true;
  try {
    const canvasModule = await import('canvas');
    createCanvas = canvasModule.createCanvas;
    loadImage = canvasModule.loadImage;
    canvasLoaded = true;
    return true;
  } catch (e) {
    console.warn('Canvas module not available:', e.message);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      passenger_name = 'Anonymous',
      survival_probability = 0.5,
      survived = false,
      passenger_class = 3,
      sex = 'male',
      age = 30,
      twin_name = null,
      timestamp = new Date().toISOString()
    } = body;

    // Check if canvas is available
    const canvasReady = await loadCanvas();
    if (!canvasReady || !createCanvas) {
      // Fallback: return share data without image
      const shareId = generateShareId();
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/share/${shareId}`;
      
      return NextResponse.json({
        share_id: shareId,
        share_url: shareUrl,
        image: null,
        message: 'Image generation not available (canvas module missing)',
        data: {
          passenger_name,
          survival_probability,
          survived,
          passenger_class,
          sex,
          age,
          twin_name,
          timestamp
        }
      });
    }

    // Generate shareable card image
    const imageBuffer = await generateShareCard({
      passenger_name,
      survival_probability,
      survived,
      passenger_class,
      sex,
      age,
      twin_name,
      timestamp
    }, createCanvas, loadImage);

    // Generate shareable link
    const shareId = generateShareId();
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/share/${shareId}`;

    // In production, store share data (use Redis/PostgreSQL)
    // For now, we'll just return the image as base64 and the share link.

    return NextResponse.json({
      share_id: shareId,
      share_url: shareUrl,
      image: imageBuffer.toString('base64'),
      og_tags: generateOpenGraphTags({
        passenger_name,
        survival_probability,
        survived,
        passenger_class,
        sex,
        age,
        twin_name,
        timestamp
      }),
      data: {
        passenger_name,
        survival_probability,
        survived,
        passenger_class,
        sex,
        age,
        twin_name,
        timestamp
      }
    });

  } catch (error) {
    console.error('Share generation error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function generateShareCard(data, createCanvasFn, loadImageFn) {
  const width = 1200;
  const height = 630;
  const canvas = createCanvasFn(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a3a5c');
  gradient.addColorStop(0.5, '#0d1b2a');
  gradient.addColorStop(1, '#1a3a5c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative border
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Gold accent lines
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(width - 40, 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(40, height - 40);
  ctx.lineTo(width - 40, height - 40);
  ctx.stroke();

  // Header
  ctx.fillStyle = '#c9a84c';
  ctx.font = 'bold 56px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('TITANIC', width / 2, 100);
  
  ctx.fillStyle = '#f5f0e8';
  ctx.font = '28px "Georgia", serif';
  ctx.fillText('Survival Prediction', width / 2, 145);

  // Passenger name
  ctx.fillStyle = '#ffffff';
  ctx.font = '36px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText(data.passenger_name, width / 2, 220);

  // Survival result
  const survivalText = data.survived ? 'SURVIVED' : 'DID NOT SURVIVE';
  const survivalColor = data.survived ? '#22c55e' : '#ef4444';
  
  ctx.fillStyle = survivalColor;
  ctx.font = 'bold 48px "Georgia", serif';
  ctx.fillText(survivalText, width / 2, 300);

  // Probability bar background
  const barX = 200;
  const barY = 340;
  const barWidth = 800;
  const barHeight = 30;
  
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Probability bar fill
  const probWidth = barWidth * data.survival_probability;
  const probGradient = ctx.createLinearGradient(barX, 0, barX + probWidth, 0);
  if (data.survival_probability > 0.5) {
    probGradient.addColorStop(0, '#22c55e');
    probGradient.addColorStop(1, '#16a34a');
  } else {
    probGradient.addColorStop(0, '#ef4444');
    probGradient.addColorStop(1, '#dc2626');
  }
  ctx.fillStyle = probGradient;
  ctx.fillRect(barX, barY, probWidth, barHeight);

  // Probability label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${(data.survival_probability * 100).toFixed(1)}%`, 
    width / 2, 
    barY + barHeight + 40
  );

  // Passenger details
  const classNames = {1: '1st', 2: '2nd', 3: '3rd'};
  const details = [
    `Class: ${classNames[data.passenger_class] || data.passenger_class}`,
    `Gender: ${data.sex.charAt(0).toUpperCase() + data.sex.slice(1)}`,
    `Age: ${data.age}`
  ];

  ctx.fillStyle = '#f5f0e8';
  ctx.font = '20px "Georgia", serif';
  ctx.textAlign = 'left';
  details.forEach((detail, i) => {
    ctx.fillText(detail, 80, 440 + i * 35);
  });

  // Twin name if available
  if (data.twin_name) {
    ctx.fillStyle = '#c9a84c';
    ctx.font = '18px "Georgia", serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Historical Twin: ${data.twin_name}`, width - 80, 475);
  }

  // Timestamp
  const date = new Date(data.timestamp);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '14px "Georgia", serif';
  ctx.textAlign = 'right';
  ctx.fillText(
    date.toLocaleDateString() + ' ' + date.toLocaleTimeString(),
    width - 40,
    height - 60
  );

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '16px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('titanic-ai-bot.vercel.app', width / 2, height - 60);

  return canvas.toBuffer('image/png');
}

function generateShareId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateOpenGraphTags(data) {
  const title = data.survived 
    ? `${data.passenger_name} survived the Titanic!` 
    : `${data.passenger_name} did not survive the Titanic.`;
  
  const description = `Survival probability: ${(data.survival_probability * 100).toFixed(1)}% | ${data.twin_name ? `Historical twin: ${data.twin_name}` : 'Check your survival odds'}`;
  
  return {
    title,
    description,
    image: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/api/share/image/${generateShareId()}`,
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/share/${generateShareId()}`,
    type: 'website',
    site_name: 'Titanic AI Bot'
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get('id');

  if (!shareId) {
    return NextResponse.json(
      { error: 'Share ID required' },
      { status: 400 }
    );
  }

  // In production, fetch from database
  // For now, return mock data
  const shareData = {
    id: shareId,
    passenger_name: 'John Doe',
    survival_probability: 0.72,
    survived: true,
    passenger_class: 1,
    sex: 'male',
    age: 35,
    twin_name: 'John Jacob Astor IV',
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(shareData);
}
