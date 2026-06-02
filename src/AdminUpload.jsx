import { useState, useRef }                               from 'react';
import { createPhoto, uploadFile, getNotifiablePeople }   from './firebase.js';
import { compressImage, notifyPeople }                    from './utils.js';
import { EMAILJS }                                        from './config.js';

export default function AdminUpload({ onUploaded, onCancel }) {
  const [title,    setTitle]    = useState('');
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [stage,    setStage]    = useState('form'); // form | uploading | notifying | done
  const [progress, setProgress] = useState('');
  const [error,    setError]    = useState('');
  const [result,   setResult]   = useState(null);
  const fileRef = useRef(null);

  function onFileSelect(e) {
    const f = e.target.files[0]; if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f)); e.target.value = '';
  }

  async function upload() {
    if (!title.trim()) { setError('Enter a title for this photo.'); return; }
    if (!file)         { setError('Choose an image to upload.');    return; }
    setError('');

    setStage('uploading'); setProgress('Compressing image…');
    let imageUrl, photoId;
    try {
      const blob = await compressImage(file, 1800, 0.84);
      const id   = `${Date.now()}`;
      setProgress('Uploading photo…');
      imageUrl = await uploadFile(`photos/${id}.jpg`, blob);
      setProgress('Saving record…');
      photoId  = await createPhoto({ title: title.trim(), imageUrl });
    } catch {
      setError('Upload failed. Check your Firebase config and try again.');
      setStage('form'); return;
    }

    const ejsReady =
      EMAILJS.serviceId  !== 'YOUR_SERVICE_ID' &&
      EMAILJS.templateId !== 'YOUR_TEMPLATE_ID';

    let notified = 0, failed = 0;
    if (ejsReady) {
      setStage('notifying');
      try {
        const people = await getNotifiablePeople();
        if (people.length > 0) {
          setProgress(`Notifying ${people.length} person${people.length !== 1 ? 's' : ''}…`);
          const res = await notifyPeople(people, title.trim(), (done, total) => {
            setProgress(`Notifying ${done} / ${total}…`);
          });
          notified = res.filter(r => r.ok).length;
          failed   = res.filter(r => !r.ok).length;
        }
      } catch {}
    }

    setResult({ title: title.trim(), imageUrl, notified, failed, ejsReady });
    setStage('done');
    onUploaded({ id: photoId, title: title.trim(), imageUrl, taggedCount: 0 });
  }

  return (
    <Overlay onClose={stage === 'done' ? onCancel : undefined}>

      {stage === 'form' && (
        <div className="fade-in">
          <Hdr title="Upload Photo" onClose={onCancel} />
          <div style={body}>
            <div>
              <label style={fieldLabel}>Photo Title</label>
              <input style={inp} value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Matric Farewell 1986" autoFocus />
            </div>

            <div onClick={() => fileRef.current?.click()} style={{
              border: `2px dashed rgba(200,150,30,${preview ? 0.45 : 0.2})`,
              borderRadius:12, overflow:'hidden', cursor:'pointer',
              aspectRatio: preview ? undefined : '16/9',
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(200,150,30,0.03)', minHeight: preview ? 'auto' : 120,
            }}>
              {preview
                ? <img src={preview} alt="" style={{ width:'100%', maxHeight:260, objectFit:'cover', display:'block' }} />
                : <div style={{ textAlign:'center', padding:24, color:'var(--cream-30)' }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>🖼️</div>
                    <div style={{ fontSize:13 }}>Tap to choose image</div>
                    <div style={{ fontSize:11, marginTop:4, color:'var(--cream-30)' }}>JPG or PNG · compressed automatically</div>
                  </div>
              }
            </div>

            {error && <div style={{ fontSize:13, color:'#f87171' }}>{error}</div>}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={upload} style={btnGold}>Upload &amp; Notify</button>
              <button onClick={onCancel} style={btnGhost}>Cancel</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onFileSelect} />
          </div>
        </div>
      )}

      {(stage === 'uploading' || stage === 'notifying') && (
        <div style={{ padding:'40px 24px', textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:14 }}>{stage === 'uploading' ? '⬆️' : '✉️'}</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:18, color:'var(--cream)', marginBottom:8 }}>
            {stage === 'uploading' ? 'Uploading…' : 'Sending notifications…'}
          </div>
          <div className="pulse-anim" style={{ fontSize:13, color:'var(--cream-30)' }}>{progress}</div>
        </div>
      )}

      {stage === 'done' && result && (
        <div className="fade-in" style={{ padding:'28px 24px' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:20, color:'var(--cream)', marginBottom:6 }}>
            Photo uploaded
          </div>
          <div style={{ fontSize:14, color:'var(--cream-60)', lineHeight:1.6 }}>
            <strong style={{ color:'var(--cream)' }}>{result.title}</strong> is now live.
          </div>
          {result.ejsReady
            ? <div style={{ fontSize:13, color:'var(--cream-30)', marginTop:10 }}>
                ✉️ {result.notified} notification{result.notified !== 1 ? 's' : ''} sent
                {result.failed > 0 && ` · ${result.failed} failed`}
              </div>
            : <div style={{ fontSize:12, color:'var(--cream-30)', marginTop:10, lineHeight:1.5 }}>
                ℹ️ EmailJS not configured — see SETUP.md to enable notifications.
              </div>
          }
          <button onClick={onCancel} style={{ ...btnGold, marginTop:22 }}>Done</button>
        </div>
      )}
    </Overlay>
  );
}

function Overlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:60,
      background:'rgba(0,0,0,0.78)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
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

function Hdr({ title, onClose }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 0' }}>
      <div style={{ fontFamily:'var(--font-serif)', fontSize:18, color:'var(--cream)' }}>{title}</div>
      <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--cream-30)', cursor:'pointer', fontSize:18 }}>✕</button>
    </div>
  );
}

const body       = { padding:'14px 20px 28px', display:'flex', flexDirection:'column', gap:14 };
const fieldLabel = { fontSize:11, color:'rgba(200,150,30,0.6)', display:'block', marginBottom:5, letterSpacing:'0.05em', textTransform:'uppercase' };
const inp        = { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)',
  border:'1px solid rgba(200,150,30,0.2)', borderRadius:10, padding:'12px 14px',
  color:'var(--cream)', outline:'none', fontFamily:'var(--font-sans)' };
const btnGold    = { fontFamily:'var(--font-sans)', fontSize:14, fontWeight:600,
  padding:'11px 18px', borderRadius:10, cursor:'pointer', minHeight:44,
  border:'1px solid rgba(200,150,30,0.45)',
  background:'rgba(200,150,30,0.12)', color:'var(--gold)' };
const btnGhost   = { fontFamily:'var(--font-sans)', fontSize:14,
  padding:'11px 16px', borderRadius:10, cursor:'pointer', minHeight:44,
  border:'1px solid var(--cream-10)',
  background:'var(--cream-10)', color:'var(--cream-30)' };
