import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ─── Dev data (used when no postMessage arrives from Wix) ─────────────────────

const DEV_DATA = {
  topics: [
    { _id: 't1', title: 'רמב"ן', sortOrder: 1 },
    { _id: 't2', title: 'תורה ומחשבה', sortOrder: 2 },
    { _id: 't3', title: 'פרשת השבוע', sortOrder: 3 },
    { _id: 't4', title: 'פסח ומועדים', sortOrder: 4 },
  ],
  series: [
    { _id: 's1', title: 'שיעורי רמב"ן על התורה', subtitle: 'מחזור א׳', topic: 't1', mediaType: 'video', sortOrder: 1 },
    { _id: 's2', title: 'רמב"ן על הגלות והגאולה', topic: 't1', mediaType: 'audio', sortOrder: 2 },
    { _id: 's3', title: 'פילוסופיה יהודית', topic: 't2', mediaType: 'video', sortOrder: 1 },
    { _id: 's4', title: 'ספר בראשית — מעמקים', topic: 't3', mediaType: 'audio', sortOrder: 1 },
    { _id: 's5', title: 'ספר שמות — חירות ואמונה', topic: 't3', mediaType: 'audio', sortOrder: 2 },
    { _id: 's6', title: 'הגדה של פסח — לעומק', topic: 't4', mediaType: 'video', sortOrder: 1 },
  ],
  lessons: [
    { _id: 'l1', title: 'בראשית — בחינת הבריאה לפי הרמב"ן', series: 's1', topic: 't1', mediaType: 'video', duration: 68, difficulty: 'intermediate', tags: ['בריאה', 'רמב"ן'], sortOrder: 1 },
    { _id: 'l2', title: 'נח ותיקון העולם', series: 's1', topic: 't1', mediaType: 'video', duration: 54, difficulty: 'beginner', tags: ['נח', 'תיקון'], sortOrder: 2 },
    { _id: 'l3', title: 'עקדת יצחק ופרשנות הרמב"ן', series: 's1', topic: 't1', mediaType: 'video', duration: 72, difficulty: 'advanced', tags: ['עקידה', 'אמונה'], sortOrder: 3 },
    { _id: 'l4', title: 'הגלות כתיקון — מבט הרמב"ן', series: 's2', topic: 't1', mediaType: 'audio', duration: 45, tags: ['גלות', 'גאולה'], sortOrder: 1 },
    { _id: 'l5', title: 'ארץ ישראל בהגות הרמב"ן', series: 's2', topic: 't1', mediaType: 'audio', duration: 38, tags: ['ארץ ישראל'], sortOrder: 2 },
    { _id: 'l6', title: 'מהו ספר — בין כתב לרוח', series: 's3', topic: 't2', mediaType: 'video', duration: 50, sortOrder: 1 },
    { _id: 'l7', title: 'בראשית ברא — פשט ודרש', series: 's4', topic: 't3', mediaType: 'audio', duration: 42, sortOrder: 1 },
    { _id: 'l8', title: 'קין והבל — אחריות האדם', series: 's4', topic: 't3', mediaType: 'audio', duration: 39, sortOrder: 2 },
    { _id: 'l9', title: 'שמות — שם ומהות', series: 's5', topic: 't3', mediaType: 'audio', duration: 44, sortOrder: 1 },
    { _id: 'l10', title: 'ליל הסדר — סדר הזמן', series: 's6', topic: 't4', mediaType: 'video', duration: 61, sortOrder: 1 },
  ],
};

// ─── Root component — bridges postMessage into React state ────────────────────

function Root() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      if (event.data && event.data.type === 'LIBRARY_DATA') {
        setData(event.data.payload);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return <App data={data} />;
}

// ─── Mount ────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
