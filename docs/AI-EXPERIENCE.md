# AI that earns its place in Stride

The product loop is **bring something → choose one step → understand it → try it → remember useful context**. AI belongs at transitions where it reduces effort. Static navigation, dates, filters, counts and confirmations should remain predictable code.

| Student need | AI behavior | Interface / safeguard |
|---|---|---|
| “I don't know where to start” | Suggest one manageable action using deadlines and available time | Today: one action; optional short explanation; refresh if context changed |
| “Explain this” | Use relevant course passages, a worked example and one check question | Coursework → Pip; distinguish general explanation from document-backed claims |
| “Let me tell you what's going on” | Hold a natural conversation, follow up without diagnosing or forcing a career goal | Pip conversation; recent history; explicit saving into personal context |
| “Find something useful” | Retrieve public resources, then explain why they relate to the question | Pip / Direction; short answer first, original links optional |
| “What does this career involve?” | Explain the work plainly, suggest at most three things to try and one tiny exercise | Direction: short plain-language labels; exact requirement provenance; no readiness scores |
| “Don't let me forget this” | Propose a deadline, thought or personal-context addition from the student's words | Capture review with editable date/destination and confirmed atomic save |
| “What did I learn?” | Give feedback on an actual attempt and propose a next practice step | Saved answer and feedback remain inspectable; no claim that code ran or mastery was proven |

## Implementation priority

1. Conversational Pip, contextual entry points and quieter source presentation are implemented and checked; continue evaluating answer quality with real student sessions.
2. Run real student sessions: mixed language, uncertain goals, incorrect answers, noisy documents, unavailable search/model and accidental retries. Fix observed friction before adding more panels.
3. Improve course retrieval and feedback quality with a small representative evaluation set. Adding model calls is not a quality metric.
4. Add opt-in daily preparation only after public hosting, account recovery and stable scheduling are verified. It remains pending.
5. Evaluate stronger speech recognition after a human Safari test; the current feature is browser dictation, not a new speech model.

Google login configuration, public HTTPS deployment, custom email/recovery, student trials and the final submission package remain separate unfinished work. A UI pass does not finish these items.
