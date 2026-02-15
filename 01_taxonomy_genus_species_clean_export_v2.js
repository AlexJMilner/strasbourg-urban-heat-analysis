// 1. ASSETS
var trees = ee.FeatureCollection("projects/strasbourg-eco-resilience/assets/patrimoine_arbore");
var quartiers = ee.FeatureCollection("projects/strasbourg-eco-resilience/assets/strasbourg-15-quartiers");

// 2. CREATE GENUS AND CLEAN BIOLOGICAL SPECIES COLUMNS
var treesWithTaxa = trees.map(function(f) {
  var raw = f.get('si_essence');
  var s = ee.String(ee.Algorithms.If(raw, raw, '')).trim().replace('\\s+', ' ');
  var parts = s.split(' ');

  // A. Genus Logic
  var genus = ee.String(ee.Algorithms.If(
    parts.size().gt(1),
    ee.Algorithms.If(ee.String(parts.get(0)).equals('Essence'), parts.get(1), parts.get(0)),
    ee.Algorithms.If(parts.size().gt(0), parts.get(0), 'Unknown')
  ));

  // B. Refined Biological Species Logic 
  var speciesClean = ee.String(ee.Algorithms.If(
    parts.size().gt(1),
    (function() {
      // Skip "Essence" if it exists
      var list = ee.List(ee.Algorithms.If(ee.String(parts.get(0)).equals('Essence'), parts.slice(1), parts));
      
      return ee.Algorithms.If(
        list.size().gt(1),
        ee.Algorithms.If(
          // REGEX: Check if 2nd word starts with Capital Letter or Quote (Indicates a Variant)
          ee.String(list.get(1)).match('^[A-Z\']').size().gt(0),
          list.get(0), // If it's a variant, keep only Genus
          list.slice(0, 2).join(' ') // If it's lowercase, it's a true species (Genus + species)
        ),
        list.get(0)
      );
    })(),
    s
  ));

  return f.set({
    'genus': genus,
    'species_clean': speciesClean
  });
});

// 3. CALCULATE DOMINANCE BY QUARTIER
var genusAudit = quartiers.map(function(q) {
  var localTrees = treesWithTaxa.filterBounds(q.geometry());
  var totalCount = localTrees.size();
  var hist = ee.Dictionary(localTrees.aggregate_histogram('genus'));
  var vals = ee.List(hist.values());
  var maxCount = ee.Number(ee.Algorithms.If(vals.size().gt(0), vals.reduce(ee.Reducer.max()), 0));

  return q.set({
    'nom': q.get('nom'),
    'tree_total': totalCount,
    'genus_dominance_pct': ee.Number(ee.Algorithms.If(totalCount.gt(0), maxCount.divide(totalCount).multiply(100), 0))
  });
});

// 4. CALCULATE SHANNON INDEX 
var totalTrees = treesWithTaxa.size();
var speciesHist = ee.Dictionary(treesWithTaxa.aggregate_histogram('species_clean'));
var counts = speciesHist.values();
var shannon = counts.map(function(count) {
  var p = ee.Number(count).divide(totalTrees);
  return p.multiply(p.log()).multiply(-1);
}).reduce(ee.Reducer.sum());

// 5. PRINT RESULTS
print('--- FINAL AUDIT RESULTS ---');
print('Final Pure Species Richness (S):', speciesHist.keys().size());
print('Final Biological Shannon Index (H’):', shannon);
print('--- GENUS DOMINANCE BY NEIGHBORHOOD ---', genusAudit.select(['nom', 'tree_total', 'genus_dominance_pct']));

// 6. EXPORTS
Export.table.toAsset({
  collection: treesWithTaxa,
  description: 'export_taxa_clean_v2_final',
  assetId: 'projects/strasbourg-eco-resilience/assets/patrimoine_arbore_taxa_clean_v2_final'
});

Export.table.toDrive({
  collection: ee.FeatureCollection(speciesHist.keys().map(function(n){return ee.Feature(null,{'species':n})})),
  description: 'Strasbourg_Final_Species_List',
  fileFormat: 'CSV'
});