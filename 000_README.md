# Diversité des arbres urbains & stress thermique - Strasbourg (Google Earth Engine)

Projet de télédétection et d’écologie urbaine visant à analyser la **diversité arborée** (Shannon/Simpson, règle 10-20-30) et la **température de surface (LST)** à l’échelle de **15 quartiers** de Strasbourg (2022–2024).

Rapport complet : **Urban Tree Diversity and Heat Stress: A Neighbourhood-Scale Analysis (Janvier 2026)**. 

## Contenu du dépôt
- `*.js` : scripts **Google Earth Engine** (traitements + exports)
- `rapport.pdf` : rapport du projet (méthodes, résultats, cartes)

## Données / Assets (GEE)
- Inventaire arbres (patrimoine arboré) - asset GEE
- Quartiers Strasbourg (15) - asset GEE
- Imagerie Landsat 8/9 (LST, été 2022–2024)
- ESA WorldCover v200 (2021) - imperméabilisation

## Ce que fait le script principal
- Nettoyage taxonomique (genre + espèce “clean”)
- Dominance par quartier (audit du genre)
- Calcul de l’indice de Shannon global (sur l’inventaire)
- Exports : table nettoyée vers **Asset** + liste d’espèces vers **Drive**

## Exécution (GEE)
1. Ouvrir https://code.earthengine.google.com
2. Créer un nouveau script
3. Coller le code `.js`
4. Vérifier/mettre à jour les `assetId` si besoin
5. Lancer, puis exécuter les tâches **Export** dans l’onglet *Tasks*

## Auteur
Alexander Milner - Université de Strasbourg
