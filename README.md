# Premiere Clip Exporter

[Lire en français](#français)

A free, MIT-licensed UXP extension for **Adobe Premiere Pro 27 on macOS**. Batch-export one file per clip range from a video track or from selected video clips, using the sequence’s visible video tracks and audio mix.

**Experimental version 0.3.0.** H.264 and ProRes 422 HQ exports were tested in Premiere Pro 27.0.0 using two synthetic clips at 25 fps and an Invert clip effect. Sequence-level color effects, adjustment layers, and complex timelines still need validation.

## Install on macOS

1. Download the [source ZIP](https://github.com/charlie-seul/premiere-clip-exporter/archive/refs/heads/main.zip) and unzip it to a permanent location.
2. Install **UXP Developer Tool** from the Apps tab in Creative Cloud Desktop. An Adobe account is required.
3. In Premiere Pro 27, go to **Premiere > Settings > Plug-ins**, enable **Developer Mode**, and restart Premiere if prompted.
4. In UXP Developer Tool, click **Add Plugin** and select this project’s `manifest.json`.
5. Click **Load** for Premiere Pro 27. Open the panel from **Window > UXP Plug-ins**. Menu names may vary by language and version.

No build or npm dependencies are required. The ZIP is a source project. Use **Unload** in UXP Developer Tool to remove the panel. UXP Developer Tool can create an installable package via **Package** after host validation. [Adobe installation guide](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/install/) · [Packaging guide](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/package/)

## Export clips

1. Open a working copy of your project and the sequence you want to export. Start with two selected clips.
2. Choose **All clips on one track** (V1 by default) or **Selected video clips (all tracks)**.
3. Click **Analyze Active Sequence**. Adjustment layers, disabled clips, muted video tracks, transitions, and gaps do not define export ranges. Identical ranges are deduplicated. Overlapping ranges remain separate.
4. Click **Choose Adobe Preset (.epr)** and **Choose Output Folder**. The panel requests access to the locations you select.
5. Click **Export All Clips**. The panel re-analyzes the sequence and selection active at that moment.
6. Keep the panel, project, and sequence copies open during rendering. Check the finished files in the output folder.

For H.264 or ProRes, configure **H.264** or **QuickTime / Apple ProRes 422** in Premiere’s Export workspace. Save the settings as a preset and export it as an `.epr` file using the preset manager or Adobe Media Encoder. The preset controls the codec, resolution, frame rate, audio, color space, and caption settings. Adobe presets are obtained separately. The panel asks Premiere for the matching file extension.

## Output and sequence copies

Each request uses an independent copy of the full source sequence with its own In/Out points. This keeps the rendered range stable while Premiere works asynchronously. Clip selection defines the time ranges. The render uses the full composition, including other visible tracks, titles, transitions, adjustment layers, and the audio mix according to sequence settings. Nested and multicam sequences are treated as single clips for range detection.

Copies are named `PCE_ClipExports-…_0001_name`. Each batch has a unique `ClipExports-…` folder containing files such as `0001_name.ext` and an `export-report.json` with the copy identifiers, exact tick ranges, and errors. The status `api-accepted-unverified` records a successful API response. Verify the actual media after rendering.

A failed request stops the batch. **Stop After Current Request** prevents further submissions. Premiere may finish requests it already accepted. The panel does not autosave the project. Creating many sequence copies can use significant memory. Keep media, nested sequences, and project settings stable while rendering.

## Automatic cleanup

**Automatically remove sequence copies after file finalization** is enabled by default. The panel waits up to 30 seconds after Premiere responds. It checks that the MP4 or MOV file stays stable for two seconds and validates its container structure and duration. It then removes the current batch’s sequence copy only if its name and GUID still match. The source sequence, video files, and older copies are preserved.

Copies are kept if rendering fails or is canceled, verification fails, the copy is renamed, or Premiere refuses deletion. Fragmented containers, files over **256 MB**, and formats other than MP4/MOV require manual cleanup after you verify the renders. Container validation cannot confirm picture or sound fidelity.

Premiere Pro 27.0.0 created two H.264 files of 50 and 75 frames, removed both copies, and preserved the source sequence. ProRes MOV container reading was tested on an existing export. Automatic MOV cleanup still needs a host test.

## Validation

The ranges `0–2 s` and `2–5 s` produced exactly 50 and 75 frames at 25 fps. The Invert clip effect appeared in real exports. Other clip effects, sequence-level color, nested media, third-party plug-ins, color management, and other frame rates still need host validation.

With Node.js 20 or later:

```sh
npm run check
npm test
```

The Node tests use test doubles. See the [Adobe API audit](docs/API-AUDIT.md) and [host validation results and test plan](docs/VALIDATION.md).

---

## Français

Extension UXP gratuite (MIT) pour **Premiere Pro 27 sur macOS** : détecter les clips d’une piste ou les clips vidéo sélectionnés, puis demander un export de séquence par plage.

**Version 0.3.0 expérimentale. Exports réels H.264 et ProRes 422 HQ vérifiés dans Premiere Pro 27.0.0 sur deux plans synthétiques à 25 i/s, avec un effet de clip Invert. Les effets couleur de séquence, calques d’effets et montages complexes restent à valider.**

### Fonctionnement

1. Ouvrir une copie de travail du projet et la séquence à exporter.
2. Choisir **All clips on one track** (V1 par défaut) ou **Selected video clips (all tracks)**.
3. Cliquer sur **Analyze Active Sequence**. Les calques d’effets, clips désactivés et pistes masquées sont exclus du découpage. Les transitions ne créent pas de segments. Les trous entre clips ne sont pas exportés. Les plages identiques sont dédoublonnées ; les plages qui se chevauchent restent distinctes.
4. Choisir un preset Adobe `.epr`, puis un dossier de destination.
5. Cliquer sur **Export All Clips**. Le panneau refait l’analyse à cet instant et utilise la sélection et la séquence actives à cet instant.
6. Attendre la fin des rendus dans Premiere et contrôler les fichiers. Garder le projet, les copies et le panneau ouverts pendant le traitement.

Chaque demande utilise une **copie complète et indépendante** de la séquence d’origine, avec ses propres points In/Out. Les copies sont nommées `PCE_ClipExports-…_0001_nom` et peuvent être **supprimées automatiquement après leur export**, avec la case de nettoyage activée par défaut. Cela évite de changer les plages d’une séquence encore utilisée par un rendu asynchrone. Le plugin supprime uniquement les copies du lot courant après contrôle du fichier finalisé, et ne sauvegarde pas automatiquement le projet. Le lot ajoute donc des éléments et modifie le projet ; une séquence longue avec beaucoup de clips peut consommer beaucoup de mémoire. Commencer avec deux plans sélectionnés.

Un sous-dossier unique `ClipExports-…` contient les sorties `0001_nom.ext` et `export-report.json`. Le journal indique les copies, les plages exactes en ticks et les erreurs. `api-accepted-unverified` signifie uniquement que l’appel Adobe a renvoyé `true`, **pas que le média est terminé ou correct**. En cas d’erreur le lot s’arrête ; les demandes déjà transmises peuvent continuer. **Stop After Current Request** empêche les demandes suivantes, sans annuler un rendu déjà pris en charge.

### Effets, audio et limites

Le plugin demande le rendu de la **composition entière de la séquence**, et non celui du fichier source isolé : les pistes vidéo superposées, titres, transitions, calques d’effets et le mixage audio restent donc dans les copies. Une sélection de clips définit les plages, pas un solo des clips. Les coupes internes d’une séquence imbriquée ou multicam ne sont pas analysées.

Un effet de clip Invert a été vérifié dans les exports réels. La conservation des autres effets de clip, des nouveaux effets couleur de séquence de Premiere 27, des médias imbriqués, des plugins tiers et de la gestion couleur **reste à vérifier dans Premiere**. Cloner la séquence vise à les conserver, mais la documentation de clonage ne garantit pas cette fidélité. Les plages `0–2 s` et `2–5 s` avec `exportFull=false` ont produit exactement 50 et 75 images à 25 i/s. Les autres cadences restent à tester. Le preset détermine codec, résolution, cadence, audio, espace couleur et éventuels réglages de sous-titres.

Le panneau soumet les appels `IMMEDIATELY` successivement. La documentation ne spécifie pas suffisamment si la résolution de la promesse correspond à la fin de l’encodage ; il ne prétend donc pas afficher une progression d’encodage ni une validation de fichiers. Les copies restent stables pendant le contrôle de finalisation, puis sont supprimées si ce contrôle réussit. Ne pas modifier les médias, les séquences imbriquées ou les réglages du projet pendant les rendus.

### Installation de développement sur Mac

Aucune compilation ni dépendance npm n’est nécessaire pour charger le panneau.

1. Télécharger le ZIP de ce dépôt et le décompresser dans un emplacement permanent.
2. Installer **UXP Developer Tool** depuis l’onglet Applications de Creative Cloud Desktop (compte Adobe requis).
3. Dans Premiere Pro 27, ouvrir **Premiere > Réglages > Plug-ins** et activer **Developer Mode**, puis suivre l’éventuelle demande de redémarrage de Premiere.
4. Lancer UXP Developer Tool ; **Add Plugin** et sélectionner le `manifest.json` de ce dossier.
5. Cliquer sur **Load** pour Premiere Pro 27. Le panneau est accessible par **Fenêtre > Plug-ins UXP > Premiere Clip Exporter** (libellés variables selon la langue/version).
6. Accorder l’accès uniquement aux fichiers/dossiers choisis via les sélecteurs.

Pour retirer le panneau : **Unload** dans UXP Developer Tool. Les copies conservées faute de finalisation confirmée restent présentes ; les retirer manuellement seulement une fois les rendus terminés et vérifiés.

Le ZIP est un **projet source**, pas un installateur double-clic. Aucun `.ccx` fabriqué à la main n’est présenté comme installateur validé. Après recette réelle, un paquet installable peut être créé avec la commande **Package** d’UXP Developer Tool.

Références Adobe : [installation](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/install/), [paquet UXP](https://developer.adobe.com/premiere-pro/uxp/plugins/distribution/package/).

### Choisir H.264 ou ProRes

Dans la fenêtre Exporter de Premiere, régler le format **H.264** ou **QuickTime / Apple ProRes 422** avec la résolution, la cadence et la couleur souhaitées. Enregistrer le réglage comme preset puis exporter ce preset au format `.epr` via le gestionnaire de presets (au besoin via Adobe Media Encoder). Dans le panneau, sélectionner ce fichier. L’extension de sortie est obtenue par `EncoderManager.getExportFileExtension`, sans supposer que tout preset produit un `.mp4`.

Les presets Adobe ne sont pas redistribués. Le panneau ne fabrique pas un faux preset et ne choisit pas un codec seulement à partir du suffixe de fichier.


### Nettoyage automatique (0.3.0)

La case **Automatically remove sequence copies after file finalization** est cochée par défaut. Après chaque demande acceptée par Premiere, le panneau attend que le MP4/MOV soit stable pendant 2 secondes. Il vérifie la structure du conteneur (métadonnées vidéo, données média complètes, durée cohérente), puis supprime uniquement la copie dont le GUID et le nom correspondent exactement au lot. Il ne supprime jamais la séquence source ni un fichier vidéo.

En cas d’arrêt, de refus d’export, de fichier incomplet/inaccessible, de copie renommée ou de suppression refusée, la copie est conservée. Le contrôle attend au plus 30 secondes après la réponse de Premiere. Les formats autres que MP4/MOV, conteneurs fragmentés et fichiers de plus de **256 Mo** restent à nettoyer manuellement. Cette limite évite de charger de gros exports en mémoire, car l’API de lecture par blocs documentée n’est pas implémentée sur l’hôte testé.

Le nettoyage est effectué **par copie après son export**, pas par recherche globale de toutes les séquences `PCE_…`. Les anciennes copies ne sont pas supprimées. Une structure finalisée ne certifie pas la fidélité visuelle/sonore : vérifier les rendus reste nécessaire.

Test réel dans Premiere 27.0.0 : deux MP4 de 50 et 75 images créés, deux copies supprimées, séquence source conservée. Le nettoyage de ProRes/MOV n’a pas encore été testé dans l’hôte ; la lecture de son conteneur a été vérifiée sur un MOV déjà exporté.

### Vérification

Avec Node.js 20 ou ultérieur :

```sh
npm run check
npm test
```

Voir [audit des API](docs/API-AUDIT.md) et [protocole de recette réelle](docs/VALIDATION.md). Les tests Node utilisent des doublures : ils ne chargent pas UXP, Premiere ou les encodeurs.
