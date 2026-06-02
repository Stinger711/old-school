import { useState, useEffect, useRef } from 'react';
import { searchPeople, createPerson }   from './firebase.js';
import { hashPin }                       from './utils.js';

export default function PersonSearch({ onSelect, onCancel }) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [searching,setSearching]= useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      setResults(await searchPeople(query.trim()));
      setSearching(false);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  if (creating) return <CreateNew onCreated={onSelect} onBack={() => setCreating(false)} onCancel={onCancel} />;

  return (
    <Overlay onClose={onCancel}>
      <div style={{ padding:'16px 20px 24px' }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:18, color:'var(--cream)', marginBottom:4 }}>
          Link to person
        </div>
        <div style={{ fontSize:12, color:'var(--cream-30)', marginBottom:14 }}>
          Search the registry or create a new entry
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          style={inp}
        />

        <div style={{ marginTop:10, minHeight:70 }}>
          {searching && <div style={{ fontSize:13, color:'var(--cream-30)', padding:'8px 0' }}>Searching…</div>}

          {!searching && query && results.length === 0 && (
            <div style={{ fontSize:13, color:'var(--cream-30)', padding:'8px 0' }}>
              No match found — create a new entry below
            </div>
          )}

          {results.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              style={{
                display:'flex', alignItems:'center', gap:12,
                width:'100%', background:'rgba(200,150,30,0.06)',
                border:'1px solid rgba(200,150,30,0.15)',
                borderRadius:10, padding:'10px 12px', cursor:'pointer',
                marginBottom:6, fontFamily:'var(--font-sans)',
                minHeight:48, transition:'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,150,30,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,150,30,0.06)'}
            >
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:14, color:'var(--cream)', fontWeight:500 }}>{p.name}</div>
                <div style={{ fontSize:12, color:'var(--cream-30)', marginTop:2 }}>
                  {[p.role, p.city, p.country].filter(Boolean).join(' · ')}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ borderTop:'1px solid rgba(200,150,30,0.12)', marginTop:14, paddingTop:14, display:'flex', gap:8 }}>
          <button onClick={() => setCreating(true)} style={btnGold}>+ Create New Person</button>
          <button onClick={onCancel}                style={btnGhost}>Cancel</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Quick create form ───────────────────────────────────────── */
function CreateNew({ onCreated, onBack, onCancel }) {
  const [form,   setForm]   = useState({ name:'', email:'', role:'', phone:'', country:'', city:'', funFact:'' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const fields = [
    { key:'name',    ph:'Full name *',       type:'text'  },
    { key:'email',   ph:'Email (optional)',  type:'email' },
    { key:'role',    ph:'Class / Role',      type:'text'  },
    { key:'phone',   ph:'Phone number',      type:'tel'   },
    { key:'country', ph:'Country',           type:'text'  },
    { key:'city',    ph:'City',              type:'text'  },
    { key:'funFact', ph:'Fun fact',          type:'text'  },
  ];

  async function save() {
    if (!form.name) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    try {
      const data = { ...form, email: form.email?.toLowerCase().trim() || null,
        notifyOnUpload: !!form.email, pinHash: null };
      const id = await createPerson(data);
      onCreated({ id, ...data });
    } catch { setError('Failed to create. Try again.'); }
    setSaving(false);
  }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ padding:'16px 20px 24px', maxHeight:'88dvh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <button onClick={onBack} style={{ ...btnGhost, padding:'6px 10px', fontSize:12 }}>← Back</button>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:17, color:'var(--cream)' }}>New Person</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {fields.map(({ key, ph, type }) => (
            <input key={key} style={inp} type={type} placeholder={ph}
              value={form[key]} onChange={set(key)} autoFocus={key==='name'} />
          ))}
        </div>
        {error && <div style={{ fontSize:13, color:'#f87171', marginTop:8 }}>{error}</div>}
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <button onClick={save} disabled={saving} style={btnGold}>{saving ? 'Creating…' : 'Create & Link'}</button>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Overlay — bottom sheet ──────────────────────────────────── */
function Overlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:70,
      background:'rgba(0,0,0,0.78)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{
        background:'var(--navy-light)',
        border:'1px solid rgba(200,150,30,0.2)',
        borderRadius:'20px 20px 0 0',
        width:'100%', maxWidth:480,
        boxShadow:'0 -20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'rgba(200,150,30,0.3)' }} />
        </div>
        {children}
      </div>
    </div>
  );
}

const inp      = { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)',
  border:'1px solid rgba(200,150,30,0.2)', borderRadius:10, padding:'12px 14px',
  color:'var(--cream)', outline:'none', fontFamily:'var(--font-sans)' };
const btnGold  = { fontFamily:'var(--font-sans)', fontSize:13, fontWeight:600,
  padding:'10px 16px', borderRadius:10, cursor:'pointer', minHeight:44,
  border:'1px solid rgba(200,150,30,0.45)',
  background:'rgba(200,150,30,0.12)', color:'var(--gold)' };
const btnGhost = { fontFamily:'var(--font-sans)', fontSize:13,
  padding:'10px 14px', borderRadius:10, cursor:'pointer', minHeight:44,
  border:'1px solid var(--cream-10)',
  background:'var(--cream-10)', color:'var(--cream-30)' };
