import { readFile } from "node:fs/promises";
import { extname, posix } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";

export async function extractCourse(path, extension = extname(path).toLowerCase()) {
  const bytes = await readFile(path);
  if (bytes.length > 8 * 1024 * 1024) throw new Error("File exceeds 8 MB");
  let pages = [], warnings = [], coverage;
  if (extension === ".pdf") {
    if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("Invalid PDF");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes, isEvalSupported: false });
    try {
      const info = await parser.getInfo();
      if (info.total > 500) throw new Error("Use a PDF with at most 500 pages");
      let kept = 0; const emptyPages=[];
      for (let number = 1; number <= info.total; number++) {
        const result = await parser.getText({ partial: [number] });
        const text = result.pages[0]?.text || "";
        if(text.trim().length < 20) emptyPages.push(number);
        kept += text.length;
        if(kept > 600000) throw new Error("PDF text exceeds 600,000 characters; split the file");
        if(!text.length) pages.push({locator:`Page ${number}`,text:""});
        for(let start=0;start<text.length;start+=4000) pages.push({locator:text.length>4000?`Page ${number} · part ${Math.floor(start/4000)+1}`:`Page ${number}`,text:text.slice(start,start+4000)});
        if(pages.length>2000)throw new Error("Too many text sections; split the file");
      }
      coverage={totalPages:info.total,processedPages:info.total,emptyPages,characters:kept};
      if(emptyPages.length) warnings.push(`${emptyPages.length} page(s) have little extractable text and may need OCR or manual transcription.`);
      warnings.push("Text extraction does not interpret diagrams, images or equations reliably.");
    } finally { await parser.destroy(); }
  } else if ([".pptx", ".docx"].includes(extension)) {
    if (bytes.subarray(0, 2).toString() !== "PK") throw new Error("Invalid Office file");
    let total = 0, count = 0;
    const entries = unzipSync(bytes, { filter(file) {
      total += file.originalSize; count++;
      if (total > 40 * 1024 * 1024 || file.originalSize > 8 * 1024 * 1024 || count > 2000) throw new Error("Office archive exceeds extraction limits");
      return extension === ".pptx" ? /^ppt\/slides\/slide\d+\.xml$/.test(file.name) || ["ppt/presentation.xml", "ppt/_rels/presentation.xml.rels"].includes(file.name) : false;
    } });
    if (extension === ".docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: bytes });
      const text = result.value.slice(0, 60000);
      if (result.value.length > 60000) warnings.push("Long text was shortened to 60,000 characters. Use a smaller unit for complete coverage.");
      pages = Array.from({ length: Math.ceil(text.length / 4000) }, (_, i) => ({ locator: `Text section ${i + 1}`, text: text.slice(i * 4000, (i + 1) * 4000) }));
      warnings.push("Word text sections are not original page numbers. Images, layout and equations are not interpreted.");
    } else {
      const filesByName = Object.keys(entries).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]));
      const indexParser = new XMLParser({ ignoreAttributes: false, processEntities: false });
      const array = (v) => v ? Array.isArray(v) ? v : [v] : [];
      let files = filesByName, hasPresentationOrder = false;
      if (entries["ppt/presentation.xml"] && entries["ppt/_rels/presentation.xml.rels"]) {
        const manifest = strFromU8(entries["ppt/presentation.xml"]), relations = strFromU8(entries["ppt/_rels/presentation.xml.rels"]);
        if (/<!DOCTYPE|<!ENTITY/i.test(manifest + relations)) throw new Error("Unsupported XML declarations");
        const ids = array(indexParser.parse(manifest)["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"]);
        const rels = array(indexParser.parse(relations).Relationships?.Relationship);
        files = ids.map((id) => {
          const rel = rels.find((r) => r["@_Id"] === id["@_r:id"]);
          if (!rel || rel["@_TargetMode"] === "External") throw new Error("Invalid slide relationship");
          const target = String(rel["@_Target"]);
          const path = posix.normalize(target.startsWith("/") ? target.slice(1) : posix.join("ppt", target));
          if (!filesByName.includes(path)) throw new Error("Invalid slide target");
          return path;
        });
        hasPresentationOrder = true;
      } else warnings.push("Presentation order was unavailable; locators identify slide files, not their displayed order.");
      if (files.length > 100) throw new Error("Use slides with at most 100 pages");
      const parser = new XMLParser({ preserveOrder: true, processEntities: false, ignoreAttributes: true });
      const strings = (value) => {
        if (!value || typeof value !== "object") return [];
        return Object.entries(value).flatMap(([key, child]) => key === "a:t" ? [typeof child === "string" ? child : collectText(child)] : strings(child));
      };
      const collectText = (value) => typeof value === "string" ? value : value && typeof value === "object" ? Object.entries(value).flatMap(([key, child]) => key === "#text" ? [String(child)] : [collectText(child)]).join("") : "";
      pages = files.map((file, i) => {
        const xml = strFromU8(entries[file]);
        if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unsupported XML declarations");
        return { locator: hasPresentationOrder ? `Slide ${i + 1}` : `Slide file ${file.match(/slide(\d+)/)[1]}`, text: strings(parser.parse(xml)).join(" ") };
      });
      warnings.push("Slide text only: speaker notes, diagrams, images and equations may be missing.");
    }
  } else if ([".txt", ".md"].includes(extension)) {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const text = raw.slice(0, 60000);
    if (raw.length > 60000) warnings.push("Long text was shortened to 60,000 characters. Use a smaller unit for complete coverage.");
    if (text.includes("\0")) throw new Error("Use a plain text file");
    pages = Array.from({ length: Math.ceil(text.length / 4000) }, (_, i) => ({ locator: `Text section ${i + 1}`, text: text.slice(i * 4000, (i + 1) * 4000) }));
  } else throw new Error("Unsupported file type");
  if(extension === ".pdf") {
    pages=pages.map(p=>({...p,text:p.text.replace(/\u0000/g, "").trim()}));
  } else {
  let remaining = 60000;
  if (pages.length > 100 || pages.some((p) => p.text.length > 4000) || pages.reduce((n, p) => n + p.text.length, 0) > remaining)
    warnings.push("Long content was shortened. Upload a smaller chapter or unit for complete coverage.");
  pages = pages.slice(0, 100).flatMap((p) => {
    const text = p.text.replace(/\u0000/g, "").trim().slice(0, Math.min(4000, remaining));
    remaining -= text.length;
    return text ? [{ locator: p.locator, text }] : [];
  });
  }
  if (pages.reduce((n, p) => n + p.text.length, 0) < 30) { if(extension === ".pdf") warnings.push("No usable text was extracted. This PDF needs visual reading to study its pages."); else throw new Error("No usable text found. Use a text-based export."); }
  return { pages, warnings, ...(coverage?{coverage}:{}) };
}

if (process.argv[1]?.endsWith("extract-course.mjs")) {
  try { console.log(JSON.stringify(await extractCourse(process.argv[2], process.argv[3]))); }
  catch { console.log(JSON.stringify({ error: "Could not extract readable text. Use an unlocked text PDF, PPTX, DOCX, TXT or MD file (8 MB, up to 500 PDF pages or 100 slides). Scans need OCR; try a smaller text-based export." })); process.exitCode = 1; }
}
