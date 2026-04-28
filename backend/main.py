import json

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from extractor import extract_invoice_data

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/extract")
async def extract(file: UploadFile):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted")
    
    pdf_bytes = await file.read()
    
    try:
        result = extract_invoice_data(pdf_bytes)
        return { "success": True, "data": result }
    except json.JSONDecodeError:
        raise HTTPException(500, "Extraction failed — model returned invalid JSON")
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/health")
def health():
    return { "status": "ok" }