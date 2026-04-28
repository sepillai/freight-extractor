SYSTEM_PROMPT = """You are a logistics data extraction agent. 
You extract structured data from freight invoices and bills of lading.
Always respond with valid JSON only. No preamble, no explanation.
If a field is missing or unclear, set the value to null and set 
its confidence to "low". Never guess or hallucinate values."""

USER_PROMPT = """Extract the following fields from this freight invoice.
Return ONLY a JSON object with this exact structure:

{
  "invoice_number": { "value": "...", "confidence": "high|medium|low" },
  "carrier_name": { "value": "...", "confidence": "high|medium|low" },
  "shipper": { "value": "...", "confidence": "high|medium|low" },
  "consignee": { "value": "...", "confidence": "high|medium|low" },
  "origin": { "value": "...", "confidence": "high|medium|low" },
  "destination": { "value": "...", "confidence": "high|medium|low" },
  "ship_date": { "value": "...", "confidence": "high|medium|low" },
  "delivery_date": { "value": "...", "confidence": "high|medium|low" },
  "line_items": [
    {
      "description": "...",
      "quantity": ...,
      "unit_price": ...,
      "total": ...
    }
  ],
  "subtotal": { "value": ..., "confidence": "high|medium|low" },
  "taxes_fees": { "value": ..., "confidence": "high|medium|low" },
  "total_amount": { "value": ..., "confidence": "high|medium|low" },
  "currency": { "value": "...", "confidence": "high|medium|low" },
  "needs_review": false
}

Set needs_review to true if ANY field has low confidence.

Invoice text:
{invoice_text}"""
