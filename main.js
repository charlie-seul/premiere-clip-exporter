'use strict';
const ppro = require('premierepro');
const {storage} = require('uxp');
const core = require('./src/core.js');
const {verifyFinalizedEntry} = require('./src/finalized-media.js');
const $ = id => document.getElementById(id);
let preset, destination, busy = false, stop = false, inspected = false;
const say = message => { $('status').textContent = message; };
const controls = ['inspect', 'preset', 'folder', 'mode', 'track', 'cleanup'];
function refresh() {
  for (const id of controls) $(id).disabled = busy;
  $('export').disabled = busy || !preset || !destination || !inspected;
  $('stop').disabled = !busy;
}
async function context() {
  const project = await ppro.Project.getActiveProject();
  if (!project) throw new Error('Open a project in Premiere.');
  const source = await project.getActiveSequence();
  if (!source) throw new Error('Open a sequence in the timeline.');
  return {project, source};
}
function options() { return {mode: $('mode').value, track: Number($('track').value)}; }
async function analyze() {
  const {project, source} = await context();
  const count = await source.getVideoTrackCount();
  const previous = $('track').value;
  $('track').textContent = '';
  for (let i = 0; i < count; i++) {
    const option = document.createElement('option');
    option.value = String(i); option.textContent = 'V' + (i + 1);
    $('track').appendChild(option);
  }
  $('track').value = Number(previous) < count ? previous : '0';
  const segments = core.planSegments(await core.scan(ppro, source), options());
  $('preview').textContent = source.name + '\n' + segments.length + ' range(s)\n' +
    segments.map(s => s.stem + ' · ticks ' + s.start + ' → ' + s.end).join('\n');
  inspected = segments.length > 0; refresh();
  return {project, source, segments};
}
function action(id, fn) {
  $(id).addEventListener('click', async () => {
    if (busy) return;
    try { await fn(); } catch (e) { say(String(e.message || e)); }
    refresh();
  });
}
action('inspect', async () => { await analyze(); say('Analysis complete. Gaps between clips are skipped.'); });
for (const id of ['mode', 'track']) $(id).addEventListener('change', () => { inspected = false; refresh(); });
action('preset', async () => {
  const file = await storage.localFileSystem.getFileForOpening({types: ['epr']});
  if (file) { preset = file; $('presetName').textContent = file.name; }
});
action('folder', async () => {
  const folder = await storage.localFileSystem.getFolder();
  if (folder) { destination = folder; $('folderName').textContent = folder.nativePath; }
});
$('stop').addEventListener('click', () => { stop = true; say('Stop requested. The current request may continue in Premiere.'); });
action('export', async () => {
  busy = true; stop = false; refresh();
  let journal, report;
  try {
    const {project, source, segments} = await analyze();
    if (!segments.length) throw new Error('No eligible clips found.');
    // Unique subfolder isolates this run from previous exports and avoids overwrites.
    const runName = 'ClipExports-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const folder = await destination.createFolder(runName);
    journal = await folder.createFile('export-report.json', {overwrite: false});
    report = {version: '0.3.0', createdAt: new Date().toISOString(),
      sourceName: source.name, sourceGuid: source.guid.toString(), preset: preset.nativePath,
      validation: 'Host exports NOT independently verified', jobs: []};
    await core.exportBatch({ppro, project, source, segments, presetPath: preset.nativePath, folder,
      cancelled: () => stop, report, autoCleanup: $('cleanup').checked, verifyOutput: (path, seconds, cancelled) => verifyFinalizedEntry(folder, path.slice(path.lastIndexOf('/')+1), seconds, cancelled, storage.formats.binary), onUpdate: async data => {
        await journal.write(JSON.stringify(data, null, 2));
        say(data.jobs.length + '/' + segments.length + ' request(s)\n' +
          data.jobs.map(j => j.filename + ' : ' + j.state).join('\n'));
      }});
    say((stop ? 'Batch stopped.' : 'Requests submitted to Premiere.') +
      '\n' + report.jobs.filter(j => j.cleanup === 'removed').length + ' sequence copy/copies removed. ' +
      report.jobs.filter(j => j.cleanup && j.cleanup !== 'removed' && j.cleanup !== 'already-absent').length + ' sequence copy/copies kept.'+
      '\nSequence copies are kept when output finalization cannot be confirmed. Check the rendered files.\nFolder: ' + folder.nativePath);
  } catch (e) {
    if (journal && report) {
      report.error = String(e.message || e);
      try { await journal.write(JSON.stringify(report, null, 2)); } catch (_) { /* preserve original error */ }
    }
    say('Batch stopped: ' + String(e.message || e));
  } finally { busy = false; inspected = false; refresh(); }
});
refresh();
