# A starting point shaped by the student

The user selected the Signal design and requested a landing page, a full Who Are You page and space for a student's background, experience, aspirations and uncertainty on October 25, 2026.

- `/`: public landing page with the product's study loop and honest preview limitations.
- `/about-you`: five-step, editable personal-context flow.
- `/workspace`: the working study workspace, now in the selected blue/yellow direction with larger text.
- `/design-lab/index.html`: five independent design studies, retained for reference.

About You asks for a name and college year, then offers optional story, experience/projects, interests, ambitions, real-life constraints and learning preferences. A student can choose “I'm still exploring” and leave their career goal blank. The review step shows the actual information being saved; no model invents a biography or diagnosis. Saving updates future planning/preparation context and invalidates prepared practice. Existing coursework is preserved.

For a first-time visitor, setup starts an empty workspace. Existing browser work is preserved when returning to this page. The sample-workspace link remains available separately. Personal context persists in the same cookie-isolated SQLite workspace, is included in export, and can be edited or cleared through About You. Profile controls in the workspace link back to it.

Only a bounded portion of each narrative field is sent with relevant planning/preparation requests. This is an explicit prompt-size limit, not a claim that the entire life story is understood. All entries are labelled student-provided context. Uncertainty is not treated as a deficit or used to rank a student.

This is not cross-device sign-in. The UI explains that relevant text can be sent to Nebius when personalised guidance is requested, and that older attempts/backups may retain derived information after editing. Multi-device accounts, retention policy and complete deletion of historical derived data remain part of the unfinished production work.

Checks cover optional goals, bounded narrative fields, persistence, independent sessions and clearing saved narrative fields. Visual checks inspect the deployed landing page and setup flow. These checks do not establish educational efficacy or privacy guarantees for a production identity system.
