# Pip: talk, learn, find, keep

Pip has two views of the same conversation: the mascot opens a quick-chat panel, and its expand button opens the dedicated /pip workspace. Learning actions lead directly to the larger workspace. An unsent quick-chat draft transfers as editable text without being submitted; blocked storage keeps it in the panel. A student can talk about their day, ask for an explanation, think through a choice or find a resource. Replies should be short, warm and useful. Teaching uses a small example and one understanding check; general conversation does not always become productivity advice.

## Connected experience

- Coursework has **Explain this with Pip**. A role activity has **Try this with Pip**. These navigate to Pip and submit a short request automatically, using a one-time, expiring handoff ID. Reloading a completed handoff does not send it again.
- The server supplies recent conversation, student-provided personal context, open coursework and relevant uploaded passages. A course title suggests a topic, not demonstrated knowledge. Model feedback remains distinct from self-report.
- Historical exchanges are supplied as ordered user/assistant turns; the latest request is last. Direct model-identity questions use the actual server model configuration rather than generated guesses.
- Most exchanges use one NVIDIA/Nebius request. When helpful, Pip automatically requests one short public Tavily query and then answers from the returned sources. Search is limited to one retrieval per turn. There is no web-search switch in the student interface; personal talk does not need retrieval. Queries should omit personal circumstances and private context.
- Source IDs must match server-supplied documents/pages; a citation is not a guarantee of complete semantic support. Retrieved pages may be outdated or incomplete. Original external links remain available without dumping raw search-page snippets into the conversation.
- **Save from this message** in a student's message menu opens the existing capture review. Only the student’s own words are used. Conversation never silently adds deadlines, diagnoses, traits, goals or profile updates. A student reviews destinations and dates before saving.

## Separate conversations

The chat list supports New chat, topic titles, filtering, manual rename and confirmed deletion. A short title is generated with the first model reply and can settle during the first few exchanges; existing migrated conversations receive a one-time title request. Manual names are never overwritten. Empty chats remain New chat. A naming failure does not prevent reading or sending.

Legacy messages move atomically into a legacy thread on the first mutation. Each send names its thread explicitly and carries that thread's version. The current selection is saved for quick/full views; editable expansion carries the thread ID. A contextual learning handoff gets a separate thread. Each view keeps per-thread unsent drafts while mounted. A deleted thread cannot accept an in-flight response; deleting the last thread creates a fresh ID.

Current demo limits are 50 chats and 100 exchanges per chat. Reaching a limit produces an explicit message; no oldest messages are silently deleted. Stored history is separate from model context. These limits should be revisited with real usage and budget measurements before a wider release.

## History and failure behavior

Saved exchanges remain in their conversation up to the explicit demo limit. Signed-in accounts use their normal cross-device workspace; guest history follows the browser workspace. Workspace claim/export/reset naturally includes the optional chat field. The model receives recent complete exchanges up to a 16,000-character history budget plus bounded current context, not an unlimited lifetime memory. Short conversations retain more exchanges than long ones. Profile information needs explicit reviewed saving.

Chat has its own version, separate from the planning revision. Atomic compare-and-save prevents a stale tab from overwriting another reply. A repeated turn UUID returns its saved response; reusing it with different words fails. Clearing leaves an incremented version so an in-flight answer cannot restore deleted history. Thread deletion makes that thread ID unavailable. Existing tasks/profile are unchanged.

The conversation menu sits inside the rounded composer alongside microphone and send icons. Typed drafts survive minimizing and mode switches while the page remains open. Network/model failures retain the draft. Reload reconciles an uncertain send against its turn UUID. Sources and search status are displayed honestly. No fake streaming, execution, background microphone, autonomous applications or guaranteed learning outcomes are implemented.

## Validation

Unit tests cover persistence, no implicit task/profile writes, turn replay, version conflicts, clearing during an in-flight turn, workspace isolation, bounded paired retention, fabricated citations and ignored client-supplied history. Live checks must cover natural conversation, follow-up teaching, real web retrieval, reviewed saving, minimizing, reload and compact layouts. Browser speech needs a human microphone/permission trial.
