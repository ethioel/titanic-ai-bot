import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const survived = searchParams.get('survived') === 'true';
  const prob = parseFloat(searchParams.get('prob') || '0.5');
  const name = searchParams.get('name') || 'You';
  const twin = searchParams.get('twin') || '';
  const pclass = searchParams.get('class') || '';

  const bgGradient = survived 
    ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)'
    : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)';

  const emoji = survived ? '🛟' : '🌊';
  const verb = survived ? 'SURVIVED' : 'PERISHED';
  const subtitle = pclass ? `${['','1st','2nd','3rd'][parseInt(pclass)]} Class Passenger` : 'RMS Titanic';

  return new ImageResponse(
    (
      <div
        style={{
          background: bgGradient,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          color: 'white',
          padding: 60,
          position: 'relative',
        }}
      >
        {/* Subtle pattern overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }} />

        <div style={{ fontSize: 90, marginBottom: 24, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
          {emoji}
        </div>
        
        <div style={{ 
          fontSize: 52, 
          fontWeight: 800, 
          letterSpacing: '-0.02em', 
          marginBottom: 12,
          textAlign: 'center',
          textShadow: '0 2px 20px rgba(0,0,0,0.3)',
        }}>
          {name} {verb}
        </div>
        
        <div style={{ fontSize: 24, opacity: 0.85, marginBottom: 8, fontWeight: 500 }}>
          {subtitle}
        </div>
        
        <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 40 }}>
          {(prob * 100).toFixed(1)}% Survival Probability
        </div>

        {twin && (
          <div style={{ 
            fontSize: 18, 
            opacity: 0.7,
            fontStyle: 'italic',
            marginBottom: 30,
          }}>
            Historical Twin: {twin}
          </div>
        )}

        <div style={{ 
          fontSize: 16, 
          opacity: 0.5,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          paddingTop: 24,
          width: '50%',
          textAlign: 'center',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          titanic-ai-bot.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
