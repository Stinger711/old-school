import { useState }   from 'react';
import { createPerson, updatePerson, findPersonByEmail } from './firebase.js';
import { hashPin }     from './utils.js';

const FIELDS = [
  { key: 'name',    label: 'Full Name',      type: 'text',  ph: 'e.g. Mark Barbarić',         required: true  },
  { key: 'role',    label: 'Class / Role',   type: 'text',  ph: 'e.g. 11B · Rugby Captain',  required: false },
  { key: 'email',   label: 'Email Address',  type: 'email', ph: 'mark@example.com',            required: true  },
  { key: 'phone',   label: 'Contact Number', type: 'tel',   ph: '+27 82 000 0000',             required: false },
  { key: 'country', label: 'Country',        type: 'text',  ph: 'South Africa',               required: false },
  { key: 'city',    label: 'City',           type: 'text',  ph: 'Durban',                     required: false },
  { key: 'funFact', label: 'Fun Fact',       type: 'text',  ph: "Something the class won't forget…", required: false },
];

const blank = { name:'', role:'', email:'', phone:'', country:'', city:'', funFact:'', pin:'', pin2:'', notifyOnUpload: true };

export default function PersonModal({ marker, person, admin, onPersonUpdated, onDeleteMarker, onClose }) {
  const [mode,      setMode]      = useState(person ? 'view' : 'create');
  const [authEmail, setAuthEmail] = useState('');
  const [authPin,   setAuthPin]   = useState('');
  const [authErr,   setAuthErr]   = useState('');
  const [editTarget,setEditTarget]= useState(null);
  const [form,      setForm]      = useState(blank);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  /* ── Auth flow ── */
  async function tryAuth() {
    setAuthErr('');
    if (!authEmail) { setAuthErr('Enter your email address.'); return; }
    if (!authPin)   { setAuthErr('Enter your PIN.'); return; }
    const found = await findPersonByEmail(authEmail);
    if (!found) { setAuthErr('No profile found with that email.'); return; }
    const hash = await hashPin(authEmail, authPin);
    if (hash !== found.pinHash) { setAuthErr('Incorrect PIN.'); return; }
    setEditTarget(found);
    setForm({ name: found.name||'', role: found.role||'', email: found.email||'',
      phone: found.phone||'', country: found.country||'', city: found.city||'',
      funFact: found.funFact||'', pin:'', pin2:'', notifyOnUpload: found.notifyOnUpload ?? true });
    setMode('edit');
  }

  /* ── Admin edit (no PIN required) ── */
  function adminEdit() {
    const src = person || {};
    setEditTarget(src);
    setForm({ name: src.name||'', role: src.role||'', email: src.email||'',
      phone: src.phone||'', country: src.country||'', city: src.city||'',
      funFact: src.funFact||'', pin:'', pin2:'', notifyOnUpload: src.notifyOnUpload ?? true });
    setMode('edit');
  }

  /* ── Save ── */
  async function save() {
    setError('');
    if (!form.name)  { setError('Name is required.'); return; }
    if (!form.email) { setError('Email is required.'); return; }
    if (mode === 'create') {
      if (!form.pin)              { setError('Choose a PIN (4+ digits).'); return; }
      if (form.pin !== form.pin2) { setError('PINs do not match.'); return; }
      const existing = await findPersonByEmail(form.email);
      if (existing) { setError('That email already has a profile. Use "This is me" to edit it.'); return; }
    }
    setSaving(true);
    try {
      const pinHash = form.pin
        ? await hashPin(form.email, form.pin)
        : (editTarget?.pinHash || null);

      const data = {
        name: form.name, role: form.role, email: form.email,
        phone: form.phone, country: form.country, city: form.city,
        funFact: form.funFact, notifyOnUpload: form.notifyOnUpload,
        ...(pinHash ? { pinHash } : {}),
      };

      let saved;
      if (mode === 'create') {
        const id = await createPerson(data);
        saved = { id, ...data };
      } else {
        await updatePerson(editTarget.id, data);
        saved = { ...editTarget, ...data };
      }
      onPersonUpdated(saved);
      onClose();
    } catch { setError('Save failed — please try again.'); }
    setSaving(false);
  }

  return (
    <Overlay onClose={onClose}>

      {/* ── View ── */}
      {mode === 'view' && person && (
        <ProfileView
          person={person} admin={admin}
          onThisIsMe={() => setMode('auth')}
          onAdminEdit={adminEdit}
          onDeleteMarker={onDeleteMarker}
          onClose={onClose}
        />
      )}

      {/* ── View with no person ── */}
      {mode === 'view' && !person && (
        <div className="fade-in">
          <MHdr title="Unknown person" onClose={onClose} />
          <div style={body}>
            <p style={{ fontSize: 14, color: 'var(--cream-60)', textAlign: 'center', paddingTop: 8 }}>
              No profile linked yet. Is this you?
            </p>
            <Btn primary onClick={() => setMode('create')}>Create My Profile</Btn>
          </div>
        </div>
      )}

      {/* ── Auth ── */}
      {mode === 'auth' && (
        <div className="fade-in">
          <MHdr title="Identify yourself" sub="Enter your email and PIN to edit your profile" onClose={onClose} />
          <div style={body}>
            <Field label="Email Address">
              <input style={inp} type="email" value={authEmail}
                onChange={e => setAuthEmail(e.target.value)} placeholder="your@email.com" autoFocus />
            </Field>
            <Field label="Your PIN">
              <input style={inp} type="password" value={authPin}
                onChange={e => setAuthPin(e.target.value)} placeholder="••••"
                onKeyDown={e => e.key === 'Enter' && tryAuth()} />
            </Field>
            {authErr && <Err msg={authErr} />}
            <div style={{ display:'flex', gap:8 }}>
              <Btn primary onClick={tryAuth}>Verify &amp; Edit</Btn>
              <Btn onClick={() => setMode('view')}>Back</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit form ── */}
      {(mode === 'edit' || mode === 'create') && (
        <div className="fade-in" style={{ maxHeight: '88dvh', overflowY: 'auto' }}>
          <MHdr
            title={mode === 'create' ? 'Create Profile' : 'Edit Profile'}
            sub={mode === 'create' ? "Set a PIN — you'll use it to edit from any device" : 'Update your details'}
            onClose={onClose}
          />
          <div style={body}>
            {FIELDS.map(({ key, label, type, ph }) => (
              <Field key={key} label={label}>
                <input style={inp} type={type} value={form[key]} onChange={set(key)} placeholder={ph} autoFocus={key==='name'} />
              </Field>
            ))}

            {mode === 'create' && (
              <>
                <Field label="Choose a PIN (4+ digits)">
                  <input style={inp} type="password" value={form.pin} onChange={set('pin')} placeholder="e.g. 1986" />
                </Field>
                <Field label="Confirm PIN">
                  <input style={inp} type="password" value={form.pin2} onChange={set('pin2')} placeholder="Same PIN again" />
                </Field>
              </>
            )}

            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, color:'var(--cream-60)' }}>
              <input type="checkbox" checked={form.notifyOnUpload} onChange={set('notifyOnUpload')}
                style={{ accentColor:'var(--gold)', width:16, height:16 }} />
              Email me when new photos are added
            </label>

            {error && <Err msg={error} />}
            <div style={{ display:'flex', gap:8 }}>
              <Btn primary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</Btn>
              <Btn onClick={onClose}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </Overlay>
  );
}

/* ── Profile view (read-only) ─────────────────────────────────── */
function ProfileView({ person, admin, onThisIsMe, onAdminEdit, onDeleteMarker, onClose }) {
  const loc = [person.city, person.country].filter(Boolean).join(', ');
  return (
    <div className="fade-in">
      <div style={{ position:'relative', padding:'22px 22px 0' }}>
        <button onClick={onClose} style={closeBtn}>✕</button>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:22, color:'var(--cream)', paddingRight:28, lineHeight:1.2 }}>
          {person.name}
        </div>
        {person.role && <div style={{ fontSize:13, color:'var(--gold)', marginTop:5 }}>{person.role}</div>}
        {loc           && <div style={{ fontSize:13, color:'var(--cream-30)', marginTop:4 }}>📍 {loc}</div>}
      </div>

      {/* Gold divider */}
      <div style={{ margin:'14px 22px 0', height:1, background:'var(--gold-muted)' }} />

      <div style={{ padding:'14px 22px 22px' }}>
        {person.funFact && (
          <div style={{
            fontSize:13, color:'var(--cream-60)', lineHeight:1.6,
            marginBottom:16, padding:'10px 14px',
            background:'rgba(200,150,30,0.06)',
            borderLeft:'3px solid rgba(200,150,30,0.4)',
            borderRadius:'0 8px 8px 0',
          }}>
            {person.funFact}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 20px', marginBottom:20 }}>
          {[
            { label:'Phone',   value: person.phone   },
            { label:'Email',   value: person.email   },
            { label:'Country', value: person.country },
            { label:'City',    value: person.city    },
          ].filter(d => d.value).map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize:10, color:'rgba(200,150,30,0.45)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>
                {label}
              </div>
              <div style={{ fontSize:13, color:'var(--cream-60)', wordBreak:'break-all' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <Btn primary onClick={onThisIsMe}>This is me — Edit</Btn>
          {admin && <Btn onClick={onAdminEdit}>Admin Edit</Btn>}
          {admin && (
            <Btn danger onClick={() => { if (window.confirm('Remove this marker from the photo?')) onDeleteMarker(); }}>
              Remove Marker
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Shared primitives ───────────────────────────────────────── */
function Overlay({ onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:60,
        background:'rgba(0,0,0,0.78)', backdropFilter:'blur(8px)',
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        padding: 0, overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'var(--navy-light)',
          border:'1px solid rgba(200,150,30,0.2)',
          borderRadius:'20px 20px 0 0',
          width:'100%', maxWidth:480,
          boxShadow:'0 -20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Gold handle bar */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:2 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'rgba(200,150,30,0.3)' }} />
        </div>
        {children}
      </div>
    </div>
  );
}

function MHdr({ title, sub, onClose }) {
  return (
    <div style={{ padding:'14px 22px 0', position:'relative' }}>
      <button onClick={onClose} style={closeBtn}>✕</button>
      <div style={{ fontFamily:'var(--font-serif)', fontSize:20, color:'var(--cream)', paddingRight:28 }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:'var(--cream-30)', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize:11, color:'rgba(200,150,30,0.6)', display:'block', marginBottom:5, letterSpacing:'0.05em', textTransform:'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Err({ msg }) {
  return <div style={{ fontSize:13, color:'#f87171' }}>{msg}</div>;
}

function Btn({ primary, danger, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        fontFamily:'var(--font-sans)', fontSize:14, fontWeight: primary ? 600 : 400,
        padding:'10px 18px', borderRadius:10, cursor: disabled ? 'not-allowed' : 'pointer',
        border:'none', opacity: disabled ? 0.6 : 1, minHeight:44,
        background: primary ? 'rgba(200,150,30,0.18)' : danger ? 'rgba(239,68,68,0.12)' : 'var(--cream-10)',
        color:      primary ? 'var(--gold)'           : danger ? '#f87171'               : 'var(--cream-60)',
        border:     primary ? '1px solid rgba(200,150,30,0.45)' : '1px solid transparent',
        transition:'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

const body     = { padding:'16px 22px 28px', display:'flex', flexDirection:'column', gap:14 };
const inp      = { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)',
  border:'1px solid rgba(200,150,30,0.2)', borderRadius:10, padding:'12px 14px',
  color:'var(--cream)', outline:'none', fontFamily:'var(--font-sans)',
  // fontSize intentionally omitted — global rule forces 16px
};
const closeBtn = { position:'absolute', top:14, right:16, background:'none', border:'none',
  color:'var(--cream-30)', cursor:'pointer', fontSize:18, lineHeight:1, padding:4 };
