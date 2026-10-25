# Workflow choices for Stride

Reviewed October 25, 2026. The user asked for useful GitHub workflows, not installation of an entire agent harness.

| Reference | Applied here | Why |
|---|---|---|
| [OpenAI Cookbook: iterating development workflows](https://github.com/openai/openai-cookbook/blob/main/examples/codex/iterating-development-workflows-with-codex.md) | A concise `AGENTS.md`, existing status/roadmap as canonical context, bounded implementation and verification evidence | Reduce repeated discovery and distinguish plans from observed results. The cookbook's optional process is adapted to this two-person project; its sample approval gates are not imported. |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Reference for reusable component and interaction patterns | Considered for a future chosen design system. No claim that Stride currently installs or uses its components. |
| [Radix Primitives](https://github.com/radix-ui/primitives) | Accessibility reference; keyboard focus review and fixes in current custom dialogs | Mature primitives are worth considering when the final UI is selected. Not installed solely for a visual prototype. |
| [Microsoft MarkItDown](https://github.com/microsoft/markitdown) | Document-ingestion approach reviewed; see `COURSE-CONTEXT.md` for the runtime-compatible implementation | Separate extraction from teaching and inspect actual limits. It is not installed in the app container. |
| [pdf-parse](https://github.com/mehmet-kozan/pdf-parse), [Mammoth](https://github.com/mwilliamson/mammoth.js), [fflate](https://github.com/101arrowz/fflate), [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) | Pinned dependencies for bounded course-text extraction | Work with the existing Node runtime, preserve useful locators and keep extraction separate from AI. |

Development helpers review source-only copies, return focused findings, and never receive API credentials or student content. Suggestions are reproduced/reviewed, then verified in the actual runtime. The course review caught the slide-order issue and confirmed-source binding issue; both were addressed before release. The existing CI still runs checks and production builds. Visual verification uses the deployed preview, not a build-success claim.

Five independent HTML design studies live under `public/design-lab/`. They use sample data, make no model requests, and stay independent of the working app theme. They are original study layouts, not copied templates. Signal was subsequently selected by the user and applied to the main app with revised copy and larger text.

The current preview uses a local SSH tunnel. `scripts/preview-tunnel.sh` reconnects after a network interruption; it is not a public deployment or a guarantee of uninterrupted access. Public judge access remains a separate unfinished milestone.
