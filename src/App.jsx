import { useState, useEffect } from 'react';

// ─── Design tokens ────────────────────────────────────────────────────────────

const SITE_BLUE = '#4A71FF';   // matches the Wix site background exactly

const C = {
  // Site palette
  blue:       SITE_BLUE,
  blueDeep:   '#3355E8',
  blueLight:  'rgba(74,113,255,0.15)',
  blueWhite:  'rgba(255,255,255,0.12)',
  blueWhite2: 'rgba(255,255,255,0.22)',
  // Content palette
  navy:       '#1B3F6A',
  navyDeep:   '#122b4f',
  gold:       '#B8873A',
  goldLight:  'rgba(184,135,58,0.14)',
  goldPale:   'rgba(184,135,58,0.07)',
  cream:      '#F8F4EE',
  creamDark:  '#EDE8E0',
  white:      '#FFFFFF',
  text:       '#1C1C1C',
  muted:      '#6B7280',
  faint:      '#9CA3AF',
  border:     '#E5DED4',
  // Media type colours
  video:      '#2563EB',
  videoLight: 'rgba(37,99,235,0.10)',
  audio:      '#059669',
  audioLight: 'rgba(5,150,105,0.10)',
  book:       '#7C3AED',
  bookLight:  'rgba(124,58,237,0.10)',
};

const MEDIA = {
  video:   { label:'וידאו', icon:'▶', color:C.video,  bg:C.videoLight  },
  audio:   { label:'שמע',  icon:'♫', color:C.audio,  bg:C.audioLight  },
  book:    { label:'ספר',  icon:'📖',color:C.book,   bg:C.bookLight   },
  article: { label:'מאמר', icon:'✍', color:C.navy,   bg:C.blueLight   },
};
function media(t) { return MEDIA[t] || { label:t||'', icon:'•', color:C.muted, bg:C.creamDark }; }

function formatDuration(min) {
  if (!min) return '';
  const h = Math.floor(min/60), m = min%60;
  return h > 0 ? `${h}:${String(m).padStart(2,'0')} ש'` : `${m} דק'`;
}

