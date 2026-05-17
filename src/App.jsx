import { useState, useEffect, useRef } from 'react';
import { trackEvent } from './analytics.js';

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

  // Audio file (by extension or Wix CDN audio path)
  if (/\.(mp3|m4a|ogg|wav|aac|flac)(\?|#|$)/i.test(u) || /wixstatic\.com\/mp3\//i.test(u))
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
  const searchDebounceRef = useRef(null);

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
    return lessons.filter(l =>
      sids.includes(l.series) || (l.multireference || []).some(ref => sids.includes(ref._id || ref))
    ).length;
  }

  function goTopic(tid) {
    const topicSeries = series.filter(s => s.topic === tid);
    trackEvent('topic_view', { topic_name: topics.find(t => t._id === tid)?.title, topic_id: tid });
    setTopicId(tid);
    setSeriesId(topicSeries.length === 1 ? topicSeries[0]._id : null);
    setQuery('');
  }

  function shareLesson(lesson, e) {
    e.stopPropagation();
    trackEvent('share', { content_type: 'lesson', item_id: lesson._id, lesson_title: lesson.title });
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

  function handleSearchChange(e) {
    const val = e.target.value;
    setQuery(val);
    setSeriesId(null);
    clearTimeout(searchDebounceRef.current);
    if (val.trim()) {
      searchDebounceRef.current = setTimeout(() => {
        trackEvent('search', { search_term: val.trim() });
      }, 1000);
    }
  }

  if (!data) return null;

  const inLessons     = !!seriesId || !!query;
  const currentSeries = series.find(s => s._id === seriesId);

  const visibleSeries = series
    .filter(s => s.topic === topicId);

  const visibleLessons = seriesId
    ? lessons.filter(l => l.series === seriesId || (l.multireference || []).some(ref => (ref._id || ref) === seriesId))
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
    <div dir="rtl" style={{ ...s.root, flexDirection: 'column', minHeight: isMobile ? 0 : 600 }}>
      <style>{css}</style>

      {/* ── Mobile: brand + topic strip ── */}
      {isMobile && <MobileTopicStrip />}

      {/* ── Hero — full width ── */}
      {!isMobile && (
        <header style={{ ...s.hero, padding: '36px 36px 28px' }}>
          <h1 style={{ ...s.heroTitle, fontSize: 28 }}>ספריית התוכן של הרב בני</h1>
          <p style={{ ...s.heroSub, fontSize: 16 }}>שיעורים, מאמרים והרצאות</p>
          <p style={{ ...s.heroDesc, fontSize: 13 }}>חיפוש לפי נושאים, סוגי תוכן וסדרות הלימוד</p>
          <p style={{ ...s.heroTagline, fontSize: 12 }}>פתוח וחינמי · לכל מי שמבקש ללמוד</p>
        </header>
      )}

      {/* ── Body: sidebar + main ── */}
      <div style={{ display:'flex', flex:1, minHeight:0, flexDirection: isMobile ? 'column' : 'row' }}>

      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <aside style={s.sidebar}>
          <nav style={s.topicNav} className="bavua-dark-scroll">
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

        {/* Mobile hero */}
        {isMobile && (
          <header style={{ ...s.hero, padding: '28px 20px 22px' }}>
            <h1 style={{ ...s.heroTitle, fontSize: 22 }}>ספריית התוכן של הרב בני</h1>
            <p style={{ ...s.heroSub, fontSize: 14 }}>שיעורים, מאמרים והרצאות</p>
            <p style={{ ...s.heroDesc, fontSize: 12 }}>חיפוש לפי נושאים, סוגי תוכן וסדרות הלימוד</p>
            <p style={{ ...s.heroTagline, fontSize: 11 }}>פתוח וחינמי · לכל מי שמבקש ללמוד</p>
            <div style={{ ...s.searchWrap, marginTop: 14 }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{flexShrink:0}}>
                <circle cx="9" cy="9" r="6" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
                <path d="M14 14l3 3" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input className="bavua-search" style={s.searchInput} type="text"
                placeholder="חפש בספריה..." value={query}
                onChange={handleSearchChange}
              />
              {query && <button className="clear-btn" style={s.clearBtn} onClick={() => setQuery('')}>✕</button>}
            </div>
          </header>
        )}

        {/* Search bar — desktop only, left side */}
        {!isMobile && (
          <div style={s.mainSearch}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" style={{flexShrink:0}}>
              <circle cx="9" cy="9" r="6" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
              <path d="M14 14l3 3" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              className="bavua-search"
              style={{ ...s.searchInput, fontSize: 14 }}
              type="text"
              placeholder="חפש בספריה..."
              value={query}
              onChange={handleSearchChange}
            />
            {query && (
              <button className="clear-btn" style={s.clearBtn} onClick={() => setQuery('')}>✕</button>
            )}
          </div>
        )}

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
              <ScrollPanel fadeColor="255,255,255">
              {visibleLessons.some(l => l.coverImage) ? (

                /* ── Book grid ── */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(108px, 1fr))',
                  gap: isMobile ? 10 : 14,
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
                      onClick={() => trackEvent('book_click', { book_title: lesson.title, book_id: lesson._id })}
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

                /* ── Lesson list ── */
                <div style={{ padding: isMobile ? '10px 12px 16px' : 0 }}>
                  {visibleLessons.length === 0 && (
                    <Empty text="לא נמצאו שיעורים" dark={false} />
                  )}
                  {visibleLessons.map(lesson => {
                    const thumb = ytThumb(lesson.videoUrl);
                    const isYoutube = !!thumb;
                    const detectedMedia = !isYoutube ? detectMedia(lesson.videoUrl) : null;
                    const isAudio = !isYoutube && detectedMedia?.type === 'audio';
                    const isVideo = !isYoutube && detectedMedia?.type === 'video';
                    const isPdf = !isYoutube && !isAudio && !isVideo && lesson.externalUrl && /\.pdf(\?|$)/i.test(lesson.externalUrl);
                    const isWebArticle = !isYoutube && !isAudio && !isVideo && lesson.externalUrl && !isPdf;

                    const handleClick = () => {
                      const mediaType = isYoutube ? 'youtube'
                        : isAudio ? 'audio'
                        : isVideo ? 'video'
                        : isPdf ? 'pdf'
                        : isWebArticle ? 'article'
                        : 'unknown';
                      trackEvent('lesson_open', { lesson_title: lesson.title, lesson_id: lesson._id, media_type: mediaType });
                      if (isWebArticle) window.open(lesson.externalUrl, '_blank', 'noopener,noreferrer');
                      else if (lesson.videoUrl || lesson.externalUrl) setSelectedLesson(lesson);
                    };

                    const iconBg = (isYoutube || isVideo) ? C.navy
                      : isAudio ? '#1A6FA8'
                      : isPdf ? C.gold
                      : '#8B9099';

                    const iconSvg = (isYoutube || isVideo) ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    ) : isAudio ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                      </svg>
                    ) : isPdf ? (
                      <svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    );

                    return (
                      <div
                        key={lesson._id}
                        className="lesson-row"
                        style={{
                          ...s.lessonRow,
                          padding: isMobile ? '12px 16px' : '14px 24px',
                          cursor: (lesson.videoUrl || lesson.externalUrl) ? 'pointer' : 'default',
                        }}
                        onClick={handleClick}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          backgroundColor: iconBg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, marginTop: 1,
                        }}>
                          {iconSvg}
                        </div>
                        <div style={s.lessonBody}>
                          <span style={{ ...s.lessonTitle, fontSize: isMobile ? 14 : 15 }}>{lesson.title}</span>
                          {lesson.subtitle && <p style={s.lessonSubtitle}>{lesson.subtitle}</p>}
                          {!isMobile && lesson.description && (
                            <p style={s.lessonDesc}>{lesson.description}</p>
                          )}
                          {(lesson.duration || (lesson.tags||[]).length > 0) && (
                            <div style={{ ...s.chips, marginTop: 2 }}>
                              {lesson.duration && (
                                <span style={s.chipGray}>⏱ {formatDuration(lesson.duration)}</span>
                              )}
                              {(lesson.tags||[]).slice(0,2).map(tag => (
                                <span key={tag} style={s.chipTag}>{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              )}
              </ScrollPanel>
            </div>
          </div>

        ) : (

          /* ── Series grid ── */
          <ScrollPanel fadeColor="74,113,255" style={{ flex: 1 }}>
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
              const count = lessons.filter(l => l.series === ser._id || (l.multireference || []).some(ref => (ref._id || ref) === ser._id)).length;
              return (
                <div
                  key={ser._id}
                  className="series-card"
                  style={s.seriesCard}
                  onClick={() => {
                    trackEvent('series_open', { series_title: ser.title, series_id: ser._id, topic: topics.find(t => t._id === topicId)?.title });
                    setSeriesId(ser._id);
                  }}
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
          </ScrollPanel>
        )}
      </main>

      </div>{/* end body */}

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
                <button style={s.closeBtn} onClick={() => setSelectedLesson(null)}>✕</button>
              </div>

              <h2 style={{ ...s.modalTitle, fontSize: isMobile ? 18 : 21 }}>{selectedLesson.title}</h2>
              {selectedLesson.subtitle && (
                <p style={s.lessonSubtitle}>{selectedLesson.subtitle}</p>
              )}
              {selectedLesson.description && (
                <p style={s.modalDescription}>{selectedLesson.description}</p>
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
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(detected.src)}&embedded=true`}
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

// ─── ScrollPanel — fade shadows + nav buttons ─────────────────────────────────

function ScrollPanel({ children, fadeColor = '255,255,255', style }) {
  const ref = useRef(null);
  const [canUp,   setCanUp]   = useState(false);
  const [canDown, setCanDown] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanUp(el.scrollTop > 8);
    setCanDown(el.scrollTop < el.scrollHeight - el.clientHeight - 8);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, []);

  const scroll = dir => ref.current?.scrollBy({ top: dir * 240, behavior: 'smooth' });
  const fadeT = `linear-gradient(to bottom, rgb(${fadeColor}) 0%, rgba(${fadeColor},0) 100%)`;
  const fadeB = `linear-gradient(to top,    rgb(${fadeColor}) 0%, rgba(${fadeColor},0) 100%)`;

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', ...style }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 52, zIndex: 10,
        pointerEvents: 'none', background: fadeT,
        opacity: canUp ? 1 : 0, transition: 'opacity 0.25s',
      }} />
      <div ref={ref} style={{ height: '100%', overflowY: 'auto' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 68, zIndex: 10,
        pointerEvents: 'none', background: fadeB,
        opacity: canDown ? 1 : 0, transition: 'opacity 0.25s',
      }} />
      {(canUp || canDown) && (
        <div style={{
          position: 'absolute', right: 12, bottom: 12, zIndex: 20,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {[
            { dir: -1, active: canUp,   label: 'גלול למעלה', d: 'M4 10l4-4 4 4' },
            { dir:  1, active: canDown, label: 'גלול למטה',  d: 'M4 6l4 4 4-4'  },
          ].map(({ dir, active, label, d }) => (
            <button
              key={dir}
              className="scroll-nav-btn"
              disabled={!active}
              onClick={() => active && scroll(dir)}
              aria-label={label}
              style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none',
                backgroundColor: active ? 'rgba(27,63,106,0.85)' : 'rgba(27,63,106,0.18)',
                color: active ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: active ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? '0 2px 10px rgba(0,0,0,0.25)' : 'none',
                transition: 'all 0.18s', fontFamily: 'inherit',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d={d} stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
      )}
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

  // ── Hero header ──
  hero: {
    backgroundColor: SITE_BLUE,
    flexShrink: 0,
    display: 'flex', flexDirection: 'column', gap: 6,
    borderBottom: '1px solid rgba(255,255,255,0.12)',
  },
  heroTitle: {
    color: C.white, fontWeight: 800, margin: 0, lineHeight: 1.2,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.9)', fontWeight: 600, margin: 0, lineHeight: 1.5,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5,
  },
  heroTagline: {
    color: C.gold, fontWeight: 600, margin: 0, letterSpacing: '0.5px',
  },

  // ── Main search bar ──
  mainSearch: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 22px',
    backgroundColor: 'transparent',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    flexShrink: 0,
  },
  searchWrap: {
    display:'flex', alignItems:'center', gap:8,
    flex:1, maxWidth:400,
    backgroundColor:'transparent',
    border:'1.5px solid rgba(255,255,255,0.55)',
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
    alignContent:'start',
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
    display:'flex', alignItems:'flex-start', gap:14,
    padding:'14px 24px', borderRadius:0, cursor:'pointer',
    transition:'background 0.15s, box-shadow 0.15s',
    borderBottom:`1px solid ${C.border}`,
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
  lessonDesc: {
    fontSize:12, color:C.faint, margin:'4px 0 0', lineHeight:1.55,
    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
  },
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
  modalDescription: {
    fontSize:14, color:C.muted, lineHeight:1.7,
    margin:0, whiteSpace:'pre-wrap',
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
  .topic-btn { background-color: transparent !important; outline: none !important; }
  .topic-btn:focus { outline: none !important; }
  .mobile-topic-btn:focus { outline: none !important; }
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
    box-shadow: inset -3px 0 0 ${C.gold} !important;
  }

  .lesson-row:last-child {
    border-bottom: none !important;
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

  ::-webkit-scrollbar { width: 7px; }
  ::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
  ::-webkit-scrollbar-thumb { background: rgba(27,63,106,0.3); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(27,63,106,0.58); }

  /* Sidebar (dark surface) scrollbar */
  .bavua-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); }
  .bavua-dark-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.45); }

  /* Scroll nav buttons */
  .scroll-nav-btn:hover:not(:disabled) {
    transform: scale(1.12) !important;
    box-shadow: 0 4px 14px rgba(0,0,0,0.35) !important;
  }
`;
