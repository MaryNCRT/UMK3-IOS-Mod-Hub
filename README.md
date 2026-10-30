# UMK3 iOS Mod Hub

Mods for the [UMK3 PC port](https://github.com/MaryNCRT/Ultimate-Mortal-Kombat-3-iOS-Decompiled).
The launcher's **MODS > MOD HUB** tab lists the mods published here. A player
downloads one with a click; the launcher puts it in the game's `mods\<mod>\`
folder, turns it on in the MOD MANAGER, and offers **UPDATE** when a newer
version is published.

**Mods only.** Never upload the game's own files, an `.ipa`, or anything you
did not make or have permission to share.

## How it is stored

| What | Where |
|---|---|
| The list the launcher reads | `index.json` on `main` |
| Each mod's picture | `mods/<id>/cover.png` |
| Each mod's files | a `.zip` attached to the release `<id>-v<version>` |

Releases hold the files because a mod can be far larger than git allows
(100 MB per file); a release file can be up to 2 GB.

Only the owner and collaborators with write access can create releases or
change `index.json`. The launcher downloads nothing that is not a release of
this repository, and it checks each zip's SHA-256 against `index.json`.

## index.json

```json
{
  "format": 1,
  "mods": [
    {
      "id": "rain",
      "folder": "Rain",
      "name": "Rain",
      "author": "Jay",
      "version": "1.0",
      "category": "textures",
      "description": "…",
      "thumbnail": "mods/rain/cover.png",
      "url": "https://github.com/MaryNCRT/UMK3-IOS-Mod-Hub/releases/download/rain-v1.0/rain-1.0.zip",
      "size": 1234567,
      "sha256": "…64 hex…",
      "published": "2026-10-30"
    }
  ]
}
```

- `id`: lower case, digits and `-`. It never changes: the launcher uses it to
  know a mod is installed.
- `folder`: the folder name it gets in `mods\`.
- `category`: `textures`, `audio`, `music`, `models` or `mixed`.
- `version`: compared number by number (`1.10` is newer than `1.9`).

## Publishing a mod (collaborators)

You need [Node.js](https://nodejs.org) and the [GitHub CLI](https://cli.github.com)
logged in (`gh auth login`) with write access to this repository.

1. Make the mod in the launcher's MOD MANAGER: name, author, version,
   category, description and a cover picture (its **COVER** button).
2. Clone this repository and run, from it:

   ```
   node publish.js "C:\...\UMK3-PC\mods\My Mod"
   ```

   The script zips the folder, creates the release, copies the cover and
   writes the entry in `index.json`. Add `--dry` to see the entry without
   publishing.
3. Commit and push `index.json` and `mods/`. The mod appears in every
   launcher's MOD HUB on its next refresh.

**To update a mod:** raise its version in the MOD MANAGER (or pass
`--version 1.1`) and run `publish.js` again. Players see **UPDATE**. A
published version is never overwritten; to withdraw one, remove its entry
from `index.json` and delete its release.
