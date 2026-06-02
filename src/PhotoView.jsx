import { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { getMarkersForPhoto, getPerson, createMarker, deleteMarker } from './firebase.js';
import { isTouchDevice } from './utils.js';
import PersonModal  from './PersonModal.jsx';
import PersonSearch from './PersonSearch.jsx';

export default function PhotoView({ photo, admin, onBack }) {
  const [markers,     setMarkers]     = useState([]);
  const [peopleCache, setPeopleCache] = useState({});
  const [dotsVisible, setDotsVisible] = useState(false);
  const [showHint,    setShowHint]    = useState(true);
  const [hoveredId,   setHoveredId]   = useState(null);
  const [viewPerson,  setViewPerson]  = useState(null);
  const [placing,     setPlacing]     = useState(false);
  const [pendingPos,  setPendingPos]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const containerRef = useRef(null);
  const hintTimer    = useRef(null);

  useEffect(() => {
    load();
    hintTimer.current = setTimeout(() => setShowHint(false), 4500);
    return () => clearTimeout(hintTimer.current);
  }, [photo.id]);

  async function load() {
    setLoading(true);
    try {
      const list  = await getMarkersForPhoto(photo.id);
      const cache = {};
      await Promise.all(list.map(async m => {
        if (m.personId && !cache[m.personId]) {
          const p = await getPerson(m.personId);
          if (p) cache[m.personId] = p;
        }
      }));
      setMarkers(list);
      setPeopleCache(cache);
    } catch {}
    setLoading(false);
  }

  function cachePerson(person) {
    setPeopleCache(p => ({ ...p, [person.id]: person }));
  }

  function handlePhotoTap(e) {
    if (placing && admin) {
      const rect = containerRef.current.getBoundingClientRect();
      const x    = ((e.clientX - rect.left) / rect.width)  * 100;
      const y    = ((e.clientY - rect.top)  / rect.height) * 100;
      setPendingPos({ x, y });
      setPlacing(false);
      return;
    }
    setDotsVisible(v => !v);
    setShowHint(false);
    clearTimeout(hintTimer.current);
  }

  function handleMarkerClick(e, marker) {
    e.stopPropagation();
    setViewPerson({ marker, person: peopleCache[marker.personId] || null });
  }

  async function onPersonSelected(person) {
    if (!pendingPos) return;
    const id = await createMarker({ photoId: photo.id, personId: person.id, ...pendingPos });
    cachePerson(person);
    setMarkers(m => [...m, { id, photoId: photo.id, personId: person.id, ...pendingPos }]);
    setPendingPos(null);
    setDotsVisible(true);
  }

  async function onDeleteMarker(markerId) {
    await deleteMarker(markerId, photo.id);
    setMarkers(m => m.filter(x => x.id !== markerId));
    setViewPerson(null);
  }

  function onPersonUpdated(person) {
    cachePerson(person);
    setViewPerson(v => v ? { ...v, person } : null);
  }

  const hasMarkers = markers.length > 0;

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'var(--navy-dark)', overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }}>

      {/* ── Toolbar ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', flexShrink: 0,
        borderBottom: '1px solid rgba(200,150,30,0.12)',
        background: 'rgba(14,22,40,0.97)',
      }}>
        <button onClick={onBack} style={hdrBtn}>← Back</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--cream)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {photo.title}
          </div>
          {!loading && hasMarkers && (
            <div style={{ fontSize: 11, color: 'var(--cream-30)', marginTop: 1 }}>
              {dotsVisible ? 'Tap photo to hide markers' : 'Tap photo to reveal people'}
            </div>
          )}
        </div>

        {admin && (
          <button
            onClick={() => { setPlacing(p => !p); if (!placing) setDotsVisible(true); }}
            style={{
              ...hdrBtn,
              background: placing ? 'rgba(200,150,30,0.18)' : 'var(--cream-10)',
              color:      placing ? 'var(--gold)'            : 'var(--cream-30)',
              border:     placing ? '1px solid rgba(200,150,30,0.45)' : '1px solid var(--cream-10)',
            }}
          >
            {placing ? '📍 Tap a face' : '+ Marker'}
          </button>
        )}
      </header>

      {/* ── Photo + zoom ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <TransformWrapper
          initialScale={1}
          minScale={0.85}
          maxScale={5}
          centerOnInit
          panning={{ disabled: placing }}
          pinch={{ disabled: placing }}
          wheel={{ step: 0.08 }}
          doubleClick={{ disabled: true }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              ref={containerRef}
              onClick={handlePhotoTap}
              style={{
                position: 'relative',
                display: 'inline-block',
                lineHeight: 0,
                cursor: placing ? 'crosshair' : 'default',
              }}
            >
              <img
                src={photo.imageUrl}
                alt={photo.title}
                draggable={false}
                style={{
                  display: 'block',
                  maxWidth: '100vw',
                  maxHeight: 'calc(100dvh - 120px)',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />

              {/* ── Markers (inside transform so they scale with pinch) ── */}
              {dotsVisible && !loading && markers.map(m => (
                <MarkerDot
                  key={m.id}
                  marker={m}
                  person={peopleCache[m.personId]}
                  hovered={!isTouchDevice && hoveredId === m.id}
                  onMouseEnter={() => !isTouchDevice && setHoveredId(m.id)}
                  onMouseLeave={() => !isTouchDevice && setHoveredId(null)}
                  onClick={(e) => handleMarkerClick(e, m)}
                />
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>

        {/* ── Hint overlay (outside transform — doesn't scale) ── */}
        {showHint && !dotsVisible && !loading && hasMarkers && (
          <div className="hint-fade" style={{
            position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(14,22,40,0.88)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(200,150,30,0.3)',
            color: 'rgba(200,150,30,0.9)',
            fontSize: 13, padding: '8px 18px', borderRadius: 22,
            pointerEvents: 'none', whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
          }}>
            👆  Tap photo to reveal people
          </div>
        )}

        {/* Placing-mode border */}
        {placing && (
          <div style={{
            position: 'absolute', inset: 0,
            border: '2px solid rgba(200,150,30,0.5)',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* ── People strip ── */}
      {hasMarkers && (
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(200,150,30,0.12)',
          background: 'rgba(14,22,40,0.97)',
          padding: '10px 14px 12px',
        }}>
          <div style={{
            fontSize: 10, color: 'rgba(200,150,30,0.45)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            In this photo
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {markers.map(m => {
              const p   = peopleCache[m.personId];
              const hov = hoveredId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setViewPerson({ marker: m, person: p || null })}
                  onMouseEnter={() => { setHoveredId(m.id); setDotsVisible(true); }}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    flexShrink: 0,
                    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                    padding: '6px 14px', borderRadius: 18, cursor: 'pointer', border: 'none',
                    background: hov ? 'rgba(200,150,30,0.2)' : 'rgba(245,240,232,0.07)',
                    color:      hov ? 'var(--gold)'          : 'var(--cream-60)',
                    transition: 'all 0.15s',
                    minHeight: 36, // touch-friendly
                  }}
                >
                  {p?.name || '?'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {viewPerson && (
        <PersonModal
          marker={viewPerson.marker}
          person={viewPerson.person}
          admin={admin}
          onPersonUpdated={onPersonUpdated}
          onDeleteMarker={() => onDeleteMarker(viewPerson.marker.id)}
          onClose={() => setViewPerson(null)}
        />
      )}
      {pendingPos && (
        <PersonSearch
          onSelect={onPersonSelected}
          onCancel={() => setPendingPos(null)}
        />
      )}
    </div>
  );
}

/* ── Marker dot with 44px touch target ───────────────────────── */
function MarkerDot({ marker, person, hovered, onMouseEnter, onMouseLeave, onClick }) {
  const named = !!person?.name;
  return (
    <div
      className="dots-in"
      style={{
        position: 'absolute',
        left: `${marker.x}%`, top: `${marker.y}%`,
        transform: 'translate(-50%, -50%)',
        width: 44, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 10,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Desktop hover tooltip */}
      {hovered && <Tooltip person={person} markerX={marker.x} markerY={marker.y} />}

      {/* Ping ring */}
      <div className="ping" style={{
        position: 'absolute',
        width: 18, height: 18,
        borderRadius: '50%',
        background: named ? 'rgba(200,150,30,0.45)' : 'rgba(200,150,30,0.2)',
      }} />

      {/* Solid dot */}
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: named ? 'var(--gold)' : 'rgba(200,150,30,0.45)',
        border: `2px solid rgba(245,240,232,${named ? 0.9 : 0.55})`,
        boxShadow: `0 0 ${hovered ? 18 : 8}px rgba(200,150,30,${hovered ? 0.9 : 0.5})`,
        transform: hovered ? 'scale(1.5)' : 'scale(1)',
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s',
        position: 'relative', zIndex: 1,
      }} />
    </div>
  );
}

/* ── Desktop hover tooltip ───────────────────────────────────── */
function Tooltip({ person, markerX, markerY }) {
  const above      = markerY > 22;
  const alignRight = markerX > 74;
  const alignLeft  = markerX < 26;

  return (
    <div className="fade-in" style={{
      position: 'absolute', zIndex: 50, pointerEvents: 'none',
      ...(alignRight ? { right: 20 } : alignLeft ? { left: 20 } : { left: '50%', transform: 'translateX(-50%)' }),
      ...(above ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
      minWidth: 160, maxWidth: 220,
    }}>
      <div style={{
        background: 'rgba(10,16,32,0.97)',
        border: '1px solid rgba(200,150,30,0.3)',
        borderRadius: 12, padding: '11px 14px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
      }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--cream)' }}>
          {person?.name ||
            <span style={{ color: 'var(--cream-30)', fontStyle: 'italic', fontFamily: 'inherit' }}>Unknown</span>}
        </div>
        {person?.role && (
          <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 3 }}>{person.role}</div>
        )}
        {(person?.city || person?.country) && (
          <div style={{ fontSize: 11, color: 'var(--cream-30)', marginTop: 3 }}>
            {[person.city, person.country].filter(Boolean).join(', ')}
          </div>
        )}
        {!person && (
          <div style={{ fontSize: 11, color: 'var(--cream-30)', marginTop: 3, fontStyle: 'italic' }}>
            Tap to add info
          </div>
        )}
      </div>
    </div>
  );
}

const hdrBtn = {
  fontFamily: 'var(--font-sans)', fontSize: 12,
  padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
  border: '1px solid var(--cream-10)',
  background: 'var(--cream-10)', color: 'var(--cream-30)',
  flexShrink: 0, minHeight: 36,
  transition: 'all 0.15s',
};
