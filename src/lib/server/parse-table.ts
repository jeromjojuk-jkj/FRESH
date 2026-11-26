import Papa from "papaparse";
import { ApiError } from "./http";

/**
 * Reads CSV or Excel into a grid of strings. Every cell stays text, so barcodes such
 * as 0200000000011 keep their leading zeros (no numeric conversion happens here).
 */
export async function parseTable(file: File): Promise<string[][]> {
  if (file.size > 5 * 1024 * 1024) throw new ApiError(413, "FILE_TOO_LARGE", "File is larger than 5 MB.");
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    const text = (await file.text()).replace(/^﻿/, "");
    const res = Papa.parse<string[]>(text, { dynamicTyping: false, skipEmptyLines: "greedy" });
    return res.data.map((r) => r.map((c) => String(c ?? "")));
  }
  if (name.endsWith(".xlsx")) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as any);
    const ws = wb.worksheets[0];
    if (!ws) throw new ApiError(400, "EMPTY_FILE", "The workbook has no sheets.");
    const out: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        const cell = row.getCell(c);
        // .text is the displayed value: honours "Text" and "0000000000000" formats.
        cells.push(String(cell.text ?? "").trim());
      }
      out.push(cells);
    });
    return out;
  }
  throw new ApiError(400, "UNSUPPORTED_FILE", "Upload a .csv or .xlsx file.");
}
