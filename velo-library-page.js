/**
 * ספריית התוכן — Velo Page Code
 * Paste this into the Wix Studio page code editor (Dev Mode)
 */

import wixData from 'wix-data';

// ─── State ────────────────────────────────────────────────────────────────────

let allTopics  = [];
let allSeries  = [];
let allLessons = [];
let selectedTopicId  = null;
let selectedSeriesId = null;
let searchQuery = '';

// ─── Init ─────────────────────────────────────────────────────────────────────

$w.onReady(async function () {
  await loadData();
  setupSeriesRepeater();
  setupLessonsRepeater();
  renderTopics();
  if (allTopics.length > 0) selectTopic(allTopics[0]._id);
  setupSearch();
  setupFilters();
});

// ─── Data ─────────────────────────────────────────────────────────────────────

async function loadData() {
  const [t, s, l] = await Promise.all([
    wixData.query('Topics').ascending('sortOrder').find(),
    wixData.query('Series').ascending('sortOrder').find(),
    wixData.query('Lessons').eq('isPublished', true).ascending('sortOrder').find(),
  ]);
  allTopics  = t.items;
  allSeries  = s.items;
  allLessons = l.items;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function show(id) { try { $w(id).show(); } catch(e) {} }
function hide(id) { try { $w(id).hide(); } catch(e) {} }
function setText(id, val) { try { $w(id).text = String(val || ''); } catch(e) {} }

function lessonCountForTopic(topicId) {
  const ids = allSeries.filter(s => s.topic === topicId).map(s => s._id);
  return allLessons.filter(l => ids.includes(l.series)).length;
}

function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')} ש'` : `${m} דק'`;
}

function mediaLabel(type) {
  return { video: 'וידאו', audio: 'שמע', book: 'ספר', article: 'מאמר' }[type] || type || '';
}

// ─── Topics sidebar ───────────────────────────────────────────────────────────

function renderTopics() {
  $w('#topicsRepeater').data = allTopics.map(topic => ({
    _id:   topic._id,
    title: topic.title,
    count: String(lessonCountForTopic(topic._id)),
  }));

  $w('#topicsRepeater').onItemReady(($item, data) => {
    $item('#topicName').text  = data.title;
    $item('#topicCount').text = data.count;
    $item('#topicName').onClick(() => selectTopic(data._id));
    $item('#topicCount').onClick(() => selectTopic(data._id));
  });
}

function selectTopic(topicId) {
  selectedTopicId  = topicId;
  selectedSeriesId = null;
  searchQuery = '';
  try { $w('#searchInput').value = ''; } catch(e) {}
  highlightActiveTopic(topicId);
  showSeriesView();
}

function highlightActiveTopic(topicId) {
  $w('#topicsRepeater').forEachItem(($item, data) => {
    $item('#topicName').style.color = data._id === topicId ? '#1B3F6A' : '#1C1C1C';
  });
}

// ─── Series grid ──────────────────────────────────────────────────────────────

function setupSeriesRepeater() {
  try {
    $w('#seriesRepeater').onItemReady(($item, data) => {
      try { $item('#seriesName').text = data.title; } catch(e) {}
      try { $item('#seriesSub').text  = data.subtitle; } catch(e) {}
      try { $item('#seriesType').text = data.mediaLabel; } catch(e) {}
      try { $item('#seriesNum').text  = data.lessonCount; } catch(e) {}
      try { $item('#seriesName').onClick(() => selectSeries(data._id)); } catch(e) {}
      try { $item('#seriesNum').onClick(() => selectSeries(data._id)); } catch(e) {}
    });
  } catch(e) {}
}

function showSeriesView() {
  show('#seriesRepeater');
  hide('#lessonsRepeater');
  hide('#backButton');
  hide('#seriesHeaderTitle');

  $w('#seriesRepeater').data = allSeries
    .filter(s => s.topic === selectedTopicId)
    .map(s => ({
      _id:         s._id,
      title:       s.title,
      subtitle:    s.subtitle || '',
      mediaLabel:  mediaLabel(s.mediaType),
      lessonCount: String(allLessons.filter(l => l.series === s._id).length) + ' שיעורים',
    }));
}

