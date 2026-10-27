# Document teaching

A confirmed course-library document opens a dedicated study room. Students choose 1, 3 or 5 pages, receive an explanation, a worked example, a common mistake and a reasoning question, then discuss their answer. A learning note is saved only when requested.

PDF intake accepts at most 8 MiB and 500 pages, with 600,000 text characters across up to 2,000 page parts. Oversized input fails instead of silently dropping later pages. Coverage counts and low-text pages are visible. Office documents retain their existing extraction limits; this PDF improvement does not add visual interpretation to PowerPoint or Word files.

Original PDFs are private files, referenced by an opaque identifier in their owner's workspace. Confirmation proofs cover that identifier. Page-image routes require the same session ownership as the document. Rendering runs in a separate process with time/memory limits and at most two concurrent renders. Rendering supplies PDF standard fonts so labels remain visible.

When the optional vision model is configured, selected PDF pages are rendered and supplied alongside their extracted text. The model is asked to examine diagrams, arrows, axes, labels and equations and flag uncertainty. Text evidence must be an exact quote from the selected pages. Visual descriptions are explicitly model interpretation; they are not independently verified transcriptions. Dense, ambiguous or low-resolution graphics can still be misunderstood. No claim is made that every page or diagram has been interpreted merely because import completed.

Text tasks use NEBIUS_MODEL_FAST; image tasks use NEBIUS_MODEL_VISION. Both share existing model-call allowances. Lesson sessions expire after one hour and are not durable chat history. Cached preparation and duplicate answer requests avoid repeat calls; other model outputs can still vary or fail validation. Selection is limited to 24,000 text characters; a smaller page range is requested rather than clipping context.

Observed checks on October 27: all 191 pages of the supplied PDF were imported without content being displayed to the development assistant; a synthetic PDF verified page-image rendering, randomized labels and arrow direction using NVIDIA Nemotron 3.5 Super VL; a separate synthetic SQL document verified later-page teaching, worked examples, reasoning feedback, retry handling and ownership refusal. These checks do not establish accuracy on the user's diagrams or educational efficacy.

Retention and recovery: confirmed originals remain until their material is removed. Database snapshots alone do not include these files; preserve the private documents directory too. Abandoned upload previews can leave unreferenced files; periodic orphan cleanup and scheduled full-data backups remain operational backlog items. Do not remove files based only on the contents of a stale database snapshot.
