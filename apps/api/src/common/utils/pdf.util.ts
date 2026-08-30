/**
 * Shared PDF helpers. Uses pdfkit (lazy-loaded so the dependency is only
 * pulled in when a PDF is actually requested).
 */

export interface PdfDocumentBuilder {
  doc: PDFKit.PDFDocument;
  end: () => void;
  done: Promise<Buffer>;
}

/** Creates a pdfkit document that resolves to a Buffer on end(). */
export async function createPdfDocument(options?: {
  margin?: number;
  size?: "A4" | "LETTER";
}): Promise<PdfDocumentBuilder> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({
    margin: options?.margin ?? 50,
    size: options?.size ?? "A4",
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  return { doc, end: () => doc.end(), done };
}

/** Renders a simple header line in the EduOS document style. */
export function pdfTitle(doc: PDFKit.PDFDocument, text: string): void {
  doc.fontSize(18).fillColor("#1e3a5f").text(text, { align: "center" });
  doc.moveDown();
}

/** Renders a plain body line and resets the fill colour. */
export function pdfLine(
  doc: PDFKit.PDFDocument,
  text: string,
  options: { size?: number; color?: string; moveDown?: number } = {},
): void {
  doc
    .fontSize(options.size ?? 11)
    .fillColor(options.color ?? "#333")
    .text(text);
  if (options.moveDown) doc.moveDown(options.moveDown);
}
