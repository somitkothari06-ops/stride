import {journalSources} from "./journal-context";
import type { CourseExcerpt } from "./course-types";
import { personalContext } from "./personal-context";
import type { Work, Workspace } from "./types";

// Only course excerpt IDs belong in the model's course-source namespace.
export function preparationContext(state: Workspace, work: Work, excerpts: CourseExcerpt[]) {
  const { title, subject, kind, dueDate, summary, source, sourceType } = work;
  return {
    work: { title, subject, kind, dueDate, summary, source, sourceType },
    courseExcerpts: excerpts.map(({ id, title, kind, locator, text }) => ({ id, title, kind, locator, text })),
    validCourseSourceIds: excerpts.map((excerpt) => excerpt.id),
    personalContext: personalContext(state.profile.lifeContext),
    availableMinutes: state.profile.minutes,
    selectedJournalContext:journalSources(state,2000).map(source=>source.excerpt),
    previousAttempts: state.observations
      .filter((observation) => !observation.removed && observation.workId === work.id)
      .slice(-3)
      .map(({ answer, feedback }) => ({ answer, feedback })),
  };
}
