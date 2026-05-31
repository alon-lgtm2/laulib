import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ─── Dev data (used when no postMessage arrives from Wix) ─────────────────────

// Solid-colour placeholder book cover (DEV preview only).
const cover = (c) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='%23${c}'/%3E%3C/svg%3E`;

const DEV_DATA = {
  topics: [
    { _id: 't1', title: 'רמב"ן', sortOrder: 1 },
    { _id: 't2', title: 'תורה ומחשבה', sortOrder: 2 },
    { _id: 't3', title: 'פרשת השבוע', sortOrder: 3 },
    { _id: 't4', title: 'פסח ומועדים', sortOrder: 4 },
    { _id: 't5', title: 'ספרים', sortOrder: 5 },
  ],
  series: [
    { _id: 's1', title: 'שיעורי רמב"ן על התורה', subtitle: 'מחזור א׳', topic: 't1', mediaType: 'video', sortOrder: 1 },
    { _id: 's2', title: 'רמב"ן על הגלות והגאולה', topic: 't1', mediaType: 'audio', sortOrder: 2 },
    { _id: 's3', title: 'פילוסופיה יהודית', topic: 't2', mediaType: 'video', sortOrder: 1 },
    { _id: 's4', title: 'ספר בראשית — מעמקים', topic: 't3', mediaType: 'audio', sortOrder: 1 },
    { _id: 's5', title: 'ספר שמות — חירות ואמונה', topic: 't3', mediaType: 'audio', sortOrder: 2 },
    { _id: 's6', title: 'הגדה של פסח — לעומק', topic: 't4', mediaType: 'video', sortOrder: 1 },
    { _id: 's7', title: 'ספרים נבחרים', topic: 't5', mediaType: 'book', sortOrder: 1 },
  ],
  lessons: [
    { _id: 'l1', title: 'בראשית — בחינת הבריאה לפי הרמב"ן', series: 's1', topic: 't1', mediaType: 'video', duration: 68, tags: ['בריאה', 'רמב"ן'], videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', sortOrder: 1 },
    { _id: 'l2', title: 'נח ותיקון העולם — שיעור שמע', series: 's1', topic: 't1', mediaType: 'audio', duration: 54, tags: ['נח', 'תיקון'], videoUrl: 'https://static.wixstatic.com/mp3/example.mp3', sortOrder: 2 },
    { _id: 'l3', title: 'עקדת יצחק — מאמר להורדה (PDF)', series: 's1', topic: 't1', mediaType: 'book', duration: 0, tags: ['עקידה', 'אמונה'], externalUrl: 'https://example.com/akeda.pdf', sortOrder: 3 },
    { _id: 'l4', title: 'הגלות כתיקון — מבט הרמב"ן', series: 's2', topic: 't1', mediaType: 'audio', duration: 45, tags: ['גלות', 'גאולה'], sortOrder: 1 },
    { _id: 'l5', title: 'ארץ ישראל בהגות הרמב"ן', series: 's2', topic: 't1', mediaType: 'audio', duration: 38, tags: ['ארץ ישראל'], sortOrder: 2 },
    { _id: 'l6', title: 'מהו ספר — בין כתב לרוח', series: 's3', topic: 't2', mediaType: 'video', duration: 50, sortOrder: 1 },
    { _id: 'l7', title: 'בראשית ברא — פשט ודרש', series: 's4', topic: 't3', mediaType: 'audio', duration: 42, sortOrder: 1 },
    { _id: 'l8', title: 'קין והבל — אחריות האדם', series: 's4', topic: 't3', mediaType: 'audio', duration: 39, sortOrder: 2 },
    { _id: 'l9', title: 'שמות — שם ומהות', series: 's5', topic: 't3', mediaType: 'audio', duration: 44, sortOrder: 1 },
    { _id: 'l10', title: 'ליל הסדר — סדר הזמן', series: 's6', topic: 't4', mediaType: 'video', duration: 61, sortOrder: 1 },
    { _id: 'l11', title: 'שמונה נביאים', subtitle: 'מהדורה מבוארת', series: 's7', topic: 't5', coverImage: cover('1B3F6A'), externalUrl: 'https://example.com', sortOrder: 1 },
    { _id: 'l12', title: 'תהילים', subtitle: 'עם פירוש', series: 's7', topic: 't5', coverImage: cover('7C3AED'), externalUrl: 'https://example.com', sortOrder: 2 },
    { _id: 'l13', title: 'משלי שלמה', series: 's7', topic: 't5', coverImage: cover('B8873A'), externalUrl: 'https://example.com', sortOrder: 3 },
    { _id: 'l14', title: 'ספר איוב', subtitle: 'עיון', series: 's7', topic: 't5', coverImage: cover('059669'), externalUrl: 'https://example.com', sortOrder: 4 },
    { _id: 'l15', title: 'קהלת', series: 's7', topic: 't5', coverImage: cover('2563EB'), externalUrl: 'https://example.com', sortOrder: 5 },
    { _id: 'l16', title: 'ישעיהו', subtitle: 'נבואות', series: 's7', topic: 't5', coverImage: cover('DC2626'), externalUrl: 'https://example.com', sortOrder: 6 },
    { _id: 'l17', title: 'ירמיהו', series: 's7', topic: 't5', coverImage: cover('0E7490'), externalUrl: 'https://example.com', sortOrder: 7 },
    { _id: 'l18', title: 'שיר השירים', subtitle: 'מבואר', series: 's7', topic: 't5', coverImage: cover('9333EA'), externalUrl: 'https://example.com', sortOrder: 8 },
  ],
};

// ─── Root component — bridges postMessage into React state ────────────────────

function Root() {
  // DEV-only: render local mock data so `npm run dev` is never blank.
  // In production builds (import.meta.env.DEV === false) this stays null and
  // data arrives via the Wix postMessage bridge exactly as before.
  const [data, setData] = useState(import.meta.env.DEV ? DEV_DATA : null);

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