function ytThumb(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&\s]+)/,
    /[?&]v=([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/shorts\/([^?&\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`;
  }
  return null;
}

// Detect media type from any URL — one field handles everything
function detectMedia(url) {
  if (!url) return null;
  const u = url.trim();

  // YouTube
  const ytPatterns = [
    /youtu\.be\/([^?&\s]+)/,
    /[?&]v=([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/shorts\/([^?&\s]+)/,
  ];
  for (const p of ytPatterns) {
    const m = u.match(p);
    if (m) return { type: 'youtube', src: `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1` };
  }

  // Audio file
  if (/\.(mp3|m4a|ogg|wav|aac|flac)(\?|$)/i.test(u))
    return { type: 'audio', src: u };

  // Video file
  if (/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(u))
    return { type: 'video', src: u };

  // PDF
  if (/\.pdf(\?|$)/i.test(u) || u.includes('drive.google.com/file'))
    return { type: 'pdf', src: u };

  // Any other URL → external article / link
  if (/^https?:\/\//i.test(u))
    return { type: 'link', src: u };

  return null;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App({ data }) {
  const topics  = data?.topics  || [];
  const series  = data?.series  || [];
  const lessons = data?.lessons || [];

  const [topicId,        setTopicId]        = useState(null);
  const [seriesId,       setSeriesId]       = useState(null);
  const [query,          setQuery]          = useState('');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [sharedId,       setSharedId]       = useState(null); // id of lesson just shared
  const [isMobile,       setIsMobile]       = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!document.getElementById('bavua-font')) {
      const l = document.createElement('link');
      l.id='bavua-font'; l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap';
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    if (topics.length && !topics.find(t => t._id === topicId)) setTopicId(topics[0]._id);
  }, [topics]);

  function lessonCount(tid) {
    const sids = series.filter(s => s.topic === tid).map(s => s._id);
    return lessons.filter(l => sids.includes(l.series)).length;
  }

  function goTopic(tid) {
    const topicSeries = series.filter(s => s.topic === tid);
    setTopicId(tid);
    setSeriesId(topicSeries.length === 1 ? topicSeries[0]._id : null);
    setQuery('');
  }

  function shareLesson(lesson, e) {
    e.stopPropagation();
    const url  = lesson.videoUrl || 'https://liron03.wixstudio.com/bavua/blank-1-1';
    const text = lesson.title;

    const markShared = () => {
      setSharedId(lesson._id);
      setTimeout(() => setSharedId(null), 2000);
    };

    const copyFallback = () => {
      try {
        navigator.clipboard.writeText(url).then(markShared).catch(markShared);
      } catch {
        // last-resort for restrictive iframe contexts
        const ta = document.createElement('textarea');
        ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        markShared();
      }
    };

    if (navigator.share) {
      navigator.share({ title: text, url }).then(markShared).catch(err => {
        if (err.name !== 'AbortError') copyFallback();
      });
    } else {
      copyFallback();
    }
  }

  if (!data) return null;

  const inLessons     = !!seriesId || !!query;
  const currentSeries = series.find(s => s._id === seriesId);

  const visibleSeries = series
    .filter(s => s.topic === topicId);

  const visibleLessons = seriesId
    ? lessons.filter(l => l.series === seriesId)
    : lessons.filter(l =>
        l.title?.toLowerCase().includes(query.toLowerCase()) ||
        (l.tags||[]).some(t => t.toLowerCase().includes(query.toLowerCase())) ||
        l.description?.toLowerCase().includes(query.toLowerCase())
      );

  // ── Mobile topic strip (brand + pills in one row) ──────────────────────────
  const MobileTopicStrip = () => (
    <div style={s.mobileTopicRow}>
      {/* Brand — fixed, doesn't scroll */}
      <div style={s.mobileBrand}>
        <div style={s.brandDot} />
        <span style={{ ...s.brandText, fontSize: 9 }}>ספריית<br/>התוכן</span>
      </div>
      {/* Topic pills — scrollable */}
      <div className="mobile-topic-strip" style={s.mobileTopicStrip}>
        {topics.map(t => {
          const active = t._id === topicId;
          return (
            <button
              key={t._id}
              className={`mobile-topic-btn${active ? ' active' : ''}`}
              style={{ ...s.mobileTopicBtn, ...(active ? s.mobileTopicBtnActive : {}) }}
              onClick={() => goTopic(t._id)}
            >
              {t.title}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div dir="rtl" style={{ ...s.root, flexDirection: isMobile ? 'column' : 'row', minHeight: isMobile ? 0 : 600 }}>
      <style>{css}</style>

      {/* ── Mobile: brand + topic strip ── */}
      {isMobile && <MobileTopicStrip />}

      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <aside style={s.sidebar}>
          <div style={s.brand}>
            <div style={s.brandDot} />
            <span style={s.brandText}>ספריית התוכן</span>
          </div>

          <div style={s.sidebarSection}>נושאים</div>

          <nav style={s.topicNav}>
            {topics.map(t => {
              const active = t._id === topicId;
              return (
                <button
                  key={t._id}
                  className={`topic-btn${active?' active':''}`}
                  style={{ ...s.topicBtn, ...(active ? s.topicActive : {}) }}
                  onClick={() => goTopic(t._id)}
                >
                  <span>{t.title}</span>
                  <span style={{ ...s.badge, ...(active ? s.badgeActive : {}) }}>
                    {lessonCount(t._id)}
                  </span>
                </button>
              );
            })}
          </nav>

          <div style={s.sidebarFooter}>
            <span style={s.footerText}>בבואה © {new Date().getFullYear()}</span>
          </div>
        </aside>
      )}

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main style={s.main}>

        {/* Toolbar */}
        <header style={{
          ...s.toolbar,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems:    isMobile ? 'stretch' : 'center',
          padding:       isMobile ? '9px 12px' : '14px 22px',
          gap:           isMobile ? 10 : 12,
        }}>
          <div style={{ ...s.searchWrap, maxWidth: isMobile ? 'none' : 400 }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" style={{flexShrink:0}}>
              <circle cx="9" cy="9" r="6" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
              <path d="M14 14l3 3" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              className="bavua-search"
              style={s.searchInput}
              type="text"
              placeholder="חיפוש שיעורים..."
              value={query}
              onChange={e => { setQuery(e.target.value); setSeriesId(null); }}
            />
            {query && (
              <button className="clear-btn" style={s.clearBtn} onClick={() => setQuery('')}>✕</button>
            )}
          </div>

        </header>

        {/* Content */}
        {inLessons ? (

          /* ── Lessons panel ── */
          <div style={{
            ...s.lessonsWrap,
            padding: isMobile ? '10px 10px 14px' : '20px 22px 22px',
          }}>
            <div style={s.lessonsPanel}>

              {/* Lessons header */}
              <div style={{
                ...s.lessonsHead,
                padding:        isMobile ? '14px 14px' : '18px 22px',
                gap:            isMobile ? 10 : 16,
                flexWrap:       isMobile ? 'wrap' : 'nowrap',
              }}>
                <button
                  className="back-btn"
                  style={s.backBtn}
                  onClick={() => { setSeriesId(null); setQuery(''); }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                    <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  חזרה
                </button>
                <div style={s.lessonsMeta}>
                  <h2 style={{ ...s.lessonsTitle, fontSize: isMobile ? 17 : 21 }}>
                    {query ? `תוצאות: "${query}"` : currentSeries?.title || ''}
                  </h2>
                  {currentSeries?.subtitle && (
                    <p style={s.lessonsSub}>{currentSeries.subtitle}</p>
                  )}
                </div>
              </div>

              {/* Lesson rows or book grid */}
              {visibleLessons.some(l => l.coverImage) ? (

                /* ── Book grid ── */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: isMobile ? 14 : 20,
                  padding: isMobile ? '14px 10px 20px' : '20px 22px 28px',
                }}>
                  {visibleLessons.map(lesson => (
                    <a
                      key={lesson._id}
                      href={lesson.externalUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="book-card"
                      style={s.bookCard}
                    >
                      {lesson.coverImage && (
                        <img
                          src={lesson.coverImage}
                          alt={lesson.title}
                          style={s.bookCover}
                        />
                      )}
                      <div style={s.bookInfo}>
                        <span style={s.bookTitle}>{lesson.title}</span>
                        {lesson.subtitle && <p style={s.bookDesc}>{lesson.subtitle}</p>}
                      </div>
                    </a>
                  ))}
                </div>

              ) : (

                /* ── Lesson thumbnail grid ── */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: isMobile ? 12 : 18,
                  padding: isMobile ? '12px 10px 20px' : '18px 22px 26px',
                }}>
                  {visibleLessons.length === 0 && (
                    <Empty text="לא נמצאו שיעורים" dark={false} />
                  )}
                  {visibleLessons.map(lesson => {
                    const thumb = ytThumb(lesson.videoUrl);
                    const isYoutube = !!thumb;
                    const isPdf = !isYoutube && lesson.externalUrl && /\.pdf(\?|$)/i.test(lesson.externalUrl);
                    const isWebArticle = !isYoutube && lesson.externalUrl && !isPdf;
                    const isArticle = isPdf || isWebArticle;

                    const handleClick = () => {
                      if (isYoutube) setSelectedLesson(lesson);
                      else if (isPdf) setSelectedLesson(lesson);
                      else if (isWebArticle) window.open(lesson.externalUrl, '_blank', 'noopener,noreferrer');
                    };

                    return (
                      <div
                        key={lesson._id}
                        className="lesson-thumb-card"
                        style={{ ...s.thumbCard, cursor: (isYoutube || isArticle) ? 'pointer' : 'default' }}
                        onClick={handleClick}
                      >
                        {/* Thumbnail / Article header */}
                        <div style={s.thumbWrap}>
                          {isYoutube ? (
                            <>
                              <img src={thumb} alt={lesson.title} style={s.thumbImg} />
                              <div className="thumb-play-overlay" style={s.thumbPlay}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </>
                          ) : isArticle ? (
                            <div style={s.articleThumbHeader}>
                              <div style={s.articleDocLines}>
                                {[1, 0.65, 0.85, 0.5, 0.75].map((w, i) => (
                                  <div key={i} style={{ height: 3, borderRadius: 2, width: `${w * 100}%`, background: 'rgba(255,255,255,0.25)' }} />
                                ))}
                              </div>
                              <span style={s.articleThumbBadge}>{isPdf ? '📄 PDF' : '✍ מאמר'}</span>
                            </div>
                          ) : (
                            <div style={s.thumbPlaceholder}>♫</div>
                          )}
                        </div>
                        {/* Info */}
                        <div style={s.thumbInfo}>
                          <span style={{ ...s.thumbTitle, fontSize: isMobile ? 13 : 14 }}>{lesson.title}</span>
                          {lesson.subtitle && <p style={s.thumbSub}>{lesson.subtitle}</p>}
                          <div style={{ ...s.chips, marginTop: 4 }}>
                            {lesson.duration && (
                              <span style={s.chipGray}>⏱ {formatDuration(lesson.duration)}</span>
                            )}
                            {(lesson.tags||[]).slice(0,2).map(tag => (
                              <span key={tag} style={s.chipTag}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              )}
            </div>
          </div>

        ) : (

          /* ── Series grid ── */
          <div style={{
            ...s.seriesGrid,
            gridTemplateColumns: isMobile
              ? 'repeat(auto-fill, minmax(200px, 1fr))'
              : 'repeat(auto-fill, minmax(260px, 1fr))',
            padding: isMobile ? '14px' : '24px 22px',
            gap:     isMobile ? 14 : 20,
          }}>
            {visibleSeries.length === 0 && <Empty text="אין סדרות לנושא זה" dark />}
            {visibleSeries.map(ser => {
              const count = lessons.filter(l => l.series === ser._id).length;
              return (
                <div
                  key={ser._id}
                  className="series-card"
                  style={s.seriesCard}
                  onClick={() => setSeriesId(ser._id)}
                >
                  <div style={{...s.cardStripe, backgroundColor: C.gold}} />
                  <div style={{ ...s.cardBody, padding: isMobile ? '16px 16px 14px' : '20px 22px 18px' }}>
                    <div style={s.cardTop}>
                      <span style={s.countLabel}>{count} שיעורים</span>
                    </div>
                    <h3 style={{ ...s.seriesTitle, fontSize: isMobile ? 15 : 17 }}>{ser.title}</h3>
                    {ser.subtitle && <p style={s.seriesSub}>{ser.subtitle}</p>}
                    <div style={s.cardFooter}>
                      <span className="open-label" style={s.openLabel}>
                        פתח סדרה
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
                          style={{display:'inline-block', verticalAlign:'middle', marginRight:4}}>
                          <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="2.2"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Video modal ── */}
      {selectedLesson && (() => {
        const detected = detectMedia(selectedLesson.videoUrl) || detectMedia(selectedLesson.externalUrl);
        return (
          <div
            style={{
              ...s.modalOverlay,
              padding:     isMobile ? 0 : 24,
              alignItems:  isMobile ? 'flex-end' : 'center',
            }}
            onClick={() => setSelectedLesson(null)}
          >
            <div
              style={{
                ...s.modal,
                borderRadius: isMobile ? '20px 20px 0 0' : 20,
                maxHeight:    isMobile ? '92%' : '90%',
                padding:      isMobile ? '20px 16px 28px' : '24px 28px 28px',
                width:        '100%',
              }}
              onClick={e => e.stopPropagation()}
            >

              {/* Header */}
              <div style={s.modalHeader}>
                <div style={s.modalMeta}>
                  {selectedLesson.duration && (
                    <span style={s.modalDuration}>⏱ {formatDuration(selectedLesson.duration)}</span>
                  )}
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button
                    className="share-btn"
                    style={{ ...s.closeBtn, color: sharedId === selectedLesson._id ? '#059669' : C.muted }}
                    onClick={e => shareLesson(selectedLesson, e)}
                    title="שתף שיעור"
                  >
                    {sharedId === selectedLesson._id ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                        <polyline points="16 6 12 2 8 6"/>
                        <line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                    )}
                  </button>
                  <button style={s.closeBtn} onClick={() => setSelectedLesson(null)}>✕</button>
                </div>
              </div>

              <h2 style={{ ...s.modalTitle, fontSize: isMobile ? 18 : 21 }}>{selectedLesson.title}</h2>
              {selectedLesson.subtitle && (
                <p style={s.lessonSubtitle}>{selectedLesson.subtitle}</p>
              )}

              {/* Media player */}
              {detected?.type === 'youtube' && (
                <div style={s.videoWrap}>
                  <iframe
                    src={detected.src}
                    style={s.videoFrame}
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    frameBorder="0"
                  />
                </div>
              )}

              {detected?.type === 'audio' && (
                <div style={s.audioWrap}>
                  <div style={s.audioIcon}>♫</div>
                  <audio controls style={s.audioPlayer} src={detected.src}>
                    הדפדפן שלך אינו תומך בנגן שמע.
                  </audio>
                </div>
              )}

              {detected?.type === 'video' && (
                <video controls style={s.nativeVideo} src={detected.src}>
                  הדפדפן שלך אינו תומך בנגן וידאו.
                </video>
              )}

              {detected?.type === 'pdf' && (
                <div style={s.pdfWrap}>
                  <iframe
                    src={detected.src}
                    style={{ ...s.pdfFrame, height: isMobile ? 280 : 500 }}
                    title="PDF viewer"
                  />
                  <a href={detected.src} target="_blank" rel="noreferrer" style={s.pdfLink}>
                    ↗ פתח בחלון חדש
                  </a>
                </div>
              )}

              {detected?.type === 'link' && (
                <a href={detected.src} target="_blank" rel="noreferrer" style={s.articleCard}>
                  <div style={s.articleIcon}>✍</div>
                  <div style={s.articleText}>
                    <span style={s.articleLabel}>פתח מאמר</span>
                    <span style={s.articleUrl}>{detected.src.replace(/^https?:\/\//, '').slice(0, 60)}</span>
                  </div>
                  <span style={s.articleArrow}>↗</span>
                </a>
              )}

              {!detected && selectedLesson.videoUrl && (
                <div style={s.noVideo}>סוג הקובץ אינו נתמך</div>
              )}
              {!detected && !selectedLesson.videoUrl && (
                <div style={s.noVideo}>לא צורף קישור לשיעור זה</div>
              )}

              {/* Tags */}
              {(selectedLesson.tags||[]).length > 0 && (
                <div style={s.modalTags}>
                  {selectedLesson.tags.map(tag => (
                    <span key={tag} style={s.chipTag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function Empty({ text, dark }) {
  const col = dark ? 'rgba(255,255,255,0.35)' : C.faint;
  const bdr = dark ? 'rgba(255,255,255,0.2)' : C.border;
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'80px 40px', gap:12,
      gridColumn:'1/-1', color:col,
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke={bdr} strokeWidth="2"/>
        <path d="M14 20h12M20 14v12" stroke={bdr} strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span style={{fontSize:15}}>{text}</span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {

  // Root — matches site blue so the iFrame is invisible
  root: {
    display:'flex', height:'100%', minHeight:600,
    fontFamily:"'Heebo', Arial, sans-serif",
    backgroundColor: SITE_BLUE,
    color: C.text, overflow:'hidden',
  },

  // ── Mobile topic strip (combined single row) ──
  mobileTopicRow: {
    display:'flex', alignItems:'stretch',
    backgroundColor: C.navyDeep,
    flexShrink:0,
    borderBottom:'2px solid rgba(255,255,255,0.06)',
  },
  mobileBrand: {
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', gap:4,
    padding:'8px 10px 8px 4px',
    borderLeft:'1px solid rgba(255,255,255,0.1)',
    flexShrink:0,
  },
  mobileTopicStrip: {
    display:'flex', overflowX:'auto', flex:1,
    padding:'8px 10px', gap:7,
    alignItems:'center',
  },
  mobileTopicBtn: {
    whiteSpace:'nowrap', padding:'7px 14px',
    borderRadius:100,
    border:'1.5px solid rgba(255,255,255,0.2)',
    cursor:'pointer', fontSize:13, fontFamily:'inherit',
    color:'rgba(255,255,255,0.7)', backgroundColor:'transparent',
    flexShrink:0, transition:'all 0.18s',
  },
  mobileTopicBtnActive: {
    backgroundColor: C.gold, borderColor: C.gold,
    color:'#fff', fontWeight:700,
  },

  // ── Desktop Sidebar ──
  sidebar: {
    width:230, minWidth:230, flexShrink:0,
    background:`linear-gradient(180deg, ${C.navyDeep} 0%, ${C.navy} 100%)`,
    display:'flex', flexDirection:'column',
    boxShadow:'4px 0 30px rgba(0,0,0,0.25)',
  },
  brand: {
    display:'flex', alignItems:'center', gap:10,
    padding:'26px 20px 20px',
    borderBottom:'1px solid rgba(255,255,255,0.07)',
  },
  brandDot: {
    width:9, height:9, borderRadius:'50%',
    backgroundColor:C.gold, flexShrink:0,
    boxShadow:`0 0 8px ${C.gold}`,
  },
  brandText: {
    color:'rgba(255,255,255,0.5)', fontSize:11,
    letterSpacing:'1.8px', fontWeight:600, textTransform:'uppercase',
  },
  sidebarSection: {
    color:C.gold, fontSize:10, fontWeight:700,
    letterSpacing:'2.5px', textTransform:'uppercase',
    margin:'20px 20px 8px',
  },
  topicNav: {
    display:'flex', flexDirection:'column',
    flex:1, overflowY:'auto', paddingBottom:16,
  },
  topicBtn: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'12px 20px', background:'none', border:'none',
    borderRight:'3px solid transparent',
    cursor:'pointer', color:'rgba(255,255,255,0.5)', fontSize:15,
    textAlign:'right', width:'100%', fontFamily:'inherit',
    transition:'all 0.18s ease',
  },
  topicActive: {
    backgroundColor: C.gold,
    color:'#fff', fontWeight:'700',
    borderRightColor: 'transparent',
  },
  badge: {
    fontSize:11, fontWeight:700, padding:'2px 8px',
    borderRadius:20, backgroundColor:'rgba(255,255,255,0.1)',
    color:'rgba(255,255,255,0.4)', minWidth:22, textAlign:'center',
    transition:'all 0.18s',
  },
  badgeActive: { backgroundColor:'rgba(0,0,0,0.2)', color:'#fff' },
  sidebarFooter: {
    padding:'14px 20px',
    borderTop:'1px solid rgba(255,255,255,0.06)',
  },
  footerText: { fontSize:11, color:'rgba(255,255,255,0.2)' },

  // ── Main ──
  main: {
    flex:1, display:'flex', flexDirection:'column',
    overflow:'hidden', minWidth:0,
  },

  // ── Toolbar ──
  toolbar: {
    display:'flex', alignItems:'center', gap:12,
    padding:'14px 22px',
    backgroundColor:'rgba(255,255,255,0.12)',
    backdropFilter:'blur(12px)',
    WebkitBackdropFilter:'blur(12px)',
    borderBottom:'1px solid rgba(255,255,255,0.12)',
    flexShrink:0, flexWrap:'wrap',
  },
  searchWrap: {
    display:'flex', alignItems:'center', gap:8,
    flex:1, maxWidth:400,
    backgroundColor:'rgba(255,255,255,0.15)',
    border:'1.5px solid rgba(255,255,255,0.25)',
    borderRadius:100, padding:'8px 16px',
    transition:'border-color 0.18s',
  },
  searchInput: {
    flex:1, border:'none', background:'none', outline:'none',
    fontSize:14, color:'#fff', direction:'rtl', fontFamily:'inherit',
  },
  clearBtn: {
    background:'none', border:'none', cursor:'pointer',
    color:'rgba(255,255,255,0.5)', fontSize:12,
    padding:'0 2px', lineHeight:1,
  },
  filters: { display:'flex', gap:6, flexWrap:'wrap' },
  filterBtn: {
    padding:'7px 14px', borderRadius:100,
    border:'1.5px solid rgba(255,255,255,0.25)',
    backgroundColor:'rgba(255,255,255,0.1)',
    cursor:'pointer', fontSize:13,
    color:'rgba(255,255,255,0.75)',
    fontFamily:'inherit', transition:'all 0.18s',
    whiteSpace:'nowrap', flexShrink:0,
  },
  filterBtnActive: {
    backgroundColor:'#fff',
    borderColor:'#fff', color:C.blue,
    fontWeight:700,
  },

  // ── Series grid ──
  seriesGrid: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
    gap:20, padding:'24px 22px',
    overflowY:'auto', flex:1, alignContent:'start',
  },
  seriesCard: {
    backgroundColor:C.white, borderRadius:16,
    border:'none', overflow:'hidden', cursor:'pointer',
    display:'flex', flexDirection:'column',
    boxShadow:'0 4px 24px rgba(0,0,0,0.18)',
    transition:'transform 0.22s ease, box-shadow 0.22s ease',
  },
  cardStripe: { height:4, flexShrink:0 },
  cardBody: {
    display:'flex', flexDirection:'column',
    gap:10, padding:'20px 22px 18px', flex:1,
  },
  cardTop: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
  },
  mediaPill: {
    fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
  },
  countLabel: { fontSize:12, color:C.faint, fontWeight:500 },
  seriesTitle: {
    fontSize:17, fontWeight:800, color:C.navy, lineHeight:1.4, margin:'2px 0',
  },
  seriesSub: { fontSize:13, color:C.muted, lineHeight:1.6 },
  cardFooter: {
    marginTop:'auto', paddingTop:12,
    borderTop:`1px solid ${C.border}`,
  },
  openLabel: {
    fontSize:13, fontWeight:600, color:C.navy,
    display:'flex', alignItems:'center', gap:4,
  },

  // ── Lesson thumbnail grid ──
  thumbCard: {
    borderRadius: 10, overflow: 'hidden', background: C.white,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'transform 0.15s, box-shadow 0.15s',
    display: 'flex', flexDirection: 'column',
  },
  thumbWrap: {
    position: 'relative', width: '100%', aspectRatio: '16/9',
    background: C.navy, overflow: 'hidden', flexShrink: 0,
  },
  thumbImg: {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
  },
  thumbPlaceholder: {
    width: '100%', height: '100%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 28, color: 'rgba(255,255,255,0.4)',
    background: `linear-gradient(135deg, ${C.navy}, ${C.navyDeep})`,
  },
  articleThumbHeader: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'flex-start', justifyContent: 'center', gap: 8, padding: '16px 20px',
    background: `linear-gradient(135deg, ${C.gold}, #8B6020)`,
    position: 'relative',
  },
  articleDocLines: {
    display: 'flex', flexDirection: 'column', gap: 6, width: '100%',
  },
  articleThumbBadge: {
    position: 'absolute', bottom: 10, right: 10,
    fontSize: 11, fontWeight: 700, color: C.white,
    background: 'rgba(0,0,0,0.3)', padding: '3px 8px', borderRadius: 20,
  },
  thumbPlay: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'rgba(0,0,0,0.25)',
    opacity: 0, transition: 'opacity 0.15s',
  },
  thumbInfo: {
    padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1,
  },
  thumbTitle: {
    fontWeight: 700, color: C.navy, lineHeight: 1.35,
  },
  thumbSub: {
    fontSize: 12, color: C.muted, margin: '2px 0 0', lineHeight: 1.4,
  },

  // ── Book grid ──
  bookCard: {
    display:'flex', flexDirection:'column', borderRadius:12, overflow:'hidden',
    background:C.white, textDecoration:'none', color:'inherit',
    boxShadow:'0 2px 8px rgba(0,0,0,0.08)', transition:'transform 0.15s, box-shadow 0.15s',
    cursor:'pointer',
  },
  bookCover: {
    width:'100%', aspectRatio:'2/3', objectFit:'cover', display:'block',
  },
  bookInfo: {
    padding:'10px 12px 14px', display:'flex', flexDirection:'column', gap:4,
  },
  bookTitle: {
    fontSize:14, fontWeight:700, color:C.navy, lineHeight:1.3,
  },
  bookDesc: {
    fontSize:12, color:C.muted, margin:0, lineHeight:1.5,
  },

  // ── Lessons ──
  lessonsWrap: {
    flex:1, overflow:'hidden',
    display:'flex', flexDirection:'column',
    padding:'20px 22px 22px',
  },
  lessonsPanel: {
    flex:1, overflow:'hidden',
    display:'flex', flexDirection:'column',
    backgroundColor:C.white,
    borderRadius:18,
    boxShadow:'0 4px 30px rgba(0,0,0,0.18)',
  },
  lessonsHead: {
    display:'flex', alignItems:'flex-start', gap:16,
    padding:'18px 22px',
    borderBottom:`1px solid ${C.border}`,
    flexShrink:0,
  },
  backBtn: {
    display:'flex', alignItems:'center', gap:5,
    background:'none', border:`1.5px solid ${C.border}`,
    borderRadius:100, padding:'7px 14px',
    cursor:'pointer', fontSize:13, color:C.muted,
    fontFamily:'inherit', transition:'all 0.15s',
    flexShrink:0, marginTop:4, whiteSpace:'nowrap',
  },
  lessonsMeta: { display:'flex', flexDirection:'column', gap:5 },
  miniPill: {
    fontSize:11, fontWeight:700, padding:'2px 10px',
    borderRadius:20, alignSelf:'flex-start',
  },
  lessonsTitle: {
    fontSize:21, fontWeight:900, color:C.navy, lineHeight:1.3,
  },
  lessonsSub: { fontSize:14, color:C.muted, marginTop:2 },
  lessonList: {
    flex:1, overflowY:'auto', padding:'8px 22px 22px',
  },
  lessonRow: {
    display:'flex', alignItems:'center', gap:14,
    padding:'13px 12px', borderRadius:12, cursor:'pointer',
    transition:'background 0.15s', marginBottom:2,
  },
  lessonNum: {
    width:32, height:32, borderRadius:'50%',
    background:`linear-gradient(135deg, ${C.navy} 0%, ${SITE_BLUE} 100%)`,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:12, fontWeight:800, color:'#fff', flexShrink:0,
  },
  lessonBody: {
    flex:1, display:'flex', flexDirection:'column',
    gap:5, minWidth:0,
  },
  lessonTitle: { fontSize:15, fontWeight:600, color:C.text, lineHeight:1.4 },
  lessonSubtitle: { fontSize:12, color:C.muted, margin:'2px 0 0', lineHeight:1.4 },
  chips: { display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' },
  chip: { fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20 },
  chipGray: { fontSize:11, color:C.muted },
  chipTag: {
    fontSize:11, color:C.gold,
    border:'1px solid rgba(184,135,58,0.35)',
    borderRadius:6, padding:'1px 7px',
    backgroundColor:C.goldPale,
  },
  shareBtn: {
    background:'none', border:'none', cursor:'pointer',
    padding:'5px', borderRadius:'50%',
    display:'flex', alignItems:'center', justifyContent:'center',
    flexShrink:0, transition:'color 0.2s, background 0.15s',
    fontFamily:'inherit',
  },

  playBtn: {
    width:28, height:28, borderRadius:'50%',
    backgroundColor:C.navy, color:'#fff',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:10, flexShrink:0,
    boxShadow:`0 2px 8px rgba(27,63,106,0.3)`,
  },

  // ── Modal ──
  modalOverlay: {
    position:'absolute', inset:0,
    backgroundColor:'rgba(10,20,45,0.75)',
    backdropFilter:'blur(6px)',
    WebkitBackdropFilter:'blur(6px)',
    display:'flex', alignItems:'center', justifyContent:'center',
    zIndex:1000, padding:24,
  },
  modal: {
    backgroundColor:C.white,
    borderRadius:20,
    width:'100%', maxWidth:720,
    maxHeight:'90%',
    overflowY:'auto',
    boxShadow:'0 24px 80px rgba(0,0,0,0.45)',
    display:'flex', flexDirection:'column', gap:16,
    padding:'24px 28px 28px',
  },
  modalHeader: {
    display:'flex', justifyContent:'space-between',
    alignItems:'center', gap:12,
  },
  modalMeta: { display:'flex', alignItems:'center', gap:10 },
  modalDuration: { fontSize:13, color:C.muted },
  closeBtn: {
    width:32, height:32, borderRadius:'50%',
    border:`1.5px solid ${C.border}`,
    backgroundColor:'transparent',
    cursor:'pointer', color:C.muted,
    fontSize:14, display:'flex', alignItems:'center',
    justifyContent:'center', flexShrink:0,
    transition:'all 0.15s',
  },
  modalTitle: {
    fontSize:21, fontWeight:900, color:C.navy,
    lineHeight:1.35, margin:0,
  },
  videoWrap: {
    position:'relative', width:'100%',
    paddingBottom:'56.25%',
    borderRadius:12, overflow:'hidden',
    backgroundColor:'#000',
  },
  videoFrame: {
    position:'absolute', inset:0,
    width:'100%', height:'100%', border:'none',
  },
  noVideo: {
    padding:'40px 0', textAlign:'center',
    color:C.faint, fontSize:15,
  },
  audioWrap: {
    display:'flex', flexDirection:'column', alignItems:'center',
    gap:20, padding:'32px 20px',
    backgroundColor:C.cream, borderRadius:14,
  },
  audioIcon: {
    width:72, height:72, borderRadius:'50%',
    background:`linear-gradient(135deg, ${C.navy} 0%, ${SITE_BLUE} 100%)`,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:28, color:'#fff',
    boxShadow:`0 8px 24px rgba(27,63,106,0.3)`,
  },
  audioPlayer: {
    width:'100%', maxWidth:480,
    accentColor: C.navy,
  },
  nativeVideo: {
    width:'100%', borderRadius:12,
    backgroundColor:'#000', maxHeight:400,
  },
  pdfWrap: {
    display:'flex', flexDirection:'column', gap:10,
  },
  pdfFrame: {
    width:'100%', height:500, border:'none',
    borderRadius:12, backgroundColor:C.cream,
  },
  pdfLink: {
    alignSelf:'flex-end', fontSize:13,
    color:C.navy, fontWeight:600,
    textDecoration:'none',
  },
  articleCard: {
    display:'flex', alignItems:'center', gap:16,
    padding:'20px 22px',
    backgroundColor:C.cream, borderRadius:14,
    border:`1.5px solid ${C.border}`,
    textDecoration:'none', color:'inherit',
    transition:'box-shadow 0.18s, border-color 0.18s',
    cursor:'pointer',
  },
  articleIcon: {
    width:48, height:48, borderRadius:12,
    background:`linear-gradient(135deg, ${C.navy} 0%, ${SITE_BLUE} 100%)`,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:22, color:'#fff', flexShrink:0,
  },
  articleText: {
    display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:0,
  },
  articleLabel: {
    fontSize:16, fontWeight:700, color:C.navy,
  },
  articleUrl: {
    fontSize:12, color:C.faint,
    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
    direction:'ltr', textAlign:'right',
  },
  articleArrow: {
    fontSize:20, color:C.faint, flexShrink:0,
  },
  modalTags: { display:'flex', gap:8, flexWrap:'wrap' },
};

// ─── Global CSS ───────────────────────────────────────────────────────────────

const css = `
  * { box-sizing: border-box; }

  /* Reset browser default button background */
  button { -webkit-appearance: none; appearance: none; }
  .topic-btn { background-color: transparent !important; }
  .topic-btn.active { background-color: ${C.gold} !important; }

  .topic-btn:hover:not(.active) {
    background-color: rgba(255,255,255,0.09) !important;
    color: rgba(255,255,255,0.85) !important;
  }

  .series-card:hover {
    transform: translateY(-6px) !important;
    box-shadow: 0 20px 48px rgba(0,0,0,0.28) !important;
  }

  .book-card:hover {
    transform: translateY(-4px) !important;
    box-shadow: 0 12px 32px rgba(0,0,0,0.18) !important;
  }

  .lesson-thumb-card:hover {
    transform: translateY(-4px) !important;
    box-shadow: 0 12px 28px rgba(0,0,0,0.16) !important;
  }

  .lesson-thumb-card:hover .thumb-play-overlay {
    opacity: 1 !important;
  }

  .lesson-row:hover {
    background-color: ${C.cream} !important;
  }

  .back-btn:hover {
    background-color: ${C.cream} !important;
    color: ${C.navy} !important;
    border-color: ${C.navy} !important;
  }

  .filter-btn:hover:not(.active) {
    background-color: rgba(255,255,255,0.22) !important;
    color: #fff !important;
  }

  .share-btn:hover { background-color: ${C.cream} !important; color: ${C.navy} !important; }

  .bavua-search::placeholder { color: rgba(255,255,255,0.45); }
  .bavua-search:focus { outline: none; }

  /* Mobile topic strip */
  .mobile-topic-btn { background-color: transparent !important; }
  .mobile-topic-btn.active { background-color: ${C.gold} !important; border-color: ${C.gold} !important; }
  .mobile-topic-btn:hover:not(.active) {
    background-color: rgba(255,255,255,0.12) !important;
    color: rgba(255,255,255,0.9) !important;
  }

  /* Hide scrollbars on mobile strips */
  .mobile-topic-strip::-webkit-scrollbar { display: none; }
  .mobile-topic-strip { scrollbar-width: none; -ms-overflow-style: none; }
  .filter-strip::-webkit-scrollbar { display: none; }
  .filter-strip { scrollbar-width: none; -ms-overflow-style: none; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius:10px; }
`;
