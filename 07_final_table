// 1. LOAD ASSETS
var divReal = ee.FeatureCollection('projects/strasbourg-eco-resilience/assets/species_clean_real');
var treesV5 = ee.FeatureCollection('projects/strasbourg-eco-resilience/assets/patrimoine_arbore_taxa_family_v5');
var lst = ee.FeatureCollection('projects/strasbourg-eco-resilience/assets/quartiers_LST_Landsat8-9_2022-2024_summer');
var audit = ee.FeatureCollection('projects/strasbourg-eco-resilience/assets/quartiers_audit_102030_final');
var quartiers = ee.FeatureCollection('projects/strasbourg-eco-resilience/assets/strasbourg-15-quartiers');

// 2. PROCESS TOP TAXA AND METADATA
var topTaxaStats = quartiers.map(function(q) {
  var q_id = q.get('libelle');
  var localTrees = treesV5.filterBounds(q.geometry());
  var total = localTrees.size();
  
  var getTop = function(colName, ignoreVal) {
    var valid = localTrees.filter(ee.Filter.neq(colName, ignoreVal));
    var hist = ee.Dictionary(valid.aggregate_histogram(colName));
    var sorted = hist.keys().sort(hist.values()).reverse();
    var name = ee.String(ee.Algorithms.If(sorted.size().gt(0), sorted.get(0), 'N/A'));
    var count = ee.Number(ee.Algorithms.If(sorted.size().gt(0), hist.get(name), 0));
    var pct = ee.Number(ee.Algorithms.If(total.gt(0), count.divide(total).multiply(100), 0));
    return [name, pct];
  };

  return ee.Feature(null, {
    'q_id': q_id,
    'nom': q.get('nom'),
    'tree_total': total,
    'top_species': getTop('species_clean', 'Unknown')[0],
    'top_species_pct': getTop('species_clean', 'Unknown')[1],
    'top_genus': getTop('genus', 'Unknown')[0],
    'top_genus_pct': getTop('genus', 'Unknown')[1],
    'top_family': getTop('family', 'Unknown')[0],
    'top_family_pct': getTop('family', 'Unknown')[1]
  });
});

// 3. JOINING & RENAMING FIX
var completeTable = ee.FeatureCollection(ee.Join.inner().apply({
  primary: divReal,
  secondary: topTaxaStats,
  condition: ee.Filter.equals({leftField: 'q_id', rightField: 'q_id'})
})).map(function(f) {
  var p = ee.Feature(f.get('primary'));
  var s = ee.Feature(f.get('secondary'));
  return p.set(s.toDictionary())
          .set('simpson', p.get('simpson_1mD')); 
});

// Join LST and Audit
function joinAdditional(primary, secondary) {
  return ee.FeatureCollection(ee.Join.inner().apply({
    primary: primary,
    secondary: secondary,
    condition: ee.Filter.equals({leftField: 'q_id', rightField: 'q_id'})
  })).map(function(f) {
    return ee.Feature(f.get('primary')).set(ee.Feature(f.get('secondary')).toDictionary());
  });
}

completeTable = joinAdditional(completeTable, lst);
completeTable = joinAdditional(completeTable, audit);

// 4. JOIN TO QUARTIERS POLYGONS 
var finalWithGeometry = ee.Join.inner().apply({
  primary: completeTable,
  secondary: quartiers,
  condition: ee.Filter.equals({leftField: 'q_id', rightField: 'libelle'})
}).map(function(f) {
  var tableData = ee.Feature(f.get('primary'));
  var geometry = ee.Feature(f.get('secondary')).geometry();
  return tableData.setGeometry(geometry);
});

// 5. FINAL EXPORT WITH GEOMETRY
var selectors = [
  'q_id', 'nom', 'tree_total', 'richness', 'shannon', 'simpson', 
  'top_species', 'top_species_pct', 'top_genus', 'top_genus_pct', 
  'top_family', 'top_family_pct', 'lst_mean_c', 'risk_score'
];

Export.table.toDrive({
  collection: ee.FeatureCollection(finalWithGeometry),
  description: 'Strasbourg_Final_With_Geometry_V7',
  fileFormat: 'GeoJSON',
  selectors: selectors
});