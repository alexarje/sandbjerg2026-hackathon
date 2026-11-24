# Work log

## 2026-11-24

Inspected the supplied file descriptions and CSV headers, and documented the files and timing caveats for the hackathon. The original description was retained.

At 16:36 CET, checked the remote branch and file sizes before sharing. Clarified that empty cells in the peaks file do not denote selected peaks. The supplied files do not state a licence or recording provenance.

The original notes use Windows line endings, which Git reports as trailing whitespace. They are retained unchanged.

Alexander identified the Zenodo source and its CC BY 4.0 licence. Checked the record's citation, licence, and file list, then added the source and citation to the README.

At 17:09 CET, fast-forwarded the local branch to the upstream plot commit, preserving the uncommitted reflections. Built Applause Constellation with score and circular views, peak sonification, the concert recording, and stage-event seeking. Checked the data parser against the supplied CSVs, built the application, and exercised playback and controls in desktop and mobile browser views.

During the subsequent rebase, the upstream branch added a separate dashboard at the root. Kept that dashboard and moved Applause Constellation into its own directory.

At 17:28 CET, prepared a space-themed reveal.js presentation about the data, workflow, prototypes, and reflections. Alexander enabled GitHub Pages for Actions. Added a workflow to publish the deck and dashboards, and checked a locally assembled Pages copy, slide layout, speaker notes, links, and parser tests. The workflow has not yet been pushed or deployed.

Added the group's chosen name, The Applonauts, and a one-slide summary of the project.

At 17:34 CET, the first Pages deployment failed because the deployment job could not find the uploaded artifact. Separated the build and deployment jobs so deployment waits for the build to complete.