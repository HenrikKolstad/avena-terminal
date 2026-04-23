'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        fontSize: 12,
        padding: '6px 14px',
        border: '1px solid #c89b3c',
        background: '#c89b3c',
        color: '#fff',
        cursor: 'pointer',
        fontFamily: 'inherit',
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}
    >
      Print / Save PDF
    </button>
  );
}
