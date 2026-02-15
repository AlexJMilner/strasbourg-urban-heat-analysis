// INPUTS
var treesV2 = ee.FeatureCollection(
  'projects/strasbourg-eco-resilience/assets/patrimoine_arbore_taxa_clean_v2_final'
);

var genusFamily = ee.FeatureCollection(
  'projects/strasbourg-eco-resilience/assets/strasbourg_genera_with_families'
);

// NORMALIZE STRINGS
function normStr(x) {
  return ee.String(ee.Algorithms.If(x, x, ''))
    .trim()
    .replace('\\s+', ' ')
    .toLowerCase();
}

// SANITY
print('V2 size (should be 82387):', treesV2.size());
print('Lookup size (≈96):', genusFamily.size());

// BUILD LOOKUP DICTIONARY (genus_key -> family)

var lookupKeyed = genusFamily.map(function(f){
  return f.set({
    genus_key: normStr(f.get('genus')),
    family_clean: ee.String(ee.Algorithms.If(f.get('family'), f.get('family'), 'Unknown'))
      .trim()
      .replace('\\s+', ' ')
  });
});

// Lists
var kList = ee.List(lookupKeyed.aggregate_array('genus_key'));
var fList = ee.List(lookupKeyed.aggregate_array('family_clean'));

// Dictionary
var lookupDict = ee.Dictionary.fromLists(kList, fList);

print('LookupDict keys:', lookupDict.keys().size());
print('LookupDict example (acer):', lookupDict.get('acer'));

// APPLY LOOKUP (NO JOIN, NO DROPS)
var withFamily = treesV2.map(function(f){
  var gk = normStr(f.get('genus'));
  var fam = ee.String(lookupDict.get(gk, 'Unknown'));
  return f.set({
    family: fam
  });
});

print('withFamily size (MUST be 82387):', withFamily.size());
print('Family == Unknown count (expected ~385):',
  withFamily.filter(ee.Filter.eq('family', 'Unknown')).size()
);

// EXPORT-SAFE GEOMETRY (force Point centroid)
var keep = ee.List([
  'si_essence', 'species_clean', 'genus', 'family',
  'num_arbre', 'num_pt_vert',
  'si_diametre_fut', 'si_hauteur', 'si_largeur_couronne'
]);

var treesV3 = withFamily.map(function(f){
  var safeGeom = ee.Geometry(f.geometry()).centroid(1);
  var props = f.toDictionary(keep);
  return ee.Feature(safeGeom, props);
});

print('treesV3 size (MUST be 82387):', treesV3.size());
print('treesV3 Family==Unknown (expected ~385):',
  treesV3.filter(ee.Filter.eq('family', 'Unknown')).size()
);
print('Example V3 feature:', treesV3.first());

// EXPORT
Export.table.toAsset({
  collection: treesV3,
  description: 'export_patrimoine_arbore_taxa_family_v5',
  assetId: 'projects/strasbourg-eco-resilience/assets/patrimoine_arbore_taxa_family_v5'
});
