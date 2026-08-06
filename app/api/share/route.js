import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const survived = searchParams.get('survived') === 'true';
  const prob = parseFloat(searchParams.get('prob') || '0.5');
  const name = searchParams.get('name') || 'You';

  const bgGradient = survived 
    ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)'
    : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)';

  const emoji = survived ? '🛟' : '🌊';
  const verb = survived ? 'SURVIVED' : 'PERISHED';

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
          padding: 40,
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 20 }}>{emoji}</div>
        <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
          {name} {verb} the Titanic
        </div>
        <div style={{ fontSize: 28, opacity: 0.9, marginBottom: 30 }}>
          Survival Probability: {(prob * 100).toFixed(1)}%
        </div>
        <div style={{ 
          fontSize: 18, 
          opacity: 0.6,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          paddingTop: 20,
          width: '60%',
          textAlign: 'center'
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
