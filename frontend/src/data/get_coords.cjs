const fs = require('fs');
const files = ['hsr_layout.geojson', 'sarjapura.geojson', 'whitefield.geojson', 'hebbal.geojson', 'marathhalli.geojson', 'bellanduru.geojson'];
files.forEach(f => {
  try {
    const data = JSON.parse(fs.readFileSync('d:/unisys/ADEO_UIP17/frontend/src/data/' + f));
    console.log('File:', f);
    const points = [];
    for (let feature of data.features) {
      if (feature.geometry && feature.geometry.type === 'Point') {
        points.push(feature.geometry.coordinates);
      } else if (feature.geometry && feature.geometry.type === 'Polygon') {
        points.push(feature.geometry.coordinates[0][0]);
      } else if (feature.geometry && feature.geometry.type === 'LineString') {
        points.push(feature.geometry.coordinates[0]);
      }
      if (points.length >= 3) break;
    }
    points.forEach(p => console.log(`[${p[1].toFixed(4)}, ${p[0].toFixed(4)}]`));
  } catch(e) { console.error(e.message); }
});
