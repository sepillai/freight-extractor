import anthropic
import pdfplumber
import json
import io
import os

from extraction_prompt import SYSTEM_PROMPT, USER_PROMPT

client = anthropic.Anthropic()

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)

def extract_invoice_data(pdf_bytes: bytes) -> dict:
    raw_text = extract_text_from_pdf(pdf_bytes)
    
    if not raw_text.strip():
        raise ValueError("Could not extract text from PDF")
    
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise RuntimeError(
            "Missing ANTHROPIC_API_KEY environment variable in backend runtime."
        )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": USER_PROMPT.format(invoice_text=raw_text)
            }]
        )
    except Exception as e:
        error_text = str(e).lower()
        if (
            "api key" in error_text
            or "authentication" in error_text
            or "unauthorized" in error_text
            or "permission" in error_text
            or "401" in error_text
            or "403" in error_text
        ):
            raise RuntimeError(
                "Anthropic authentication failed. Verify ANTHROPIC_API_KEY in Railway."
            ) from e
        if (
            "connection error" in error_text
            or "connection" in error_text
            or "timeout" in error_text
            or "timed out" in error_text
            or "dns" in error_text
            or "network" in error_text
        ):
            raise RuntimeError(
                "Anthropic connection failed. Could not reach Anthropic API from Railway."
            ) from e
        raise RuntimeError(f"Anthropic request failed: {e!s}") from e
    
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)