import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const survived = searchParams.get('survived') === 'true';
  const prob = parseFloat(searchParams.get('prob') || '0.5');
  const name = searchParams.get('name') || 'You';
  const twin = searchParams.get('twin') || '';
  const pclass = searchParams.get('class') || '';

  const emoji = survived ? '🛟' : '🌊';
  const verb = survived ? 'SURVIVED' : 'PERISHED';
  const subtitle = pclass ? `${['','1st','2nd','3rd'][parseInt(pclass)]} Class` : 'RMS Titanic Passenger';

  // Deep nautical gradient — no external assets
  const bg = survived
    ? 'linear-gradient(160deg, #0a1f14 0%, #143d28 25%, #1a4d33 50%, #0f2e1d 75%, #0a1f14 100%)'
    : 'linear-gradient(160deg, #1f0a0a 0%, #3d1414 25%, #4d1a1a 50%, #2e0f0f 75%, #1f0a0a 100%)';

  // Decorative stars as simple positioned divs (Satori-compatible)
  const stars = [
    { top: 40, left: 80, size: 3, opacity: 0.5 },
    { top: 80, left: 200, size: 2, opacity: 0.3 },
    { top: 120, left: 350, size: 4, opacity: 0.4 },
    { top: 60, left: 500, size: 2, opacity: 0.6 },
    { top: 150, left: 650, size: 3, opacity: 0.35 },
    { top: 90, left: 800, size: 2, opacity: 0.5 },
    { top: 130, left: 950, size: 3, opacity: 0.4 },
    { top: 50, left: 1100, size: 2, opacity: 0.6 },
    { top: 100, left: 180, size: 2, opacity: 0.3 },
    { top: 70, left: 420, size: 3, opacity: 0.45 },
    { top: 140, left: 580, size: 2, opacity: 0.35 },
    { top: 110, left: 750, size: 4, opacity: 0.5 },
    { top: 55, left: 900, size: 2, opacity: 0.4 },
    { top: 125, left: 1050, size: 3, opacity: 0.3 },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: 'white',
          padding: 60,
          position: 'relative',
          background: bg,
        }}
      >
        {/* Stars — rendered as simple white circles */}
        {stars.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              borderRadius: '50%',
              background: `rgba(255,255,255,${s.opacity})`,
            }}
          />
        ))}

        {/* Vignette */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }} />

        {/* Border frame */}
        <div style={{
          position: 'absolute',
          inset: 24,
          border: '1.5px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
        }} />

        {/* Top decorative line */}
        <div style={{
          position: 'absolute',
          top: 55,
          width: 100,
          height: 2,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 1,
        }} />

        {/* Content */}
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          width: '100%',
          zIndex: 1,
        }}>
          <div style={{ fontSize: 84, marginBottom: 18, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))' }}>
            {emoji}
          </div>

          <div style={{ 
            fontSize: 48, 
            fontWeight: 800, 
            letterSpacing: '-0.02em', 
            marginBottom: 10,
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          }}>
            {name} {verb}
          </div>

          <div style={{ fontSize: 20, opacity: 0.8, marginBottom: 8, fontWeight: 500, letterSpacing: '0.05em' }}>
            {subtitle}
          </div>

          <div style={{ 
            fontSize: 40, 
            fontWeight: 700, 
            marginBottom: 6,
            textShadow: '0 2px 20px rgba(0,0,0,0.6)',
          }}>
            {(prob * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: 13, opacity: 0.55, marginBottom: 32, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Survival Probability
          </div>

          {twin && (
            <div style={{ fontSize: 16, opacity: 0.75, fontStyle: 'italic', marginBottom: 24 }}>
              Historical Twin: {twin}
            </div>
          )}

          {/* Bottom line */}
          <div style={{ 
            fontSize: 13, 
            opacity: 0.45,
            borderTop: '1px solid rgba(255,255,255,0.18)',
            paddingTop: 18,
            width: '40%',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            Titanic AI
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
