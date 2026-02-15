// 09_multivariate_mediation_LST_

// LOAD INPUTS
var diversity = ee.FeatureCollection(
  'projects/strasbourg-eco-resilience/assets/species_clean_real'
);

var lst = ee.FeatureCollection(
  'projects/strasbourg-eco-resilience/assets/quartiers_LST_Landsat8-9_2022-2024_summer'
);

var trees = ee.FeatureCollection(
  'projects/strasbourg-eco-resilience/assets/patrimoine_arbore_taxa_family_v5'
).filter(ee.Filter.and(
  ee.Filter.neq('genus', 'non'),
  ee.Filter.neq('genus', 'Unknown')
));

var quartiers = ee.FeatureCollection(
  'projects/strasbourg-eco-resilience/assets/strasbourg-15-quartiers'
);

// ROBUST PARSER (LOCKED IN)
function safeNumber(val) {
  var str = ee.String(ee.Algorithms.If(val, val, '0'));
  var withPeriod = str.replace(',', '.', 'g');
  var cleaned = withPeriod.replace('[^0-9.-]', '', 'g');

  var len = cleaned.length();
  var isEmpty = len.eq(0);
  var isSinglePunct = ee.Algorithms.If(
    len.eq(1),
    ee.Algorithms.If(cleaned.equals('.'), 1, ee.Algorithms.If(cleaned.equals('-'), 1, 0)),
    0
  );
  var isInvalid = ee.Algorithms.If(isEmpty, 1, isSinglePunct);
  var numStr = ee.String(ee.Algorithms.If(isInvalid, '0', cleaned));
  return ee.Number.parse(numStr);
}

// VERIFY
print('Test "on renseigné":', safeNumber('on renseigné'));
print('Test "3":', safeNumber('3'));
print('Test "1,5":', safeNumber('1,5'));

// STRUCTURE METRICS
var structureMetrics = quartiers.map(function(q) {
  var localTrees = trees.filterBounds(q.geometry());
  var n = ee.Number(localTrees.size());
  var areaHa = q.geometry().area(1).divide(10000);
  var density = n.divide(areaHa);

  var meanCrownArea = ee.Number(ee.Algorithms.If(
    n.gt(0),
    localTrees.map(function(f) {
      var crownRaw = f.get('si_largeur_couronne');
      var dbhRaw = f.get('si_diametre_fut');

      var crownWidthM = ee.Number(ee.Algorithms.If(
        crownRaw,
        safeNumber(crownRaw),
        ee.Algorithms.If(
          dbhRaw,
          safeNumber(dbhRaw).multiply(0.015),
          0
        )
      ));

      var radius = crownWidthM.divide(2);
      return f.set('_area', radius.pow(2).multiply(Math.PI));
    }).reduceColumns(ee.Reducer.mean(), ['_area']).get('mean'),
    0
  ));

  return q.set({
    q_id: q.get('libelle'),
    tree_density_ha: density,
    mean_crown_area_m2: meanCrownArea,
    area_ha: areaHa,
    tree_count: n
  });
});

// IMPERVIOUS SURFACE
var worldcover = ee.ImageCollection("ESA/WorldCover/v200").first();
var impervClean = worldcover.eq(50).reduceRegions({
  collection: quartiers,
  reducer: ee.Reducer.mean(),
  scale: 10,
  crs: 'EPSG:32632'
}).map(function(f) {
  return f.set({
    q_id: f.get('libelle'),
    pct_impervious: ee.Number(f.get('mean')).multiply(100)
  });
});

// JOIN FUNCTION
function joinOnQid(primary, secondary) {
  return ee.FeatureCollection(ee.Join.inner().apply({
    primary: primary,
    secondary: secondary,
    condition: ee.Filter.equals({leftField: 'q_id', rightField: 'q_id'})
  }).map(function(f) {
    return ee.Feature(f.get('primary')).set(
      ee.Feature(f.get('secondary')).toDictionary()
    );
  }));
}

// ASSEMBLE DATA
var data = joinOnQid(
  joinOnQid(
    joinOnQid(diversity, lst),
    structureMetrics
  ),
  impervClean
);

// CLEAN DATA
var cleanData = data.map(function(f) {
  return ee.Feature(f.geometry().centroid(1)).set({
    q_id: f.get('q_id'),
    lst: ee.Number(f.get('lst_mean_c')),
    shannon: ee.Number(f.get('shannon')),
    density: ee.Number(f.get('tree_density_ha')),
    crown_area: ee.Number(f.get('mean_crown_area_m2')),
    impervious: ee.Number(f.get('pct_impervious')),
    richness: ee.Number(f.get('richness'))
  });
});

// REGRESSION WITH STANDARD ERRORS
function runRegression(fc, vars, dep) {
  var n = fc.size(), names = ['constant'].concat(vars), k = names.length;
  var withC = fc.map(function(f){ return f.set('constant', 1); });

  var X = ee.Array(withC.toList(n).map(function(f){
    f = ee.Feature(f);
    return names.map(function(v){ return ee.Number(f.get(v)); });
  }));

  var Y = ee.Array(withC.toList(n).map(function(f){
    return [ee.Number(ee.Feature(f).get(dep))];
  }));

  var Xt = X.transpose();
  var XtXInv = Xt.matrixMultiply(X).matrixInverse();
  var beta = XtXInv.matrixMultiply(Xt).matrixMultiply(Y);

  // STANDARD ERRORS
  var res = Y.subtract(X.matrixMultiply(beta));
  var rss = res.transpose().matrixMultiply(res).get([0,0]);
  var mse = ee.Number(rss).divide(n.subtract(k));
  var se = XtXInv.multiply(mse).matrixDiagonal().sqrt();

  // R²
  var yMean = Y.reduce(ee.Reducer.mean(), [0]).repeat(0, n);
  var tss = Y.subtract(yMean).pow(2).reduce('sum', [0,1]).get([0,0]);
  var r2 = ee.Number(1).subtract(ee.Number(rss).divide(tss));

  return {
    coefficients: beta.toList().flatten(),
    std_errors: se.toList(),
    r2: r2
  };
}

// MODELS
print('Model 1:', runRegression(cleanData, ['shannon'], 'lst'));
print('Model 2:', runRegression(cleanData, ['shannon','density','crown_area','impervious'], 'lst'));