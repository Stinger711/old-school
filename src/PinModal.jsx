import { useState }  from 'react';
import { ADMIN_PIN }  from './config.js';

export default function PinModal({ onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);

  function attempt() {
    if (pin === ADMIN_PIN) onSuccess();
    else { setErr(true); setPin(''); }
  }

  return (
    <div onClick={onCancel} style={{
      position:'fixed', inset:0, zIndex:60,
      background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{
        background:'var(--navy-light)',
        border:'1px solid rgba(200,150,30,0.2)',
        borderRadius:'20px 20px 0 0',
        width:'100%', maxWidth:420,
        padding:'10px 0 40px',
        boxShadow:'0 -20px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'rgba(200,150,30,0.3)' }} />
        </div>

        <div style={{ padding:'0 24px' }}>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:22, color:'var(--cream)', marginBottom:4 }}>
            Admin Access
          </div>
          <div style={{ fontSize:13, color:'var(--cream-30)', marginBottom:24 }}>
            Enter your PIN to upload photos and place markers
          </div>

          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setErr(false); }}
            onKeyDown={e => e.key === 'Enter' && attempt()}
            placeholder="PIN"
            autoFocus
            style={{
              width:'100%', boxSizing:'border-box',
              background:'rgba(255,255,255,0.05)',
              border:`1px solid ${err ? 'rgba(248,113,113,0.5)' : 'rgba(200,150,30,0.25)'}`,
              borderRadius:10, padding:'13px 16px',
              color:'var(--cream)', outline:'none',
              fontFamily:'var(--font-sans)',
              letterSpacing:'0.25em',
              marginBottom: err ? 8 : 20,
            }}
          />
          {err && <div style={{ fontSize:13, color:'#f87171', marginBottom:16 }}>Incorrect PIN</div>}

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={attempt} style={{
              flex:1, fontFamily:'var(--font-sans)', fontSize:15, fontWeight:600,
              padding:'13px 0', borderRadius:12, cursor:'pointer', minHeight:50,
              border:'1px solid rgba(200,150,30,0.5)',
              background:'rgba(200,150,30,0.15)', color:'var(--gold)',
            }}>
              Unlock
            </button>
            <button onClick={onCancel} style={{
              fontFamily:'var(--font-sans)', fontSize:15,
              padding:'13px 20px', borderRadius:12, cursor:'pointer', minHeight:50,
              border:'1px solid var(--cream-10)',
              background:'var(--cream-10)', color:'var(--cream-30)',
            }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
