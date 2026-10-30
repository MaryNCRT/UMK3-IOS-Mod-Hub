#!/usr/bin/env node
/* Publishes one mod to the MOD HUB.
 *
 *   node publish.js "<path to the mod's folder>" [--id rain] [--version 1.1]
 *                   [--author "..."] [--dry]
 *
 * 1. reads the mod's mod.ini (name, author, version, category, description);
 * 2. zips the folder into dist/<id>-<version>.zip (the zip holds the folder);
 * 3. creates the release <id>-v<version> in this repository with that zip
 *    (needs the GitHub CLI, `gh`, logged in as someone with write access);
 * 4. copies the mod's cover.png / cover.jpg to mods/<id>/ and writes its
 *    entry in index.json (size and SHA-256 of the zip).
 *
 * Then commit and push index.json and mods/: the launcher's MOD HUB reads
 * index.json from the main branch. A version is published once; to update
 * a mod, raise its version (in mod.ini or with --version) and run it again.
 * --dry makes the zip and prints the entry without touching GitHub. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REPO = 'MaryNCRT/UMK3-IOS-Mod-Hub';
const DL = 'https://github.com/' + REPO + '/releases/download/';
const CATEGORIES = ['textures', 'audio', 'music', 'models', 'mixed'];
const here = __dirname;

function args(argv) {
    const o = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--dry') o.dry = true;
        else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
        else o._.push(a);
    }
    return o;
}

function readIni(file) {
    const out = {};
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch { return out; }
    for (const line of text.split(/\r?\n/)) {
        const m = /^\s*([A-Za-z_]+)\s*=\s*(.*?)\s*$/.exec(line);
        if (m) out[m[1].toLowerCase()] = m[2];
    }
    return out;
}

const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function run(cmd, list) {
    const r = spawnSync(cmd, list, { stdio: 'inherit' });
    if (r.status !== 0) { console.error(cmd + ' failed'); process.exit(1); }
}

function sha256(file) {
    const h = crypto.createHash('sha256');
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(1 << 20);
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
    fs.closeSync(fd);
    return h.digest('hex');
}

const o = args(process.argv.slice(2));
if (o._.length !== 1) {
    console.error('usage: node publish.js "<mod folder>" [--id id] [--version v] [--author name] [--dry]');
    process.exit(2);
}
const dir = path.resolve(o._[0]);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) { console.error('not a folder: ' + dir); process.exit(2); }
const folder = path.basename(dir);
const info = readIni(path.join(dir, 'mod.ini'));
const id = o.id || slug(folder);
const version = String(o.version || info.version || '1.0').trim();
if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) { console.error('bad id: ' + id); process.exit(2); }
if (!/^[0-9][0-9A-Za-z.]*$/.test(version)) { console.error('bad version: ' + version); process.exit(2); }

const tag = id + '-v' + version;
const file = id + '-' + version + '.zip';
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
const zip = path.join(here, 'dist', file);
fs.rmSync(zip, { force: true });
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
console.log('zipping ' + dir + ' ...');
run(tar, ['-a', '-c', '-f', zip, '-C', path.dirname(dir), folder]);
const size = fs.statSync(zip).size;
if (size >= 2 * 1024 * 1024 * 1024) { console.error('the zip is 2 GB or more: GitHub will not take it'); process.exit(1); }
const sum = sha256(zip);

let thumbnail = '';
for (const c of ['cover.png', 'cover.jpg', 'cover.jpeg', 'preview.png', 'preview.jpg']) {
    const f = path.join(dir, c);
    if (fs.existsSync(f)) {
        const ext = path.extname(c).toLowerCase() === '.png' ? '.png' : '.jpg';
        fs.mkdirSync(path.join(here, 'mods', id), { recursive: true });
        fs.copyFileSync(f, path.join(here, 'mods', id, 'cover' + ext));
        thumbnail = 'mods/' + id + '/cover' + ext;
        break;
    }
}

const entry = {
    id, folder,
    name: info.name || folder,
    author: o.author || info.author || '',
    version,
    category: CATEGORIES.includes(info.category) ? info.category : 'mixed',
    description: info.description || '',
    thumbnail,
    url: DL + tag + '/' + file,
    size, sha256: sum,
    published: new Date().toISOString().slice(0, 10),
};
console.log(JSON.stringify(entry, null, 2));
if (o.dry) process.exit(0);

const notes = [entry.name + ' ' + version, entry.author && 'by ' + entry.author, entry.description,
    'Install it from the UMK3 launcher: MODS > MOD HUB.'].filter(Boolean).join('\n\n');
run('gh', ['release', 'create', tag, zip, '-R', REPO, '--title', entry.name + ' ' + version, '--notes', notes]);

const idxFile = path.join(here, 'index.json');
const idx = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, 'utf8')) : { format: 1, mods: [] };
const at = idx.mods.findIndex(m => m.id === id);
if (at >= 0) idx.mods[at] = entry; else idx.mods.push(entry);
fs.writeFileSync(idxFile, JSON.stringify(idx, null, 2) + '\n');
console.log('\npublished ' + tag + '. Now commit and push index.json and mods/.');
