import json
import logging
import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent


def load_env_file(env_path: Path) -> None:
    if not env_path.exists() or not env_path.is_file():
        return

    for line in env_path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file(BASE_DIR / ".env")
load_env_file(BASE_DIR.parent / ".env")

try:
    from extractor import extract_invoice_data
except ModuleNotFoundError:
    from backend.extractor import extract_invoice_data

app = FastAPI()
logger = logging.getLogger("uvicorn.error")


def get_sample_pdf_search_dirs() -> list[Path]:
    # Build resilient search paths so sample PDFs work regardless of launch cwd.
    raw_candidates = [BASE_DIR.parent / "pdfs", Path.cwd() / "pdfs"]
    raw_candidates.extend(parent / "pdfs" for parent in BASE_DIR.parents)
    raw_candidates.extend(parent / "pdfs" for parent in Path.cwd().parents)

    search_dirs = []
    seen = set()
    for candidate in raw_candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        search_dirs.append(resolved)
    return search_dirs


def get_existing_sample_pdf_dirs() -> list[Path]:
    return [d for d in get_sample_pdf_search_dirs() if d.exists() and d.is_dir()]

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
    sample_dirs = get_existing_sample_pdf_dirs()
    files_set = set()
    for sample_dir in sample_dirs:
        for f in sample_dir.iterdir():
            if f.is_file() and f.suffix.lower() == ".pdf":
                files_set.add(f.name)
    files = sorted(files_set)
    return {"files": files}


@app.post("/extract-sample/{filename}")
def extract_sample(filename: str):
    safe_name = Path(filename).name
    if safe_name != filename or not safe_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid sample PDF filename.")

    pdf_path = None
    searched_dirs = [str(path) for path in get_sample_pdf_search_dirs()]
    for sample_dir in get_existing_sample_pdf_dirs():
        candidate = sample_dir / safe_name
        if candidate.exists() and candidate.is_file():
            pdf_path = candidate
            break

    if pdf_path is None:
        raise HTTPException(
            status_code=404,
            detail=f"Sample PDF not found. Searched: {searched_dirs}",
        )

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
