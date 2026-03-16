import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200',
          height: '630',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px',
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              letterSpacing: '6px',
              color: '#64748b',
              textTransform: 'uppercase',
              fontFamily: 'sans-serif',
              marginBottom: '16px',
            }}
          >
            DAILY NEWS QUIZ
          </div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '12px',
            }}
          >
            The Daily Quiz
          </div>
          <div
            style={{
              fontSize: '24px',
              color: '#64748b',
              fontFamily: 'sans-serif',
              marginBottom: '40px',
            }}
          >
            Play the news.
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            {['World', 'Tech', 'Science', 'Business', 'Sports', 'Culture'].map((cat) => (
              <div
                key={cat}
                style={{
                  padding: '10px 20px',
                  borderRadius: '99px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8',
                  fontSize: '16px',
                  fontFamily: 'sans-serif',
                }}
              >
                {cat}
              </div>
            ))}
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