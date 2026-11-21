'use strict';
// Decimal strings preserve Premiere ticks even beyond Number.MAX_SAFE_INTEGER.
function ticks(value) {
  const s = String(value);
  if (!/^\d+$/.test(s)) throw new Error('Temps de séquence invalide : ' + s);
  return s.replace(/^0+(?=\d)/, '');
}
function compare(a, b) {
  a = ticks(a); b = ticks(b);
  return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
}
function safeName(name) {
  return String(name).replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, '_')
    .replace(/^[. ]+|[. ]+$/g, '').slice(0, 70) || 'clip';
}
function planSegments(clips, {mode = 'track', track = 0} = {}) {
  if (!['track', 'selected'].includes(mode)) throw new Error('Mode inconnu.');
  const filtered = clips.filter(c => !c.disabled && !c.adjustment && !c.muted &&
    (mode === 'selected' ? c.selected : c.track === track));
  const seen = new Set();
  return filtered.map(c => ({...c, start: ticks(c.start), end: ticks(c.end)}))
    .filter(c => {
      if (compare(c.start, c.end) >= 0) throw new Error('Plage vide ou inversée.');
      const key = c.start + ':' + c.end;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    })
    .sort((a, b) => compare(a.start, b.start) || compare(a.end, b.end))
    .map((c, i) => ({...c, stem: String(i + 1).padStart(4, '0') + '_' + safeName(c.name)}));
}
async function scan(ppro, sequence) {
  const result = [];
  for (let t = 0; t < await sequence.getVideoTrackCount(); t++) {
    const track = await sequence.getVideoTrack(t);
    const muted = await track.isMuted();
    for (const item of await track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false)) {
      result.push({name: await item.getName(), track: t, muted,
        disabled: await item.isDisabled(), adjustment: await item.isAdjustmentLayer(),
        selected: await item.getIsSelected(),
        start: (await item.getStartTime()).ticks, end: (await item.getEndTime()).ticks});
    }
  }
  return result;
}
function transaction(project, label, actions) {
  let ok = false;
  project.lockedAccess(() => {
    ok = project.executeTransaction(compound => {
      for (const action of actions()) compound.addAction(action);
    }, label);
  });
  if (!ok) throw new Error('Transaction Premiere refusée : ' + label);
}
async function cloneSequence(project, source) {
  const before = new Set((await project.getSequences()).map(s => s.guid.toString()));
  transaction(project, 'Clip Exporter : copie complète', () => [source.createCloneAction()]);
  const added = (await project.getSequences()).filter(s => !before.has(s.guid.toString()));
  if (added.length !== 1) throw new Error('Impossible d’identifier une copie unique. Lot arrêté ; inspecter les séquences du projet.');
  return added[0];
}
async function exportBatch({ppro, project, source, segments, presetPath, folder, cancelled, onUpdate, report}) {
  if (!segments.length) throw new Error('Aucun plan à exporter.');
  const extension = String(await ppro.EncoderManager.getExportFileExtension(source, presetPath)).replace(/^\./, '');
  if (!/^[a-z0-9]{1,10}$/i.test(extension)) throw new Error('Extension du preset invalide.');
  const encoder = ppro.EncoderManager.getManager();
  for (const segment of segments) {
    if (cancelled()) { report.cancelled = true; break; }
    const job = {...segment, filename: segment.stem + '.' + extension, state: 'preparing'};
    report.jobs.push(job);
    // The caller supplies a fresh per-run folder; filenames include unique indices.
    job.output = folder.nativePath + '/' + job.filename;
    await onUpdate(report);
    try {
      const clone = await cloneSequence(project, source);
      job.cloneGuid = clone.guid.toString();
      job.cloneName = 'PCE_' + folder.name + '_' + segment.stem;
      const projectItem = await clone.getProjectItem();
      transaction(project, 'Clip Exporter : plage ' + segment.stem, () => [
        projectItem.createSetNameAction(job.cloneName),
        clone.createSetInPointAction(ppro.TickTime.createWithTicks(segment.start)),
        clone.createSetOutPointAction(ppro.TickTime.createWithTicks(segment.end))
      ]);
      if (compare((await clone.getInPoint()).ticks, segment.start) !== 0 ||
          compare((await clone.getOutPoint()).ticks, segment.end) !== 0) {
        throw new Error('Premiere n’a pas conservé la plage demandée.');
      }
      job.state = 'submitting'; await onUpdate(report);
      const accepted = await encoder.exportSequence(clone, ppro.Constants.ExportType.IMMEDIATELY,
        job.output, presetPath, false);
      if (accepted !== true) throw new Error('Premiere a refusé ou annulé l’export.');
      // A host boolean is not independent proof of a completed/valid media file.
      job.state = 'api-accepted-unverified';
      await onUpdate(report);
    } catch (error) {
      job.state = 'failed'; job.error = String(error.message || error);
      await onUpdate(report); throw error;
    }
  }
  return report;
}
module.exports = {ticks, compare, safeName, planSegments, scan, transaction, cloneSequence, exportBatch};
