import { useState, useEffect } from 'react';
import { getPhotos }            from './firebase.js';
import { formatDate }            from './utils.js';
import PhotoView                 from './PhotoView.jsx';
import AdminUpload               from './AdminUpload.jsx';
import PinModal                  from './PinModal.jsx';

const crestSrc = `${import.meta.env.BASE_URL}dhs-crest.png`;

export default function App() {
  const [photos,      setPhotos]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState('gallery');
  const [activePhoto, setActivePhoto] = useState(null);
  const [admin,       setAdmin]       = useState(false);
  const [showPin,     setShowPin]     = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setPhotos(await getPhotos()); } catch {}
    setLoading(false);
  }

  if (view === 'photo' && activePhoto) {
    return (
      <PhotoView
        photo={activePhoto}
        admin={admin}
        onBack={() => { setView('gallery'); setActivePhoto(null); load(); }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--navy-dark)', fontFamily: 'var(--font-sans)' }}>

      {/* ── Hero header ── */}
      <header style={{ position: 'relative', textAlign: 'center', padding: '36px 20px 22px',
        borderBottom: '1px solid var(--gold-muted)', background: 'rgba(21,32,64,0.4)' }}>

        {/* Admin control — top-right */}
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8 }}>
          {admin ? (
            <>
              <button style={btnGold} onClick={() => setShowUpload(true)}>+ Upload</button>
              <button style={btnGhost} onClick={() => setAdmin(false)} title="Lock admin">🔒</button>
            </>
          ) : (
            <button style={btnGhost} onClick={() => setShowPin(true)} title="Admin">⚙️</button>
          )}
        </div>

        {/* Crest */}
        <img
          src={crestSrc}
          alt="Durban High School"
          onError={e => { e.target.style.display = 'none'; }}
          style={{
            width: 80, height: 'auto', marginBottom: 16,
            filter: 'drop-shadow(0 4px 20px rgba(200,150,30,0.4))',
          }}
        />

        {/* App name */}
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(30px, 9vw, 44px)',
          fontWeight: 700,
          color: 'var(--gold)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1,
          margin: 0,
        }}>
          Old School
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          fontStyle: 'italic',
          color: 'var(--cream-60)',
          margin: '8px 0 0',
        }}>
          Class of '86
        </p>

        {/* Motto rule */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          maxWidth: 240, margin: '18px auto 0',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--gold-muted)' }} />
          <span style={{
            fontSize: 10, color: 'rgba(200,150,30,0.55)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            Deo Fretus
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--gold-muted)' }} />
        </div>
      </header>

      {/* ── Gallery ── */}
      <main style={{ padding: '24px 16px 48px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 64, color: 'var(--cream-30)' }}>
            <span className="pulse-anim">Loading…</span>
          </div>
        ) : photos.length === 0 ? (
          <EmptyState admin={admin} onUpload={() => setShowUpload(true)} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))',
            gap: 18,
          }}>
            {photos.map(p => (
              <PhotoCard
                key={p.id}
                photo={p}
                onClick={() => { setActivePhoto(p); setView('photo'); }}
              />
            ))}
          </div>
        )}
      </main>

      {showUpload && (
        <AdminUpload
          onUploaded={photo => { setShowUpload(false); setPhotos(prev => [photo, ...prev]); }}
          onCancel={() => setShowUpload(false)}
        />
      )}
      {showPin && (
        <PinModal
          onSuccess={() => { setAdmin(true); setShowPin(false); }}
          onCancel={() => setShowPin(false)}
        />
      )}
    </div>
  );
}

/* ── Photo card ─────────────────────────────────────────────── */
function PhotoCard({ photo, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--navy-light)',
        border: `1px solid rgba(200,150,30,${hov ? 0.45 : 0.18})`,
        borderTop: `3px solid rgba(200,150,30,${hov ? 1 : 0.45})`,
        borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov
          ? '0 20px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(200,150,30,0.15)'
          : '0 4px 20px rgba(0,0,0,0.35)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: 'var(--navy-dark)' }}>
        <img
          src={photo.imageUrl}
          alt={photo.title}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            transform: hov ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.32s ease',
          }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(14,22,40,0.75) 0%, transparent 55%)',
        }} />
        {/* Tagged count badge */}
        {(photo.taggedCount > 0) && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10,
            background: 'rgba(14,22,40,0.8)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(200,150,30,0.3)',
            borderRadius: 6, padding: '3px 9px',
            fontSize: 11, color: 'rgba(200,150,30,0.9)', letterSpacing: '0.04em',
          }}>
            {photo.taggedCount} tagged
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--cream)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4,
        }}>
          {photo.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--cream-30)' }}>
          {formatDate(photo.uploadedAt)}
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */
function EmptyState({ admin, onUpload }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 48, opacity: 0.25, marginBottom: 18 }}>🖼️</div>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--cream-30)', marginBottom: 8 }}>
        No photos yet
      </p>
      <p style={{ fontSize: 13, color: 'var(--cream-30)', lineHeight: 1.7, maxWidth: 280, margin: '0 auto' }}>
        {admin
          ? 'Upload the first photo to get started'
          : 'Ask the admin to upload photos then share this link'
        }
      </p>
      {admin && (
        <button onClick={onUpload} style={{ ...btnGold, marginTop: 24, fontSize: 14, padding: '10px 24px' }}>
          + Upload First Photo
        </button>
      )}
    </div>
  );
}

/* ── Shared button styles ────────────────────────────────────── */
const btnGold = {
  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
  border: '1px solid rgba(200,150,30,0.55)',
  background: 'rgba(200,150,30,0.12)', color: 'var(--gold)',
  transition: 'all 0.15s',
};
const btnGhost = {
  fontFamily: 'var(--font-sans)', fontSize: 12,
  padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
  border: '1px solid var(--cream-10)',
  background: 'var(--cream-10)', color: 'var(--cream-30)',
};
