# Stride submission copy

## Project title
Stride — your college work, your own way forward

## Tagline
Turn your college notes into something you understand, build and keep going with.

## Track
Personal AI. Confirm this exact label in the submission form.

## Links
- App: https://stride-213-239-171-145.sslip.io/
- Judge demo: https://stride-213-239-171-145.sslip.io/demo
- Public code: https://github.com/somitkothari06-ops/stride
- License: MIT, in the repository root.
- Video: upload outputs/product-film/Stride-Product-Demo.mp4 to YouTube as Public, then paste its watch link.

## Inspiration
College students collect lecture slides, assignments, half-finished ideas and AI chats in different places. Understanding a topic is only the start: it is harder to turn it into work of your own and pick it up again a week later. We wanted a space that connects those steps.

## What it does
Stride is a personal desktop for engineering students. Bring course files, learn from selected pages and diagrams, try an example, and connect the concept to a project you care about. My Build gives the work a home: an editor, a browser JavaScript runner, saved attempts and formative feedback. Pip uses relevant dated records to continue earlier conversations and decisions. A Journal keeps session notes and artifacts; desktop tools can stay open together instead of forcing students through one long dashboard.

The isolated judge demo shows an explicitly illustrative month with 20 study sessions, project artifacts and a next step. New AI conversations and reviews are live. College PDFs/slides used in the filming workspace are actual imports, separate from the public sample fixture.

## How we built it
Next.js, React and TypeScript provide the desktop and server routes. SQLite persists owner-scoped workspaces and metadata; retained files have ownership checks. Supabase supports optional accounts. NVIDIA Nemotron Lightning on Nebius Token Factory powers Pip, reviewed intake, planning and structured feedback. Nemotron Super VL reads selected rendered PDF-page images alongside text. Tavily supplies public sources for search-backed guidance. The application runs on a Nebius CPU Devlab; inference is hosted by Token Factory, not a GPU in the application server.

## What makes it different
The core loop is coursework → understanding → a chosen project → an attempt → dated saved work → a useful return point. This is persistent, source-linked work across tools, not just a tutor conversation. The desktop lets notes, code and Pip coexist while keeping drafts. Optional daily preparation can prepare a next step from saved coursework while the browser is closed.

## Challenges
Reliable AI required more than prompting. We separated calendar arithmetic from model guesses, validated structured outputs and source IDs, bounded selected-page reading and retrieval, and kept model feedback separate from student claims. We also handled independent window state, private file access, stale updates, retry behaviour and service supervision.

## Validation and honest limits
The deployed Node 22 release passes 247 tests and production build checks. We checked live browser flows and real college-file imports. This is a hackathon preview, not a guarantee of learning outcomes. Memory retrieval is bounded; models can misinterpret diagrams or history. An upload does not prove authorship or mastery. Voice is browser-dependent. The browser runner executes JavaScript, not arbitrary server code.

## Feedback on NVIDIA / Nebius — review before pasting
Token Factory's OpenAI-compatible endpoint and structured responses let us use a shared adapter for several text workflows, with a separate NVIDIA vision path for PDF-page images. Explicit output budgets and reasoning settings mattered for short structured requests. We found that source validation, date handling, page rendering and honest error states were application responsibilities rather than problems a model switch alone could solve. The existing CPU Devlab was sufficient for hosting because inference ran on Token Factory. More predictable cold/warm latency and clearer per-model capability/schema guidance would help us refine the experience further. These are observations from this build, not a general benchmark.

## Final steps for the team
1. Upload the MP4 to YouTube as PUBLIC and paste the watch URL.
2. Paste the description and links, select Personal AI, and review the provider-feedback paragraph.
3. Confirm event city only if actually attended; do not infer attendance.
4. Confirm the app and credits remain available through the judging period.
5. Preview the Devpost entry and submit before your deadline. This file does not submit it automatically.
