# Audit des API Adobe — 21 novembre 2026

Sources officielles consultées :

- Documentation AdobeDocs/uxp-premiere-pro, commit `ffa53e0dab56c421ef2ac665b66ed370e3a1d675`.
- Exemples AdobeDocs/uxp-premiere-pro-samples, commit `a6172f151f84b54e1dcd4facef7f85ab5d50d490`.

Ces sources ont servi de références ; leur code n’est pas incorporé au projet.

| Besoin | API réelle utilisée | Portée et limite |
| --- | --- | --- |
| Hôte | `host.app: "premierepro"`, manifeste v5 | Corrige `PPRO` dans le prototype ; minVersion fixée à 27.0.0 |
| Projet / séquence | `Project.getActiveProject()`, `project.getActiveSequence()` | Aucune séquence inventée ou collection ExtendScript utilisée |
| Pistes | `getVideoTrackCount()`, `getVideoTrack(index)` | Indices zéro ; choix explicite de la piste de découpage |
| Clips | `track.getTrackItems(Constants.TrackItemType.CLIP, false)` | Exclut espaces et transitions |
| Filtres | `isMuted()`, `isDisabled()`, `isAdjustmentLayer()`, `getIsSelected()` | Les clips exclus du découpage peuvent toujours influencer la composition rendue selon les réglages de piste |
| Temps | `getStartTime()`, `getEndTime()`, `TickTime.ticks` | Temps de montage, pas `getInPoint()/getOutPoint()` du média source ; chaînes décimales conservées sans conversion flottante |
| Copie | `sequence.createCloneAction()` | Copie complète ; identifiée par différence des GUID avant/après. Si plusieurs copies apparaissent, arrêt |
| Transactions | `project.lockedAccess()`, `executeTransaction()`, `compound.addAction()` | Actions synchrones dans le verrou, opérations asynchrones hors du verrou |
| Nom de copie | `(await clone.getProjectItem()).createSetNameAction(name)` | Nom repérable, GUID enregistré dans le journal |
| Plage | `createSetInPointAction(TickTime)`, `createSetOutPointAction(TickTime)` | Relue via `getInPoint()/getOutPoint()` avant la demande d’export |
| Preset | `EncoderManager.getExportFileExtension(sequence, presetPath)` | Preset `.epr` choisi via UXP ; pas de numéro de codec inventé |
| Export | `EncoderManager.getManager().exportSequence(clone, Constants.ExportType.IMMEDIATELY, outputPath, presetPath, false)` | Signature documentée depuis 25.6 ; le dernier paramètre s’appelle `exportFull` |
| Fichiers | `require('uxp').storage.localFileSystem` | Permission `request`, sélection native de preset et de dossier |

## Ce que les documents ne prouvent pas

La référence liste `exportFull: boolean` sans description détaillée. Utiliser `false` pour rendre les In/Out n’est pas une garantie documentaire ; cette valeur a toutefois été vérifiée dans Premiere 27.0.0 sur des plages de 50 et 75 images à 25 i/s en H.264 et ProRes 422 HQ. La référence renvoie `Promise<boolean>` mais ne définit pas un contrat de fin de rendu assez précis pour certifier les fichiers sur cette base.

Le clonage ne documente pas une garantie exhaustive de copie des effets couleur de séquence de la version 27. Une comparaison réelle avec un export manuel de référence reste nécessaire. Le code ne contourne pas cette limite par un rendu des médias sources, qui perdrait le contexte de séquence.

## Liens directs

- [Manifeste](https://developer.adobe.com/premiere-pro/uxp/plugins/concepts/manifest/)
- [Project](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/project)
- [Sequence](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequence)
- [VideoTrack](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videotrack)
- [VideoClipTrackItem](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videocliptrackitem)
- [TickTime](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/ticktime)
- [EncoderManager](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/encodermanager)
- [Exemple Adobe d’export](https://github.com/AdobeDocs/uxp-premiere-pro-samples/blob/a6172f151f84b54e1dcd4facef7f85ab5d50d490/sample-panels/premiere-api/src/export.ts)
