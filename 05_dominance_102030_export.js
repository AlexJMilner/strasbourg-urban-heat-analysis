// INPUTS
var quartiers = ee.FeatureCollection(
  'projects/strasbourg-eco-resilience/assets/strasbourg-15-quartiers'
);

var treesFinal = ee.FeatureCollection(
  'projects/strasbourg-eco-resilience/assets/patrimoine_arbore_taxa_family_v5'
).filter(ee.Filter.and(
  ee.Filter.neq('genus', 'non'),
  ee.Filter.neq('genus', 'Unknown'),
  ee.Filter.neq('family', 'Unknown')
));

// HELPERS

function safeMax(hist, n) {
  hist = ee.Dictionary(hist);
  var vals = ee.List(hist.values());
  return ee.Number(ee.Algorithms.If(
    ee.Number(n).gt(0).and(vals.size().gt(0)),
    ee.Number(vals.reduce(ee.Reducer.max())),
    0
  ));
}

function safeTop(hist, n) {
  hist = ee.Dictionary(hist);
  var keys = ee.List(hist.keys());
  var vals = ee.List(hist.values());

  return ee.String(ee.Algorithms.If(
    ee.Number(n).gt(0).and(vals.size().gt(0)),
    keys.get(vals.indexOf(vals.reduce(ee.Reducer.max()))),
    'None'
  ));
}

// 10–20–30 AUDIT

var audit102030 = quartiers.map(function(q) {
  var local = treesFinal.filterBounds(q.geometry());
  var n = ee.Number(local.size());

  var hSpecies = ee.Dictionary(local.aggregate_histogram('species_clean'));
  var hGenus   = ee.Dictionary(local.aggregate_histogram('genus'));
  var hFamily  = ee.Dictionary(local.aggregate_histogram('family'));

  var sMax = safeMax(hSpecies, n);
  var gMax = safeMax(hGenus, n);
  var fMax = safeMax(hFamily, n);

  var sPct = ee.Number(ee.Algorithms.If(n.gt(0), sMax.divide(n).multiply(100), 0));
  var gPct = ee.Number(ee.Algorithms.If(n.gt(0), gMax.divide(n).multiply(100), 0));
  var fPct = ee.Number(ee.Algorithms.If(n.gt(0), fMax.divide(n).multiply(100), 0));

  var fail10 = sPct.gt(10);
  var fail20 = gPct.gt(20);
  var fail30 = fPct.gt(30);

  var risk = ee.Number(fail10).add(fail20).add(fail30);

  // IMPORTANT FIX 26-01: force a non-null geometry for export safety
  var geom = q.geometry().centroid(1); // 1 meter maxError

  return ee.Feature(geom).set({
    q_id: q.get('libelle'),
    tree_total: n,

    top_species: safeTop(hSpecies, n),
    top_species_pct: sPct,

    top_genus: safeTop(hGenus, n),
    top_genus_pct: gPct,

    top_family: safeTop(hFamily, n),
    top_family_pct: fPct,

    fail_10_species: fail10,
    fail_20_genus: fail20,
    fail_30_family: fail30,

    risk_score: risk
  });
});

// Check

print('Audit size (should be 15):', audit102030.size());

var checks = audit102030.map(function(q) {
  return q.set({
    check_species_pct_le_100: ee.Number(q.get('top_species_pct')).lte(100),
    check_genus_pct_le_100:   ee.Number(q.get('top_genus_pct')).lte(100),
    check_family_pct_le_100:  ee.Number(q.get('top_family_pct')).lte(100)
  });
});
print('Pct checks (should be all true):', checks.aggregate_array('check_species_pct_le_100'));

Export.table.toAsset({
  collection: audit102030,
  description: 'export_quartiers_audit_102030_final',
  assetId: 'projects/strasbourg-eco-resilience/assets/quartiers_audit_102030_final'
});