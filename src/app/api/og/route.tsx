import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') || 'CHIDINMA OKON';
  const tier = searchParams.get('tier') || 'GOLD';
  const score = searchParams.get('score') || '84';
  const band = searchParams.get('band') || 'DANGEROUS';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090B',
          backgroundImage: 'radial-gradient(ellipse at 50% -20%, rgba(99, 102, 241, 0.3) 0%, transparent 60%)',
          padding: '40px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: '850px',
            height: '480px',
            borderRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px',
            background: 'linear-gradient(135deg, #F8E7BE 0%, #EED192 50%, #E4BE6B 100%)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            border: '2px solid rgba(255, 255, 255, 0.6)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-0.02em', color: '#422006' }}>
              FACECARD
            </span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: '800',
                padding: '6px 20px',
                borderRadius: '9999px',
                background: 'rgba(66, 32, 6, 0.15)',
                color: '#422006',
              }}
            >
              {tier} TIER
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#78350F', display: 'block' }}>
                CARDHOLDER
              </span>
              <span style={{ fontSize: '38px', fontWeight: '900', color: '#422006', letterSpacing: '-0.01em' }}>
                {name}
              </span>
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#78350F' }}>
                LETHALITY RATING
              </span>
              <span style={{ fontSize: '72px', fontWeight: '900', color: '#422006', lineHeight: '1' }}>
                {score}
                <span style={{ fontSize: '28px', opacity: 0.6 }}>/100</span>
              </span>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '800',
                  color: '#DC2626',
                  marginTop: '4px',
                  letterSpacing: '0.05em',
                }}
              >
                {band}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', fontSize: '20px', fontWeight: '700', color: '#A1A1AA' }}>
          Face card never declines • facecard.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
