import anthropic
import pdfplumber
import json
import io

from extraction_prompt import SYSTEM_PROMPT, USER_PROMPT

client = anthropic.Anthropic()

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)

def extract_invoice_data(pdf_bytes: bytes) -> dict:
    raw_text = extract_text_from_pdf(pdf_bytes)
    
    if not raw_text.strip():
        raise ValueError("Could not extract text from PDF")
    
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1000,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": USER_PROMPT.format(invoice_text=raw_text)
        }]
    )
    
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)