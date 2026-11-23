# Adobe API audit — November 21, 2026

Official references reviewed:

- AdobeDocs/uxp-premiere-pro documentation, commit `ffa53e0dab56c421ef2ac665b66ed370e3a1d675`
- AdobeDocs/uxp-premiere-pro-samples, commit `a6172f151f84b54e1dcd4facef7f85ab5d50d490`

These sources served as references. Their code is not included in this project.

| Purpose | API used | Scope and limits |
| --- | --- | --- |
| Host | `host.app: "premierepro"`, manifest v5 | Replaces the prototype’s `PPRO` identifier and sets the minimum version to 27.0.0 |
| Project and sequence | `Project.getActiveProject()`, `project.getActiveSequence()` | Uses the active timeline via UXP |
| Tracks | `getVideoTrackCount()`, `getVideoTrack(index)` | Zero-based track indices |
| Clips | `track.getTrackItems(Constants.TrackItemType.CLIP, false)` | Skips gaps and transitions |
| Filters | `isMuted()`, `isDisabled()`, `isAdjustmentLayer()`, `getIsSelected()` | Clips excluded from range detection may still affect the rendered composition according to track settings |
| Time | `getStartTime()`, `getEndTime()`, `TickTime.ticks` | Timeline coordinates are preserved as decimal strings without floating-point conversion |
| Copy | `sequence.createCloneAction()` | Full clone identified by comparing GUIDs before and after cloning. The batch stops if multiple copies appear |
| Transactions | `project.lockedAccess()`, `executeTransaction()`, `compound.addAction()` | Synchronous actions run inside the lock. Asynchronous operations run outside it |
| Copy name | `(await clone.getProjectItem()).createSetNameAction(name)` | The report records the GUID alongside the generated name |
| Range | `createSetInPointAction(TickTime)`, `createSetOutPointAction(TickTime)` | The panel reads back both points before submission |
| Preset | `EncoderManager.getExportFileExtension(sequence, presetPath)` | UXP file picker selects an Adobe `.epr` |
| Export | `EncoderManager.getManager().exportSequence(clone, Constants.ExportType.IMMEDIATELY, outputPath, presetPath, false)` | Signature documented since 25.6. The last parameter is `exportFull` |
| Files | `require('uxp').storage.localFileSystem` | The `request` permission enables native pickers |

## Documentation limits

The reference lists `exportFull: boolean` without defining the behavior in detail. Premiere 27.0.0 honored In/Out with `false` for 50- and 75-frame ranges at 25 fps in H.264 and ProRes 422 HQ. The documented `Promise<boolean>` return value does not provide enough detail to establish when the render is complete.

The clone documentation does not guarantee preservation of Premiere 27 sequence-level color effects. Compare with a manual reference export to validate fidelity. The extension renders sequence copies to retain the timeline context.

## Reference links

- [Manifest](https://developer.adobe.com/premiere-pro/uxp/plugins/concepts/manifest/)
- [Project](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/project)
- [Sequence](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequence)
- [VideoTrack](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videotrack)
- [VideoClipTrackItem](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videocliptrackitem)
- [TickTime](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/ticktime)
- [EncoderManager](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/encodermanager)
- [Adobe export sample](https://github.com/AdobeDocs/uxp-premiere-pro-samples/blob/a6172f151f84b54e1dcd4facef7f85ab5d50d490/sample-panels/premiere-api/src/export.ts)

## Automatic cleanup in 0.3.0

`Project.deleteSequence(sequence)` runs only after file finalization checks succeed and the copy’s name and GUID match the current batch. The source GUID is explicitly excluded. Direct exports in the host test did not emit a completion event the panel could receive. The panel uses `File.getMetadata()` and `File.read({format: storage.formats.binary})` because `fs.lstat` is unavailable in Premiere 27.0.0. ISO BMFF container validation is limited to files up to 256 MB.

---

## Français

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

### Ce que les documents ne prouvent pas

La référence liste `exportFull: boolean` sans description détaillée. Utiliser `false` pour rendre les In/Out n’est pas une garantie documentaire ; cette valeur a toutefois été vérifiée dans Premiere 27.0.0 sur des plages de 50 et 75 images à 25 i/s en H.264 et ProRes 422 HQ. La référence renvoie `Promise<boolean>` mais ne définit pas un contrat de fin de rendu assez précis pour certifier les fichiers sur cette base.

Le clonage ne documente pas une garantie exhaustive de copie des effets couleur de séquence de la version 27. Une comparaison réelle avec un export manuel de référence reste nécessaire. Le code ne contourne pas cette limite par un rendu des médias sources, qui perdrait le contexte de séquence.

### Liens directs

- [Manifeste](https://developer.adobe.com/premiere-pro/uxp/plugins/concepts/manifest/)
- [Project](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/project)
- [Sequence](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequence)
- [VideoTrack](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videotrack)
- [VideoClipTrackItem](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videocliptrackitem)
- [TickTime](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/ticktime)
- [EncoderManager](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/encodermanager)
- [Exemple Adobe d’export](https://github.com/AdobeDocs/uxp-premiere-pro-samples/blob/a6172f151f84b54e1dcd4facef7f85ab5d50d490/sample-panels/premiere-api/src/export.ts)

### Ajout 0.3.0

`Project.deleteSequence(sequence)` est appelé seulement sur la copie du lot après contrôle du fichier finalisé. GUID et nom doivent correspondre et le GUID source est explicitement interdit. Les événements de fin n’étant pas reçus pour les exports directs lors du test réel, leur présence n’est pas supposée. L’API `File.getMetadata()` / `File.read({format: storage.formats.binary})` remplace `fs.lstat`, indisponible dans Premiere 27.0.0 malgré sa présence documentaire. Les conteneurs ISO BMFF sont contrôlés avant suppression, sous une limite de lecture de 256 Mo.
