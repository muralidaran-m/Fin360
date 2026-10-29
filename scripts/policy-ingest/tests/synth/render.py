"""Render a synthetic Doc to a PDF with reportlab (text lines plus ruled tables)."""
from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .documents import Doc


def render(doc: Doc, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{doc.name}.pdf"
    style = getSampleStyleSheet()["BodyText"]
    story = []
    for kind, payload in doc.blocks:
        if kind == "lines":
            for line in payload:
                story.append(Paragraph(escape(line).replace("  ", "&nbsp; "), style))
        elif kind == "table":
            t = Table(payload)
            t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey)]))
            story.append(t)
        elif kind == "page":
            story.append(PageBreak())
        story.append(Spacer(1, 6))
    SimpleDocTemplate(str(path), pagesize=A4).build(story)
    return path
