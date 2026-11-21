# État de validation et recette Premiere

## Vérifications effectuées

- Prototype téléchargé inspecté : interface d’inspection uniquement, aucune détection ni fonction d’export.
- API recoupées avec les références et exemples officiels Adobe, voir API-AUDIT.md.
- Premiere Pro **27.0.0** installé sur le Mac et application ouverte, constaté sans modifier le montage.
- UXP Developer Tool non trouvé dans Applications/Utilitaires ; commande `uxp` absente.
- 14 tests Node réussis ; contrôle syntaxique de main.js et src/core.js réussi.
- **Panneau non chargé dans Premiere ; aucun fichier vidéo réellement exporté avec ce plugin.**

La recette hôte reste bloquée au chargement du plugin : UXP Developer Tool n’est pas disponible dans l’environnement vérifié. Aucun réglage de développement de Premiere n’a été modifié et aucun export n’a été lancé sur le projet de travail ouvert. Ne pas convertir cet état en « exports validés » à partir des seuls tests Node ou du booléen retourné par Adobe.

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

Compléter le résultat ci-dessous uniquement après exécution :

- Testeur / date : **non exécuté**
- Version Premiere / macOS / UXP : **non renseignée pour la recette**
- Presets / nombre de fichiers : **aucun**
- Fidélité des effets : **non validée**
- Respect des bornes et durée : **non validé**
- Conclusion hôte : **en attente**
