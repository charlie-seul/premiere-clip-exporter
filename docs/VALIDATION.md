# État de validation et recette Premiere

## Vérifications effectuées

- Prototype téléchargé inspecté : interface d’inspection uniquement, aucune détection ni fonction d’export.
- API recoupées avec les références et exemples officiels Adobe, voir API-AUDIT.md.
- Premiere Pro **27.0.0** : mode développeur activé avec accord de l’utilisateur, application redémarrée après sauvegarde du projet ouvert.
- UXP Developer Tools : manifeste principal chargé avec succès ; analyse via le panneau de deux clips vidéo réussie.
- Projet de test indépendant : deux médias synthétiques ProRes 320 × 180, 25 i/s, son sinusoïdal 440 Hz puis 880 Hz ; durées 2 s et 3 s.
- Effet `AE.ADBE Invert` ajouté au premier clip. Export de référence de la séquence complète puis exports par plages avec la même fonction `exportBatch` que le panneau.
- **H.264 : 50 et 75 images, 2.000 et 3.000 secondes**, audio AAC présent. Référence complète : 125 images et 5.000 secondes.
- Comparaison de toutes les images décodées : premier segment identique pixel à pixel à sa plage de référence ; deuxième segment écart moyen RGB 0.000237/255, maximum 2/255 (compression H.264). Aucun changement de couleur à l’intérieur de chaque segment.
- **ProRes 422 HQ : test via le panneau principal**, choix de preset/destination puis bouton Export All Clips ; 50 et 75 images, 2.000 et 3.000 secondes, PCM présent.
- Presets Adobe locaux : `shareforreview-h264.epr` et `fio-prores-422hq.epr` (ce dernier copié localement pour le sélecteur ; aucun preset Adobe redistribué).
- 14 tests Node réussis ; contrôles syntaxiques réussis. Le test hôte utilise le même core.js que la version 0.2.0 ; la 0.2.1 actualise le statut et la documentation.

**Portée limitée :** pas de validation des effets couleur de séquence de Premiere 27, des calques d’effets, des titres, transitions, imbrications, plugins tiers, autres cadences ni des longs lots. La présence du son a été vérifiée, mais pas une écoute critique ni les effets de piste. Un export complet via l’API a servi de référence ; ce n’est pas une comparaison avec une référence réglée manuellement dans l’interface Exporter. Les médias synthétiques sont des aplats et ne prouvent pas l’absence de doublons d’image sur du mouvement.

Voir [résultats mesurés et empreintes des fichiers](host-results.json). Les fichiers vidéo de test restent locaux ; aucune donnée du montage de l’utilisateur n’a été publiée.

## Recette à effectuer après installation d’UXP Developer Tool

Utiliser un projet de test séparé, médias en ligne. Consigner version exacte de Premiere, macOS, UXP et presets utilisés. Ne pas qualifier cette version de stable avant réussite de tous les cas pertinents.

| Cas | Manipulation | Résultat attendu |
| --- | --- | --- |
| Chargement | Ajouter manifest.json et Load | Panneau visible, séquence lisible sans exception UXP |
| Coupes simples | Deux plans de 50 puis 75 images à 25 i/s sur V1 | Deux demandes ; fichiers de 50 et 75 images exactement, première/dernière image correctes |
| Bornes | Placer une image repère de chaque côté d’une coupe | Pas d’image du plan voisin ; corriger la convention Out si le test révèle une image en trop |
| Étalonnage clip | Lumetri très visible sur un plan | Même rendu qu’un export manuel de la même plage avec le même preset |
| Calque d’effets | Calque au-dessus de deux plans | Effet présent sur les deux fichiers sans segment du calque lui-même |
| Couleur de séquence PPro 27 | Appliquer une correction marquée au niveau séquence | Copie et export identiques à la référence manuelle ; si perte, bloquer la qualification pour ce cas |
| Composition | Titre et image incrustée sur V2, plans sur V1 | Sortie composite, pas clip source isolé |
| Audio | Son des clips + musique continue + effet de piste | Mixage et synchronisation identiques à l’export manuel |
| Transition | Fondu traversant une coupe | Rendu identique à la plage manuelle, sans prétendre isoler le plan du fondu |
| Sélection | Clips choisis sur plusieurs pistes, même plage et chevauchement | Dédoublonnage des plages identiques uniquement |
| Trous / désactivation | Trou, clip désactivé, piste masquée | Pas de segment créé pour ces éléments |
| Imbrication / vitesse | Plan imbriqué, ralenti, inversion | Durée et apparence identiques à la référence ; pas de découpage interne de l’imbrication |
| Cadences | 23.976, 25 et 29.97 | Pas de dérive ni d’image supplémentaire ; ticks exacts |
| Formats | Un preset H.264 et un ProRes 422 | Extension et codec exacts ; résolution/cadence/couleur conformes au preset |
| Plages d’origine | Définir In/Out personnalisés avant le lot | Séquence d’origine inchangée ; copies indépendantes avec plages attendues |
| Arrêt / rejet | Arrêter puis tester preset invalide et export refusé | Pas de demandes suivantes ; erreur consignée, originaux intacts |
| Destination | Dossier Unicode/espaces et répétition du lot | Sous-dossiers distincts, aucun ancien fichier écrasé |
| Persistance | Attendre la fin des exports puis fermer le panneau | Tous les médias finaux lisibles ; copies repérables par nom et GUID |

Pour chaque média, vérifier nombre d’images et durée dans un outil de contrôle (par exemple ffprobe), puis comparer les images et le son à un export manuel. Pour une comparaison technique de pixels, préférer un preset sans perte ; les codecs avec pertes peuvent introduire des écarts même pour un rendu équivalent. Vérifier aussi l’espace couleur et les métadonnées.

État après la recette partielle du 21 novembre 2026 :

- Testeur / date : **test assisté exécuté le 21 novembre 2026**
- Version Premiere : **27.0.0** ; macOS et UXP : voir host-results.json
- Presets / nombre de fichiers : **H.264 : 2 segments + 1 référence ; ProRes 422 HQ : 2 segments**
- Fidélité des effets : **Invert de clip confirmé ; autres effets non validés**
- Respect des bornes et durée : **confirmé sur ces deux plages à 25 i/s**
- Conclusion hôte : **export de plans simples fonctionnel ; recette complexe en attente**

## Nettoyage automatique — recette complémentaire 0.3.0

Test réel exécuté le 21 novembre 2026, sur un projet synthétique séparé dans Premiere Pro 27.0.0 :

- 2 segments H.264 exportés puis contrôlés (conteneurs finalisés et taille stable).
- 2 copies identifiées par GUID et nom supprimées avec `Project.deleteSequence()`.
- Liste finale des séquences : uniquement `PCE_fixture`, la séquence d’origine.
- Points In/Out de la source toujours non définis (valeur sentinelle Adobe).
- L’événement EXPORT_MEDIA_COMPLETE n’a pas été reçu sur cette voie d’export, même avec écoute globale. Il n’est donc pas utilisé pour autoriser la suppression.
- `require('fs').lstat()` a levé « Unimplemented method » dans l’hôte : utilisation des File/Folder UXP autorisés, avec seuil de 256 Mo pour limiter la lecture en mémoire.
- Les cas échec, annulation, copie renommée, mauvais GUID, fichier incomplet et taille instable sont couverts par tests Node.

Limites : nettoyage testé réellement en H.264 uniquement. Pas de validation de nettoyage sur long lot, fichiers >256 Mo, autres cadences ou formats autres que MP4/MOV. Les fichiers >256 Mo sont volontairement conservés.
