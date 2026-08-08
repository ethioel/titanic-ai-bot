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

  // Premium nautical palette — no images needed
  const bg = survived
    ? 'linear-gradient(160deg, #0c2e1c 0%, #164a30 20%, #1e5c3a 40%, #164a30 60%, #0c2e1c 100%)'
    : 'linear-gradient(160deg, #2a0c0c 0%, #4a1616 20%, #5c1e1e 40%, #4a1616 60%, #2a0c0c 100%)';

  // Generate deterministic stars based on name so they don't shift
  const stars = [];
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = 0; i < 20; i++) {
    const x = ((seed * (i + 1) * 137) % 1100) + 50;
    const y = ((seed * (i + 1) * 293) % 300) + 30;
    const size = ((seed * (i + 1)) % 3) + 1;
    const opacity = ((seed * (i + 1) * 0.01) % 0.5) + 0.15;
    stars.push({ x, y, size, opacity });
  }

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
        {/* Noise texture overlay — inline SVG data URI works in Satori */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.65%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px',
        }} />

        {/* Stars */}
        {stars.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
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
          background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.55) 100%)',
        }} />

        {/* Top border line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: 3,
          background: survived
            ? 'linear-gradient(90deg, transparent, rgba(34,197,94,0.4), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)',
        }} />

        {/* Corner ornaments */}
        <div style={{
          position: 'absolute',
          top: 30,
          left: 30,
          width: 40,
          height: 40,
          borderTop: '2px solid rgba(255,255,255,0.2)',
          borderLeft: '2px solid rgba(255,255,255,0.2)',
        }} />
        <div style={{
          position: 'absolute',
          top: 30,
          right: 30,
          width: 40,
          height: 40,
          borderTop: '2px solid rgba(255,255,255,0.2)',
          borderRight: '2px solid rgba(255,255,255,0.2)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 30,
          left: 30,
          width: 40,
          height: 40,
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          borderLeft: '2px solid rgba(255,255,255,0.2)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 30,
          right: 30,
          width: 40,
          height: 40,
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          borderRight: '2px solid rgba(255,255,255,0.2)',
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
          {/* Year badge */}
          <div style={{
            fontSize: 13,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            opacity: 0.5,
            marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '6px 16px',
            borderRadius: 20,
          }}>
            RMS Titanic · 1912
          </div>

          <div style={{ fontSize: 88, marginBottom: 20, filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.5))' }}>
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

          <div style={{ fontSize: 22, opacity: 0.85, marginBottom: 8, fontWeight: 500 }}>
            {subtitle}
          </div>

          {/* Probability ring */}
          <div style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            border: `4px solid ${survived ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderTopColor: survived ? '#22c55e' : '#ef4444',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            position: 'relative',
          }}>
            <div style={{ fontSize: 36, fontWeight: 800 }}>
              {(prob * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Probability
            </div>
          </div>

          {twin && (
            <div style={{ fontSize: 17, opacity: 0.75, fontStyle: 'italic', marginBottom: 24 }}>
              Twin: {twin}
            </div>
          )}

          {/* Bottom branding */}
          <div style={{ 
            fontSize: 14, 
            opacity: 0.45,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginTop: 8,
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