// ─── Lessons list ─────────────────────────────────────────────────────────────

function setupLessonsRepeater() {
  try {
    $w('#lessonsRepeater').onItemReady(($item, data) => {
      try { $item('#lessonIndex').text    = data.index; } catch(e) {}
      try { $item('#lessonTitle').text    = data.title; } catch(e) {}
      try { $item('#lessonMedia').text    = data.media; } catch(e) {}
      try { $item('#lessonDuration').text = data.duration; } catch(e) {}
      try { $item('#lessonTags').text     = data.tags; } catch(e) {}
    });
  } catch(e) {}
}

function selectSeries(seriesId) {
  selectedSeriesId = seriesId;
  showLessonsView(allLessons.filter(l => l.series === seriesId));
}

function showLessonsView(lessons) {
  const series = allSeries.find(s => s._id === selectedSeriesId);

  hide('#seriesRepeater');
  show('#lessonsRepeater');
  show('#backButton');
  setText('#seriesHeaderTitle', series ? series.title : '');
  show('#seriesHeaderTitle');

  $w('#lessonsRepeater').data = lessons.map((l, i) => ({
    _id:      l._id,
    index:    String(i + 1),
    title:    l.title,
    media:    mediaLabel(l.mediaType),
    duration: formatDuration(l.duration),
    tags:     (l.tags || []).slice(0, 2).join(' · '),
  }));
}

// ─── Back ─────────────────────────────────────────────────────────────────────

export function backButton_click() {
  selectedSeriesId = null;
  showSeriesView();
}

// ─── Search ───────────────────────────────────────────────────────────────────

function setupSearch() {
  try {
    $w('#searchInput').onInput(event => {
      searchQuery = event.target.value.trim().toLowerCase();
      if (!searchQuery) {
        if (selectedSeriesId) showLessonsView(allLessons.filter(l => l.series === selectedSeriesId));
        else showSeriesView();
        return;
      }
      const results = allLessons.filter(l =>
        l.title?.toLowerCase().includes(searchQuery) ||
        (l.tags || []).some(t => t.toLowerCase().includes(searchQuery)) ||
        l.description?.toLowerCase().includes(searchQuery)
      );
      selectedSeriesId = null;
      showLessonsView(results);
      show('#backButton');
      setText('#seriesHeaderTitle', `תוצאות עבור "${event.target.value}"`);
      show('#seriesHeaderTitle');
    });
  } catch(e) {}
}

// ─── Media type filter buttons ────────────────────────────────────────────────

function setupFilters() {
  const filters = ['#filterAll', '#filterVideo', '#filterAudio', '#filterBook'];
  const types   = ['all', 'video', 'audio', 'book'];

  filters.forEach((id, i) => {
    try {
      $w(id).onClick(() => {
        const type = types[i];
        filters.forEach((fid, fi) => {
          try {
            $w(fid).style.backgroundColor = fi === i ? '#1B3F6A' : '#FFFFFF';
            $w(fid).style.color           = fi === i ? '#FFFFFF' : '#1C1C1C';
          } catch(e) {}
        });
        const filtered = type === 'all'
          ? allSeries.filter(s => s.topic === selectedTopicId)
          : allSeries.filter(s => s.topic === selectedTopicId && s.mediaType === type);
        show('#seriesRepeater');
        hide('#lessonsRepeater');
        $w('#seriesRepeater').data = filtered.map(s => ({
          _id:         s._id,
          title:       s.title,
          subtitle:    s.subtitle || '',
          mediaLabel:  mediaLabel(s.mediaType),
          lessonCount: String(allLessons.filter(l => l.series === s._id).length) + ' שיעורים',
        }));
      });
    } catch(e) {}
  });
}
