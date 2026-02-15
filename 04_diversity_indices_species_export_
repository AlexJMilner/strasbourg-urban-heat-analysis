// INPUTS
var WORLD = ee.Geometry.Polygon(
  [[-180, 88], [0, 88], [180, 88], [180, -88], [0, -88], [-180, -88]],
  null, false
);

var Q = ee.FeatureCollection("projects/strasbourg-eco-resilience/assets/strasbourg-15-quartiers")
  .filter(ee.Filter.isContained('.geo', WORLD));   // drop any broken quartier geoms

var T = ee.FeatureCollection("projects/strasbourg-eco-resilience/assets/patrimoine_arbore_taxa_family_v5")
  .filter(ee.Filter.neq('genus','non'))
  .filter(ee.Filter.neq('genus','Unknown'))
  .filter(ee.Filter.neq('family','Unknown'));

var TAX = 'species_clean'; // or 'genus' or 'family'

// OUT (geometry forced to centroid point)
var out = Q.map(function(q){
  var fc = T.filterBounds(q.geometry());
  var n = ee.Number(fc.size());
  var h = ee.Dictionary(fc.aggregate_histogram(TAX));
  var counts = ee.List(h.values());

  var H = ee.Number(ee.Algorithms.If(n.gt(0),
    ee.Number(counts.iterate(function(c,a){
      var p = ee.Number(c).divide(n); return ee.Number(a).add(p.multiply(p.log()));
    },0)).multiply(-1), 0));

  var S = ee.Number(ee.Algorithms.If(n.gt(0),
    ee.Number(1).subtract(ee.Number(counts.iterate(function(c,a){
      var p = ee.Number(c).divide(n); return ee.Number(a).add(p.pow(2));
    },0))), 0));

  var props = ee.Dictionary({
    q_id: q.get('libelle'),
    n: n,
    richness: h.keys().size(),
    shannon: H,
    simpson_1mD: S
  });

  return ee.Feature(q.geometry().centroid(1), props); //always non-null
});

print(out);
Export.table.toAsset({
  collection: out,
  description: 'export_quartiers_diversity_final' + TAX,
  assetId: 'projects/strasbourg-eco-resilience/assets/' + TAX
});