# Premiere Clip Exporter

Extension UXP gratuite (MIT) pour **Premiere Pro 27 sur macOS** : détecter les clips d’une piste ou les clips vidéo sélectionnés, puis demander un export de séquence par plage.

**Version 0.2.0 expérimentale. Code et tests automatisés disponibles ; aucun export réel de ce plugin n’a encore été validé dans Premiere. Ce dépôt ne constitue pas une version de production.**

## Fonctionnement

1. Ouvrir une copie de travail du projet et la séquence à exporter.
2. Choisir « Tous les plans d’une piste » (V1 par défaut) ou « Clips vidéo sélectionnés ».
3. Cliquer sur **Analyser la séquence active**. Les calques d’effets, clips désactivés et pistes masquées sont exclus du découpage. Les transitions ne créent pas de segments. Les trous entre clips ne sont pas exportés. Les plages identiques sont dédoublonnées ; les plages qui se chevauchent restent distinctes.
4. Choisir un preset Adobe `.epr`, puis un dossier de destination.
5. Cliquer sur **Export All Clips**. Le panneau refait l’analyse à cet instant et utilise la sélection et la séquence actives à cet instant.
6. Attendre la fin des rendus dans Premiere et contrôler les fichiers. Garder le projet, les copies et le panneau ouverts pendant le traitement.

Chaque demande utilise une **copie complète et indépendante** de la séquence d’origine, avec ses propres points In/Out. Les copies sont nommées `PCE_ClipExports-…_0001_nom` et **restent dans le projet**. Cela évite de changer les plages d’une séquence encore utilisée par un rendu asynchrone. Le plugin ne supprime aucune séquence et ne sauvegarde pas automatiquement le projet. Le lot ajoute donc des éléments et des opérations annulables au projet ; une séquence longue avec beaucoup de clips peut consommer beaucoup de mémoire. Commencer avec deux plans sélectionnés.

Un sous-dossier unique `ClipExports-…` contient les sorties `0001_nom.ext` et `export-report.json`. Le journal indique les copies, les plages exactes en ticks et les erreurs. `api-accepted-unverified` signifie uniquement que l’appel Adobe a renvoyé `true`, **pas que le média est terminé ou correct**. En cas d’erreur le lot s’arrête ; les demandes déjà transmises peuvent continuer. « Arrêter » empêche les demandes suivantes, sans annuler un rendu déjà pris en charge.

## Effets, audio et limites

Le plugin demande le rendu de la **composition entière de la séquence**, et non celui du fichier source isolé : les pistes vidéo superposées, titres, transitions, calques d’effets et le mixage audio restent donc dans les copies. Une sélection de clips définit les plages, pas un solo des clips. Les coupes internes d’une séquence imbriquée ou multicam ne sont pas analysées.

La conservation effective des effets de clip, des nouveaux effets couleur de séquence de Premiere 27, des médias imbriqués, des plugins tiers et de la gestion couleur **doit être vérifiée dans Premiere**. Cloner la séquence vise à les conserver, mais la documentation de clonage ne garantit pas cette fidélité. La sémantique exacte de fin de plage (dernière image / borne exclusive) et le respect des In/Out avec `exportFull=false` font également partie du test d’acceptation. Le preset détermine codec, résolution, cadence, audio, espace couleur et éventuels réglages de sous-titres.

Le panneau soumet les appels `IMMEDIATELY` successivement. La documentation ne spécifie pas suffisamment si la résolution de la promesse correspond à la fin de l’encodage ; il ne prétend donc pas afficher une progression d’encodage ni une validation de fichiers. Les copies indépendantes restent stables si Premiere continue en arrière-plan. Ne pas modifier les médias, les séquences imbriquées ou les réglages du projet pendant les rendus.

## Installation de développement sur Mac

Aucune compilation ni dépendance npm n’est nécessaire pour charger le panneau.

1. Télécharger le ZIP de ce dépôt et le décompresser dans un emplacement permanent.
2. Installer **UXP Developer Tool** depuis l’onglet Applications de Creative Cloud Desktop (compte Adobe requis).
3. Dans Premiere Pro 27, ouvrir **Préférences/Réglages > Modules externes (Plugins)** et activer **Developer Mode**, puis suivre l’éventuelle demande de redémarrage de Premiere.
4. Lancer UXP Developer Tool ; **Add Plugin** et sélectionner le `manifest.json` de ce dossier.
5. Cliquer sur **Load** pour Premiere Pro 27. Le panneau est accessible par **Fenêtre > UXP Plugins > Clip Exporter** (libellés variables selon la langue/version).
6. Accorder l’accès uniquement aux fichiers/dossiers choisis via les sélecteurs.

Pour retirer le panneau : **Unload** dans UXP Developer Tool. Les copies créées dans le projet restent présentes ; les retirer manuellement seulement une fois les rendus terminés et vérifiés.

Le ZIP est un **projet source**, pas un installateur double-clic. Aucun `.ccx` fabriqué à la main n’est présenté comme installateur validé. Après recette réelle, un paquet installable peut être créé avec la commande **Package** d’UXP Developer Tool.

Références Adobe : [installation](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/install/), [paquet UXP](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/package/).

## Choisir H.264 ou ProRes

Dans la fenêtre Exporter de Premiere, régler le format **H.264** ou **QuickTime / Apple ProRes 422** avec la résolution, la cadence et la couleur souhaitées. Enregistrer le réglage comme preset puis exporter ce preset au format `.epr` via le gestionnaire de presets (au besoin via Adobe Media Encoder). Dans le panneau, sélectionner ce fichier. L’extension de sortie est obtenue par `EncoderManager.getExportFileExtension`, sans supposer que tout preset produit un `.mp4`.

Les presets Adobe ne sont pas redistribués. Le panneau ne fabrique pas un faux preset et ne choisit pas un codec seulement à partir du suffixe de fichier.

## Vérification

Avec Node.js 20 ou ultérieur :

```sh
npm run check
npm test
```

Voir [audit des API](docs/API-AUDIT.md) et [protocole de recette réelle](docs/VALIDATION.md). Les tests Node utilisent des doublures : ils ne chargent pas UXP, Premiere ou les encodeurs.
