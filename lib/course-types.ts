import { z } from "zod";

export const MaterialSchema = z.object({
  title: z.string().min(1).max(160),
  subject: z.string().min(1).max(80),
  kind: z.enum(["Syllabus", "Lecture notes", "Lecture slides", "Past questions"]),
  filename: z.string().max(160),
  pages: z.array(z.object({ locator: z.string().max(40), text: z.string().max(4000) })).min(1).max(100),
  warnings: z.array(z.string().max(300)).max(5),
}).refine((m) => m.pages.reduce((n, p) => n + p.text.length, 0) <= 60000);
export type MaterialDraft = z.infer<typeof MaterialSchema>;
export type CourseMaterial = MaterialDraft & { id: string; addedAt: string };
export type CourseExcerpt = { id: string; materialId: string; title: string; kind: string; locator: string; text: string };

export function courseExcerpts(materials: CourseMaterial[], subject: string, topic = ""): CourseExcerpt[] {
  const subjectKey = (value: string) => value.toLowerCase().replace(/\bdbms\b|database management systems/g, "database systems").replace(/\bos\b/g, "operating systems").replace(/[^a-z0-9]+/g, " ").trim();
  const terms = new Set(`${subject} ${topic}`.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  const ranked = materials.filter((m) => subjectKey(m.subject) === subjectKey(subject)).flatMap((m) => m.pages.map((p) => ({
    id: `${m.id}:${p.locator}`, materialId: m.id, title: m.title, kind: m.kind, locator: p.locator, text: p.text,
    score: [...terms].reduce((score, term) => score + (`${m.subject} ${m.title} ${p.text}`.toLowerCase().includes(term) ? 1 : 0), 0),
  }))).filter((p) => p.score > 0).sort((a, b) => b.score - a.score);
  let budget = 10000;
  return ranked.slice(0, 6).flatMap(({ score: _score, ...p }, index) => {
    const text = p.text.slice(0, budget);
    budget -= text.length;
    return text ? [{ ...p, id: `course-${index + 1}`, text }] : [];
  });
}

// Reviewed public course descriptions/schedules, not a ranking of students.
export const courseBenchmarks = [
  { id: "mit-algorithms", name: "MIT 6.006 · Spring 2020", url: "https://www.ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/", focus: "Algorithms and data structures; mathematical modelling, programming connections, performance measures and analysis techniques.", checkedAt: "2026-10-25" },
  { id: "mit-os", name: "MIT 6.1810 · Fall 2025", url: "https://pdos.csail.mit.edu/6.1810/2025/overview.html", focus: "Operating-system design and implementation using xv6 and RISC-V. Labs extend xv6, including virtual memory and networking.", checkedAt: "2026-10-25" },
  { id: "berkeley-db", name: "Berkeley CS 186 · Spring 2025", url: "https://cs186berkeley.net/sp25/", focus: "Database course schedule includes SQL, B+ trees, sorting and hashing, joins, relational algebra and query optimisation; projects include SQL, B+ trees, and joins with query optimisation.", checkedAt: "2026-10-25" },
] as const;
