import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Helper: fetch image and convert to base64 data URI
async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

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

  // Try to load background image from public/
  const bgUrl = new URL('/images/shared-card-bg.jpg', request.url).toString();
  const bgDataUri = await fetchImageAsBase64(bgUrl);

  const overlayColor = survived
    ? 'rgba(6,78,59,0.82)'
    : 'rgba(127,29,29,0.82)';

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
          // Use fetched image if available, else dark gradient
          background: bgDataUri
            ? `#0d1b2a`
            : survived
              ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)'
              : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)',
        }}
      >
        {/* Background image layer — Satori supports <img> positioned absolutely */}
        {bgDataUri && (
          <img
            src={bgDataUri}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.35,
            }}
          />
        )}

        {/* Color overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: bgDataUri
            ? `linear-gradient(135deg, ${overlayColor} 0%, ${survived ? 'rgba(6,95,70,0.70)' : 'rgba(153,27,27,0.70)'} 50%, ${overlayColor} 100%)`
            : 'transparent',
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
          <div style={{ fontSize: 90, marginBottom: 24, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>
            {emoji}
          </div>

          <div style={{ 
            fontSize: 52, 
            fontWeight: 800, 
            letterSpacing: '-0.02em', 
            marginBottom: 12,
            textShadow: '0 2px 20px rgba(0,0,0,0.6)',
          }}>
            {name} {verb}
          </div>

          <div style={{ fontSize: 24, opacity: 0.92, marginBottom: 8, fontWeight: 500 }}>
            {subtitle}
          </div>

          <div style={{ fontSize: 34, fontWeight: 700, marginBottom: 36 }}>
            {(prob * 100).toFixed(1)}% Survival Probability
          </div>

          {twin && (
            <div style={{ fontSize: 18, opacity: 0.85, fontStyle: 'italic', marginBottom: 28 }}>
              Historical Twin: {twin}
            </div>
          )}

          <div style={{ 
            fontSize: 16, 
            opacity: 0.65,
            borderTop: '1px solid rgba(255,255,255,0.25)',
            paddingTop: 24,
            width: '55%',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            titanic-ai-bot.vercel.app
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
