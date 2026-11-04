"""Pull plain text out of common document types."""
import html
import re

MAX_CHARS = 200_000

TEXT_EXTS = {
    ".txt", ".md", ".csv", ".tsv", ".log", ".json", ".xml", ".html", ".htm",
    ".ini", ".yaml", ".yml", ".rtf", ".eml",
}
EXTRACTABLE = TEXT_EXTS | {".pdf", ".docx", ".xlsx", ".xlsm"}


def html_to_text(raw: str) -> str:
    raw = re.sub(r"(?is)<(script|style|head).*?</\1>", " ", raw)
    raw = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</tr>|</li>", "\n", raw)
    raw = re.sub(r"<[^>]+>", " ", raw)
    raw = html.unescape(raw)
    raw = re.sub(r"[ \t\r\f\v]+", " ", raw)
    return re.sub(r"\n\s*\n+", "\n\n", raw).strip()


def _pdf(path: str) -> str:
    from pypdf import PdfReader

    reader = PdfReader(path)
    parts, total = [], 0
    for page in reader.pages[:300]:
        text = page.extract_text() or ""
        parts.append(text)
        total += len(text)
        if total > MAX_CHARS:
            break
    return "\n".join(parts)


def _docx(path: str) -> str:
    import docx

    doc = docx.Document(path)
    parts = [p.text for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            parts.append(" | ".join(cell.text.strip() for cell in row.cells))
    return "\n".join(parts)


def _xlsx(path: str) -> str:
    import openpyxl

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    parts, total = [], 0
    try:
        for ws in wb.worksheets:
            parts.append(f"# Sheet: {ws.title}")
            for row in ws.iter_rows(values_only=True):
                line = " | ".join("" if v is None else str(v) for v in row).strip(" |")
                if line:
                    parts.append(line)
                    total += len(line)
                if total > MAX_CHARS:
                    return "\n".join(parts)
    finally:
        wb.close()
    return "\n".join(parts)


def extract_text(path: str, ext: str) -> str:
    ext = ext.lower()
    if ext == ".pdf":
        text = _pdf(path)
    elif ext == ".docx":
        text = _docx(path)
    elif ext in (".xlsx", ".xlsm"):
        text = _xlsx(path)
    elif ext in TEXT_EXTS:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read(MAX_CHARS)
        if ext in (".html", ".htm"):
            text = html_to_text(text)
    else:
        return ""
    return text[:MAX_CHARS]
