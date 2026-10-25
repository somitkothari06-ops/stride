import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { zipSync, strToU8 } from "fflate";
import { extractCourse } from "../scripts/extract-course.mjs";

async function fixture(extension, bytes, check) {
  const directory = await mkdtemp(join(tmpdir(), "stride-extraction-test-"));
  try { const path = join(directory, `synthetic${extension}`); await writeFile(path, bytes); await check(path); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
function pdf() {
  const text = "BT /F1 14 Tf 40 150 Td (Synthetic syllabus: SQL joins and query plans.) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${text.length} >>\nstream\n${text}\nendstream`];
  let content = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(content)); content += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(content);
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("") + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(content);
}
test("text PDFs preserve readable text and page locator", async () => {
  await fixture(".pdf", pdf(), async (path) => {
    const result = await extractCourse(path);
    assert.equal(result.pages[0].locator, "Page 1");
    assert.match(result.pages[0].text, /SQL joins/);
  });
});
test("PPTX extraction orders slides numerically and retains the slide number", async () => {
  const xml = (text) => strToU8(`<p:sld xmlns:p="p" xmlns:a="a"><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:sld>`);
  await fixture(".pptx", zipSync({ "ppt/slides/slide10.xml": xml("Synthetic later slide: query plans and indexes."), "ppt/slides/slide2.xml": xml("Synthetic early slide: SQL joins and unmatched rows.") }), async (path) => {
    const result = await extractCourse(path);
    assert.equal(result.pages[0].locator, "Slide file 2");
    assert.match(result.pages[0].text, /unmatched rows/);
    assert.equal(result.pages[1].locator, "Slide file 10");
    assert.ok(result.warnings.length);
  });
});
test("PPTX follows presentation relationships when slides were reordered", async () => {
  const archive = zipSync({
    "ppt/presentation.xml": strToU8('<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId r:id="rId10"/><p:sldId r:id="rId2"/></p:sldIdLst></p:presentation>'),
    "ppt/_rels/presentation.xml.rels": strToU8('<Relationships><Relationship Id="rId10" Target="slides/slide10.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>'),
    "ppt/slides/slide10.xml": strToU8('<a:p xmlns:a="a"><a:t>Synthetic first displayed slide: SQL query planning.</a:t></a:p>'),
    "ppt/slides/slide2.xml": strToU8('<a:p xmlns:a="a"><a:t>Synthetic second displayed slide: join execution.</a:t></a:p>'),
  });
  await fixture(".pptx", archive, async (path) => {
    const result = await extractCourse(path);
    assert.equal(result.pages[0].locator, "Slide 1");
    assert.match(result.pages[0].text, /first displayed/);
  });
});
test("DOCX raw text uses text sections rather than fabricated page numbers", async () => {
  const archive = zipSync({
    "[Content_Types].xml": strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    "_rels/.rels": strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    "word/document.xml": strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Synthetic lecture notes: compare SQL inner and left joins.</w:t></w:r></w:p></w:body></w:document>'),
  });
  await fixture(".docx", archive, async (path) => {
    const result = await extractCourse(path);
    assert.equal(result.pages[0].locator, "Text section 1");
    assert.match(result.pages[0].text, /left joins/);
  });
});
test("unreadable and oversized inputs fail rather than inventing text", async () => {
  await fixture(".pdf", Buffer.from("not pdf"), async (p) => assert.rejects(extractCourse(p)));
  await fixture(".txt", Buffer.from(""), async (p) => assert.rejects(extractCourse(p)));
  await fixture(".txt", Buffer.alloc(8 * 1024 * 1024 + 1), async (p) => assert.rejects(extractCourse(p)));
  await fixture(".pptx", zipSync({ "ppt/slides/slide1.xml": strToU8('<!DOCTYPE a [<!ENTITY x "bad">]><a:t>&x;</a:t>') }), async (p) => assert.rejects(extractCourse(p)));
});
