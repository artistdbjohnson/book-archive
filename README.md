# Archive — dglxss.

Self-published book catalog and reader. Not dglxss.com.

Live titles: see the archive.

Audiobook: First Water. Hired reader: Leo. No other voices.
Player path: /audio/first-water.mp3 then ark-survey-ch01-v2-leo.mp3 then p01–p06.

Repo: artistdbjohnson/book-archive

## The Way (drop-in chapters)

The Way is generated into `archive.js` from `content/the-way/the-way-chNN.md`
by `scripts/sync-the-way.mjs`. Do not hand-edit the block between the
`the-way:begin` / `the-way:end` markers. Full steps: `docs/the-way-publishing.md`.

    node scripts/sync-the-way.mjs --from /workspace/writing-corpus/the-way/manuscript --through 6
    node scripts/sync-the-way.mjs --check

Shelf order (`shelfRank` in `archive.js`): A Thin Veiled Night, The Way, Quantum Frontier, then the rest.
