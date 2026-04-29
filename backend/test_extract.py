import json
import os
from pathlib import Path


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for line in env_path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key and key not in os.environ:
            os.environ[key] = value


BASE_DIR = Path(__file__).resolve().parent
PDF_PATH = BASE_DIR.parent / "pdfs" / "invoice1.pdf"

load_env_file(BASE_DIR / ".env")

from extractor import extract_invoice_data  # noqa: E402


def low_confidence_fields(result: dict) -> list[str]:
    low_fields = []
    for field_name, field_value in result.items():
        if isinstance(field_value, dict) and field_value.get("confidence") == "low":
            low_fields.append(field_name)
    return low_fields


def main() -> None:
    with PDF_PATH.open("rb") as f:
        pdf_bytes = f.read()

    result = extract_invoice_data(pdf_bytes)

    print("Extracted JSON:")
    print(json.dumps(result, indent=2))

    low_fields = low_confidence_fields(result)
    print("\nLow-confidence fields:")
    if low_fields:
        for name in low_fields:
            print(f"- {name}")
    else:
        print("- None")


if __name__ == "__main__":
    main()
