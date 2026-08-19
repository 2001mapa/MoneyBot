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
          background: '#09090b',
          borderRadius: '128px',
        }}
      >
        <div
          style={{
            width: '288px',
            height: '288px',
            border: '36px solid #10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#022c22',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '36px',
              height: '212px',
              background: '#10b981',
              borderRadius: '18px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '72px',
              left: '44px',
              width: '112px',
              height: '36px',
              background: '#10b981',
              borderRadius: '18px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '72px',
              left: '44px',
              width: '112px',
              height: '36px',
              background: '#10b981',
              borderRadius: '18px',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
