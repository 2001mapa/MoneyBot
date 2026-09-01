import { ImageResponse } from 'next/og'
 
export const size = {
  width: 512,
  height: 512,
}
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)', // Deep navy to dark blue
          borderRadius: '112px',
          boxShadow: 'inset 0 0 0 12px rgba(255,255,255,0.05), inset 0 20px 40px rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Gold/Orange crypto color
            width: '280px',
            height: '280px',
            borderRadius: '140px', // Perfect circle for a coin
            border: '8px solid rgba(253, 230, 138, 0.8)', // Lighter gold inner ring
            boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 8px 16px rgba(255,255,255,0.6), inset 0 -8px 16px rgba(0,0,0,0.2)',
            color: 'white',
            fontFamily: 'sans-serif',
            fontSize: '150px',
            fontWeight: 900,
            letterSpacing: '-5px',
          }}
        >
          {/* Inner embossed circle of the coin */}
          <div style={{
            position: 'absolute',
            width: '220px',
            height: '220px',
            borderRadius: '110px',
            border: '4px solid rgba(255,255,255,0.3)',
            boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.1)',
          }}></div>
          <span style={{ 
            textShadow: '0 4px 12px rgba(0,0,0,0.4)',
            transform: 'translateY(-2px)'
          }}>
            M
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
