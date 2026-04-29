import json
import logging
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

try:
    from extractor import extract_invoice_data
except ModuleNotFoundError:
    from backend.extractor import extract_invoice_data

app = FastAPI()
logger = logging.getLogger("uvicorn.error")
BASE_DIR = Path(__file__).resolve().parent
SAMPLE_PDF_DIR = BASE_DIR.parent / "pdfs"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://freight-extractor.vercel.app",
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
    except RuntimeError as e:
        logger.exception("Extraction runtime error")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {e!s}",
        ) from e
    except Exception as e:
        logger.exception("Unexpected extraction error")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {e!s}",
        ) from e


@app.get("/sample-pdfs")
def sample_pdfs():
    if not SAMPLE_PDF_DIR.exists():
        return {"files": []}

    files = sorted([f.name for f in SAMPLE_PDF_DIR.iterdir() if f.is_file() and f.suffix.lower() == ".pdf"])
    return {"files": files}


@app.post("/extract-sample/{filename}")
def extract_sample(filename: str):
    safe_name = Path(filename).name
    if safe_name != filename or not safe_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid sample PDF filename.")

    pdf_path = SAMPLE_PDF_DIR / safe_name
    if not pdf_path.exists() or not pdf_path.is_file():
        raise HTTPException(status_code=404, detail="Sample PDF not found.")

    try:
        pdf_bytes = pdf_path.read_bytes()
        result = extract_invoice_data(pdf_bytes)
        return {"success": True, "data": result, "sample_file": safe_name}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="Extraction failed: model returned invalid JSON.",
        )
    except RuntimeError as e:
        logger.exception("Sample extraction runtime error")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {e!s}",
        ) from e
    except Exception as e:
        logger.exception("Unexpected sample extraction error")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {e!s}",
        ) from e


@app.get("/health")
def health():
    return {"status": "ok"}
