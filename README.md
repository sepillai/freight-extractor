Freight Extractor ingests freight invoice PDFs and returns structured JSON (parties, line items, totals, and dates) with field-level confidence labels and an automatic `needs_review` flag.

## 3. Why this is hard
Freight invoices are semi-structured documents with carrier-specific layouts, labels, and abbreviations, so the same business field can appear in different places and under different names.  
Confidence handling matters because extraction errors are not binary; some fields are reliable while others are ambiguous, and downstream workflows need that uncertainty surfaced explicitly.  
The input itself is unstructured PDF text, which means table boundaries, row relationships, and context can degrade during parsing before model inference even starts.

## 4. How it works
- The backend accepts a PDF upload via FastAPI (`POST /extract`) and validates basic file constraints.
- `pdfplumber` extracts text from the PDF pages into a single normalized text payload.
- The extracted text is sent to Claude through the Anthropic Python SDK with a structured extraction prompt.
- The model returns JSON with target fields (carrier, shipper, consignee, line items, totals, dates) plus per-field confidence (`high`, `medium`, `low`).
- If any required field is marked `low`, the response sets `needs_review: true` so low-confidence invoices can be routed to manual review.

## 5. Tech stack
- Backend: FastAPI, Anthropic SDK, pdfplumber
- Frontend: React, Vite, Tailwind CSS
- Deployment: Railway (API), Vercel (web app)

## 7. Known limitations
- Scanned/image PDFs with no text layer will fail.
- Carrier format inconsistency (for example `FS` vs `Fuel Sur` vs `Fuel Surcharge`) can cause extraction variance.
- Multi-page invoices with tables spanning pages can lose row context.
- Non-English documents are not supported.
- There is no OCR layer yet.

## 8. What's next
- Add OCR preprocessing for scanned/image-only PDFs before extraction.
- Add multi-model consensus to improve confidence calibration on ambiguous fields.
- Add a normalization layer for carrier-specific terminology and line-item aliases.
