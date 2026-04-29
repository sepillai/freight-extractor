import json

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from extractor import extract_invoice_data

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Freight extractor API is running.",
        "health": "/health",
        "docs": "/docs",
        "extract_endpoint": "/extract (POST multipart/form-data with field 'file')",
    }


@app.get("/extract")
def extract_usage():
    return {
        "message": "Use POST /extract with multipart/form-data and a PDF in the 'file' field.",
        "example_curl": "curl -X POST -F 'file=@invoice.pdf' http://127.0.0.1:8000/extract",
    }


@app.post("/extract")
async def extract(file: UploadFile = File(..., description="Freight invoice PDF")):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Upload a file with a .pdf extension.",
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file upload.")

    try:
        result = extract_invoice_data(pdf_bytes)
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="Extraction failed: model returned invalid JSON.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {e!s}",
        ) from e


@app.get("/health")
def health():
    return {"status": "ok"}
