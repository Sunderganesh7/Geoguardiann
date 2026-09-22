import PDFDocument from "pdfkit";
import { getImage } from "../config/storage.js";

const value = (item, fallback = "Not available") => item === undefined || item === null || item === "" ? fallback : item;
const number = (item, digits = 4) => Number.isFinite(Number(item)) ? Number(item).toFixed(digits) : "Not available";

export const createEnvironmentalReportPdf = async (data) => {
  const doc = new PDFDocument({ size: "A4", margin: 52, bufferPages: true });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const complete = new Promise((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const analysis = data.analysis || {};
  const title = "GEOGUARDIAN";
  const heading = (text) => { doc.moveDown(0.7).font("Helvetica-Bold").fontSize(14).fillColor("#116149").text(text); doc.moveTo(52, doc.y + 4).lineTo(543, doc.y + 4).strokeColor("#b7d7cb").stroke(); doc.moveDown(0.45); };
  const row = (label, content) => { doc.font("Helvetica-Bold").fontSize(9).fillColor("#334155").text(label, { continued: true, width: 175 }); doc.font("Helvetica").fillColor("#0f172a").text(String(value(content))); doc.moveDown(0.2); };

  doc.fillColor("#0b3d2e").rect(0, 0, 595, 105).fill();
  doc.fillColor("white").font("Helvetica-Bold").fontSize(24).text(title, 52, 32);
  doc.font("Helvetica").fontSize(12).text("Environmental Monitoring & Assessment Report", 52, 64);
  doc.fillColor("#0f172a").moveDown(3.2);
  doc.font("Helvetica-Bold").fontSize(18).text("Satellite-derived vegetation assessment");
  doc.font("Helvetica").fontSize(10).fillColor("#475569").text(`Generated ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`);

  heading("1. Executive Summary");
  const summary = `Sentinel-2 Level-2A observations for ${value(data.location)} from ${value(analysis.beforeDate)} to ${value(analysis.afterDate)} indicate a mean NDVI change of ${number(analysis.ndviChange)} (${number(analysis.relativeChange, 2)}% relative). Spatial analysis identified ${number(analysis.changedAreaKm2)} km² of significant local vegetation decline, representing ${number(analysis.affectedPercentage, 2)}% of the monitored area. NDVI-based analysis identifies spectral change only and does not independently establish cause.`;
  doc.font("Helvetica").fontSize(10).fillColor("#1e293b").text(summary, { lineGap: 3 });

  heading("2. Analysis Identification");
  row("Analysis ID", data.analysisId); row("Location", data.location); row("Bounding box", Array.isArray(data.bbox) ? data.bbox.join(", ") : data.bbox); row("Observation period", `${value(analysis.beforeDate)} to ${value(analysis.afterDate)}`); row("NDVI change threshold", `-${number(analysis.threshold, 2)}`);
  heading("3. Satellite Data");
  row("Satellite platform", "Sentinel-2 MSI"); row("Data source", "Copernicus Data Space Ecosystem"); row("Processing level", "Level-2A"); row("Spectral bands", "B04 Red (665 nm), B08 NIR (842 nm)"); row("Spatial resolution", "10 m"); row("Cloud masking", "Scene Classification Layer (SCL)");
  heading("4. Vegetation Index Analysis");
  row("Formula", "NDVI = (NIR - Red) / (NIR + Red)"); row("Before mean NDVI", number(analysis.beforeMeanNdvi)); row("After mean NDVI", number(analysis.afterMeanNdvi)); row("NDVI change", number(analysis.ndviChange)); row("Relative change", `${number(analysis.relativeChange, 2)}%`);
  heading("5. Spatial Vegetation Change");
  row("Total monitored area", `${number(analysis.totalMonitoredAreaKm2)} km²`); row("Significant decline area", `${number(analysis.changedAreaKm2)} km²`); row("Affected area", `${number(analysis.affectedPercentage, 2)}%`); row("Valid pixels (before / after)", `${number(analysis.beforeValidPixels, 2)}% / ${number(analysis.afterValidPixels, 2)}%`);

  const images = [ ["Figure 1 - Before-period NDVI", data.beforeImageId], ["Figure 2 - After-period NDVI", data.afterImageId], ["Figure 3 - NDVI Change Classification", data.changeImageId] ];
  heading("6. Maps & Visualizations");
  for (const [caption, id] of images) {
    const image = id ? await getImage(id) : null;
    if (image?.image_data) { if (doc.y > 610) doc.addPage(); doc.image(image.image_data, { fit: [470, 220], align: "center" }); doc.font("Helvetica-Oblique").fontSize(8).fillColor("#475569").text(caption, { align: "center" }); doc.moveDown(0.7); }
    else doc.font("Helvetica-Oblique").fontSize(9).fillColor("#64748b").text(`${caption}: Visualization unavailable for this analysis.`).moveDown(0.5);
  }
  heading("7. Scientific Interpretation"); doc.font("Helvetica").fontSize(10).fillColor("#1e293b").text(value(analysis.status), { lineGap: 3 });
  heading("8. Limitations"); doc.font("Helvetica").fontSize(9).text("Satellite spatial resolution, cloud masking residuals, temporal availability, atmospheric effects, and normal seasonal variation can affect NDVI. NDVI cannot establish causation; field verification and contextual data may be required.", { lineGap: 3 });
  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index++) { doc.switchToPage(index); doc.font("Helvetica").fontSize(8).fillColor("#64748b").text(`GeoGuardian Environmental Monitoring Report | Analysis ${value(data.analysisId)} | Page ${index + 1} of ${pages.count}`, 52, 800, { align: "center", width: 491 }); }
  doc.end();
  return complete;
};
