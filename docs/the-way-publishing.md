# Publishing The Way to the archive

The Way is one book entry (`id: "the-way"`, series `The Way`) inside `BOOKS` in
`archive.js`, built the same way as the Quantum Frontier prequels: inline
chapters, a `Front Matter` chapter, `freeChapterCount` equal to every chapter so
the whole published text is readable, no cover (typographic card like the TVN
shorts), byline `Douglxss Burley Johnson / d.b.j.`.

That entry is generated. The published prose lives in
`content/the-way/the-way-ch01.md`, `the-way-ch02.md`, ... (one file per
chapter, starting with a `# Chapter One` style heading, then plain paragraphs).
`scripts/sync-the-way.mjs` turns those files into the `archive.js` block between
the `the-way:begin` and `the-way:end` markers, sets the status to
`In progress · N of 36 chapters`, and bumps the offline cache version in
`sw.js` so installed copies pick up the change.

## Add the next chapter

Only publish a chapter after it has passed editor and continuity review.

1. From the repo root, copy chapters 1..N from the manuscript folder and rebuild:

       node scripts/sync-the-way.mjs --from /workspace/writing-corpus/the-way/manuscript --through 6

   (Or drop `the-way-ch06.md` into `content/the-way/` by hand and run
   `node scripts/sync-the-way.mjs`.) Chapters must run 1..N with no gaps.
   `--through` also re-copies earlier chapters, so revisions to them come along;
   anything past N is removed (that is how you unpublish).
2. Check: `node --check archive.js && node scripts/sync-the-way.mjs --check`
3. Look at it: `python3 -m http.server 4173`, open http://localhost:4173/ ,
   The Way folder, Open, and jump to the new chapter.
4. Commit `content/the-way/`, `archive.js` and `sw.js` on a branch and open a PR.

The blurb and the 36-chapter plan live at the top of `scripts/sync-the-way.mjs`.
`content/` and `scripts/` are in `.vercelignore`, so only `archive.js` ships.
