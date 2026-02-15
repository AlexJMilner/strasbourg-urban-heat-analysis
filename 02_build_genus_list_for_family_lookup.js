// Unique genera as a FeatureCollection (one row per genus)
var genusKeys = ee.List(ee.Dictionary(treesWithTaxa.aggregate_histogram('genus')).keys());

var genusFC = ee.FeatureCollection(
  genusKeys.map(function(g) {
    return ee.Feature(null, {genus: g});
  })
);

print('Unique genus count:', genusFC.size());
print('Genus sample:', genusFC.limit(20));

// Export to Drive as CSV so you can add the family column
Export.table.toDrive({
  collection: genusFC,
  description: 'strasbourg_unique_genera',
  fileFormat: 'CSV'
});