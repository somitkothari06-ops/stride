# Teaching from the student's course

Requested October 25, 2026: use the student's syllabus, lecture notes/slides and previous-year questions, then offer a useful wider perspective from named public university materials. This expands the original pasted-text scope; ERP remains excluded.

## Student flow

Open **My work → Course library**. Choose the same subject name used by the coursework, label the source type, and upload a document. Inspect the extracted pages/sections and warnings before confirming. The app keeps confirmed extracted text in the same private browser workspace; raw files are temporary and deleted after extraction. Confirmation is bound to the server-extracted text and the current browser session, expires after 15 minutes or a server restart, and allows a renamed document title. It does not prove that the original file is authentic.

Practice retrieves a bounded sample of matching-subject excerpts. DBMS/database systems and OS/operating systems aliases are supported. The model identifies which supplied excerpts it referenced; students can inspect them below the practice context. The document's presence does not establish mastery, authorship or full course coverage. Past-question style may inform practice; past questions do not predict future exam questions.

The comparison tool contrasts confirmed text with one small, curated public-course summary. Each local point references a supplied passage; exact substring checks reject fabricated quotes. The external quote is checked against our reviewed summary, not scraped live from the full course. These checks establish quotation presence, not that a model's interpretation is correct. The bridge exercise is labelled a synthetic optional proposal. It does not rank students, institutions or readiness and does not replace urgent coursework.

## Supported first version

- Text-based PDF: page locators; up to 100 pages.
- PPTX: text from slide shapes and tables; presentation relationships determine order. Without that order, locators explicitly identify slide files.
- DOCX: raw text divided into sections; these are not original page numbers.
- UTF-8 TXT/MD: text sections.
- Limits: 8 MB per file, 12 confirmed documents, 60,000 retained characters per document, 4,000 per page/section and 10,000 characters of selected model context. Truncation is surfaced in warnings.

Scanned pages need OCR or a transcription. Images, handwritten notes, formula semantics, speaker notes and layout-sensitive tables are not interpreted reliably in this version. Text extraction runs in a child process with a 20-second timeout, bounded output and a JavaScript heap cap; this is not a hardened operating-system sandbox. Office archives have declared-size/entry caps, XML declarations are rejected for slides, and no extracted HTML is rendered. Public deployment still needs abuse controls and stronger parser isolation.

Removing a document removes its extracted text and invalidates prepared practice. Existing attempts and older backups may retain derived references. Export includes confirmed materials. Cross-device accounts, OCR, full semantic retrieval, comprehensive topic mapping and personalised adaptive course sequencing remain future work.

## Public-course references

These historical editions were inspected on October 25, 2026. They are examples of documented course structure, not endorsements, rankings or evidence about individual students.

- [MIT 6.006, Spring 2020](https://www.ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/): algorithmic modelling, programming connections and performance analysis.
- [MIT 6.1810, Fall 2025](https://pdos.csail.mit.edu/6.1810/2025/overview.html): operating-system implementation with xv6 and laboratory extensions.
- [Berkeley CS 186, Spring 2025](https://cs186berkeley.net/sp25/): a database schedule covering SQL, indexes, joins and query optimisation, with projects.

The app links each reference and displays its checked date. This first version does not crawl all courses or establish that a topic absent from an uploaded sample is absent from the student's education.

## Parser choices

Reviewed [Microsoft MarkItDown](https://github.com/microsoft/markitdown), which supports these formats but requires a Python runtime absent from the existing app container. For this bounded implementation, use pinned JavaScript packages: [pdf-parse](https://github.com/mehmet-kozan/pdf-parse), [Mammoth](https://github.com/mwilliamson/mammoth.js), [fflate](https://github.com/101arrowz/fflate) and [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser). Extraction is separate from model reasoning; no model is called merely to upload/review a file.
