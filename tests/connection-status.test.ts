import test from "node:test";
import assert from "node:assert/strict";
import { nebiusPresentation } from "../lib/connection-status";

const configured = { nebius: true, tavily: false, model: "test-model" };
test("configuration alone is never presented as a verified connection", () => {
  assert.equal(nebiusPresentation(configured).label, "Configured");
  assert.equal(
    nebiusPresentation({ ...configured, nebius: false }).label,
    "Not connected",
  );
});
test("a recorded success replaces the unverified placeholder", () => {
  const status = nebiusPresentation({
    ...configured,
    nebiusVerifiedAt: "2026-10-25T08:00:00.000Z",
  });
  assert.equal(status.label, "Verified live");
  assert.equal(status.shortLabel, "AI connected");
  assert.match(status.description, /Last successful live response/);
});
test("a later failure is shown and a later success restores healthy status", () => {
  assert.equal(
    nebiusPresentation({
      ...configured,
      nebiusVerifiedAt: "2026-10-25T08:00:00.000Z",
      nebiusLastFailureAt: "2026-10-25T08:01:00.000Z",
    }).label,
    "Check connection",
  );
  assert.equal(
    nebiusPresentation({
      ...configured,
      nebiusVerifiedAt: "2026-10-25T08:02:00.000Z",
      nebiusLastFailureAt: "2026-10-25T08:01:00.000Z",
    }).label,
    "Verified live",
  );
});
