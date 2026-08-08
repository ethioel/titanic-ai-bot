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

  // Nautical color palette — no external image needed
  const bgGradient = survived
    ? 'linear-gradient(160deg, #0f2e1d 0%, #1a4d33 30%, #0d3b2a 60%, #062d1f 100%)'
    : 'linear-gradient(160deg, #2d0f0f 0%, #4d1a1a 30%, #3b0d0d 60%, #2d0606 100%)';

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
          background: bgGradient,
        }}
      >
        {/* ══ SVG Wave Pattern Overlay (no external image needed) ══ */}
        <svg
          width="1200"
          height="630"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.12,
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="waves" x="0" y="0" width="200" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M0 20 Q25 5, 50 20 T100 20 T150 20 T200 20"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
              />
            </pattern>
            <pattern id="stars" x="0" y="0" width="300" height="300" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="1" fill="white" opacity="0.6"/>
              <circle cx="150" cy="120" r="0.8" fill="white" opacity="0.4"/>
              <circle cx="250" cy="80" r="1.2" fill="white" opacity="0.5"/>
              <circle cx="80" cy="200" r="0.6" fill="white" opacity="0.7"/>
              <circle cx="220" cy="250" r="1" fill="white" opacity="0.3"/>
              <circle cx="30" cy="280" r="0.9" fill="white" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#waves)" />
          <rect width="100%" height="60%" fill="url(#stars)" />
        </svg>

        {/* Vignette overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
        }} />

        {/* Subtle border frame */}
        <div style={{
          position: 'absolute',
          inset: 20,
          border: '2px solid rgba(255,255,255,0.15)',
          borderRadius: 12,
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
          {/* Decorative line */}
          <div style={{
            width: 80,
            height: 3,
            background: 'rgba(255,255,255,0.4)',
            borderRadius: 2,
            marginBottom: 24,
          }} />

          <div style={{ fontSize: 88, marginBottom: 20, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))' }}>
            {emoji}
          </div>

          <div style={{ 
            fontSize: 50, 
            fontWeight: 800, 
            letterSpacing: '-0.02em', 
            marginBottom: 10,
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          }}>
            {name} {verb}
          </div>

          <div style={{ fontSize: 22, opacity: 0.85, marginBottom: 8, fontWeight: 500, letterSpacing: '0.05em' }}>
            {subtitle}
          </div>

          <div style={{ 
            fontSize: 42, 
            fontWeight: 700, 
            marginBottom: 8,
            textShadow: '0 2px 20px rgba(0,0,0,0.6)',
          }}>
            {(prob * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 36, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Survival Probability
          </div>

          {twin && (
            <div style={{ fontSize: 17, opacity: 0.8, fontStyle: 'italic', marginBottom: 28 }}>
              Historical Twin: {twin}
            </div>
          )}

          {/* Bottom branding */}
          <div style={{ 
            fontSize: 14, 
            opacity: 0.5,
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: 20,
            width: '45%',
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
