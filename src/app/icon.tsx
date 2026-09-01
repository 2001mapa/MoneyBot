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
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 1) 0%, rgba(37, 99, 235, 1) 100%)', // Vibrant primary blue
            width: '280px',
            height: '280px',
            borderRadius: '70px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 2px 10px rgba(255,255,255,0.4)',
            color: 'white',
            fontFamily: 'sans-serif',
            fontSize: '160px',
            fontWeight: 900,
            letterSpacing: '-8px',
          }}
        >
          <span style={{ 
            textShadow: '0 10px 20px rgba(0,0,0,0.3)',
            transform: 'translateY(-5px)'
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
