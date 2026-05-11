import wixData from 'wix-data';

// Wix stores audio fields as wix:audio://v1/<fileId> — convert to CDN URL
function resolveAudioUrl(url) {
  if (!url) return url;
  const m = url.match(/^wix:audio:\/\/v1\/(.+)/);
  return m ? `https://static.wixstatic.com/mp3/${m[1]}` : url;
}

$w.onReady(async function () {
  try {
    const [topicsRes, seriesRes, lessonsRes] = await Promise.all([
      wixData.query('Topics').ascending('sortOrder').find(),
      wixData.query('Series').ascending('sortOrder').find(),
      wixData.query('Lessons').eq('isPublished', true).include('multireference').ascending('sortOrder').limit(1000).find(),
    ]);

    const resolvedLessons = lessonsRes.items.map(l => ({ ...l, videoUrl: resolveAudioUrl(l.videoUrl) }));

    $w('#library').postMessage({
      type: 'LIBRARY_DATA',
      payload: {
        topics:  topicsRes.items,
        series:  seriesRes.items,
        lessons: resolvedLessons,
      },
    });

  } catch (err) {
    console.error('שגיאה בטעינת הספרייה:', err);
  }
});
