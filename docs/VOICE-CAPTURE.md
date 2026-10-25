# Voice capture

On the landing page, speak or type an introduction and choose **Use my introduction**. It opens the personal setup with an editable story draft. It does not overwrite the profile until the final Save action. The draft remains in this tab's session storage until profile save.

In Today, open **Have something on your mind?** Select Coursework, Thought or About me. Stop listening, check the text, then use the action. Coursework goes through one-item extraction and confirmation; ambiguous relative dates stay unconfirmed. Thoughts are stored as separate session-owned notes, not assignments or assessed evidence. They appear in the thought inbox and workspace JSON export; Remove deletes one and Start fresh clears all. Notes are not yet inputs to planning or scheduled reminders.

Dictation uses the browser's speech recognition service, English (India). It requires browser support, microphone permission and a secure origin (HTTPS or localhost). Some providers send audio to their service. No audio is uploaded to or saved by Stride. Recognition can fail even if the API exists. Type or use device keyboard dictation as fallback. There is no continuous background listening, wake word or spoken assistant reply.

Human audio recognition accuracy, Safari permission/service behavior and mixed-language dictation need user trials. Test stop/start, permission denial, network interruption and partial sentences before the judge demo. Browser recognition avoids a new paid provider/account but is not a universal transcription backend.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

Run `node scripts/capture-smoke.mjs` against a running server (STRIDE_BASE_URL optional). It uses fresh synthetic sessions and no model calls.
