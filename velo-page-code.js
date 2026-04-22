import wixData from 'wix-data';

$w.onReady(async function () {
  try {
    const [topicsRes, seriesRes, lessonsRes] = await Promise.all([
      wixData.query('Topics').ascending('sortOrder').find(),
      wixData.query('Series').ascending('sortOrder').find(),
      wixData.query('Lessons').eq('isPublished', true).ascending('sortOrder').find(),
    ]);

    $w('#library').postMessage({
      type: 'LIBRARY_DATA',
      payload: {
        topics:  topicsRes.items,
        series:  seriesRes.items,
        lessons: lessonsRes.items,
      },
    });

  } catch (err) {
    console.error('שגיאה בטעינת הספרייה:', err);
  }
});
