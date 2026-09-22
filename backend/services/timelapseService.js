import { fetchSatelliteImage } from "./sentinelService.js";
import sharp from "sharp";
import { saveImage } from "../config/storage.js";
import { randomUUID } from "crypto";

export const generateDateRange = (startDate, endDate, intervalDays = 15, maxFrames = 20) => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const interval = Number(intervalDays);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) throw new Error("Start date must be before end date");
  if (!Number.isInteger(interval) || interval < 1) throw new Error("intervalDays must be a positive whole number");

  const dates = [];
  for (let current = new Date(start); current <= end; current = new Date(current.getTime() + interval * 86400000)) {
    dates.push(current.toISOString().slice(0, 10));
  }
  if (dates.at(-1) !== endDate) dates.push(endDate);
  if (dates.length <= maxFrames) return dates;

  // Preserve the requested period including both endpoints when it exceeds the cap.
  return Array.from({ length: maxFrames }, (_, index) =>
    new Date(start.getTime() + Math.round((end.getTime() - start.getTime()) * index / (maxFrames - 1))).toISOString().slice(0, 10)
  );
};

export const generateTimelapseFrames = async (sceneRequests, bbox, width = 512, height = 512) => {
  if (!Array.isArray(sceneRequests) || sceneRequests.length < 2) throw new Error("At least 2 suitable scenes are required for time-lapse");
  const frames = [];
  const skipped = [];

  for (const scene of sceneRequests) {
    try {
      const imageBuffer = await fetchSatelliteImage(scene.date, bbox, width, height);
      if (!imageBuffer || imageBuffer.length < 1000) throw new Error("Satellite service returned an empty image");
      const label = `<svg width="${width}" height="${height}"><rect x="10" y="${height - 40}" width="150" height="30" fill="rgba(0,0,0,0.7)" rx="5"/><text x="20" y="${height - 18}" font-family="Arial" font-size="16" font-weight="bold" fill="white">${scene.date}</text></svg>`;
      const buffer = await sharp(imageBuffer).resize(width, height).composite([{ input: Buffer.from(label), gravity: "southeast" }]).jpeg({ quality: 85 }).toBuffer();
      frames.push({ ...scene, buffer, size: buffer.length });
    } catch (error) {
      skipped.push({ date: scene.date, reason: error.message });
      console.warn(`Time-lapse frame ${scene.date} skipped:`, error.message);
    }
  }
  if (!frames.length) throw new Error("No suitable satellite scenes found for the selected period.");
  return { frames, frameCount: frames.length, dates: frames.map((frame) => frame.date), skipped };
};

export const saveTimelapseFrames = async (frames, metadata) => {
  const parentId = randomUUID();
  const savedFrames = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const fileId = await saveImage({
      filename: `timelapse_frame_${i}_${frame.date}.jpg`, data: frame.buffer, parentId, frameNumber: i, frameDate: frame.date,
      metadata: { type: "timelapse_frame", parentId, frameNumber: i, date: frame.date, sceneId: frame.id, cloudCover: frame.cloudCover, startDate: metadata.startDate, endDate: metadata.endDate, bbox: metadata.bbox }
    });
    savedFrames.push({ frameId: fileId, date: frame.date, frameNumber: i, sceneId: frame.id, cloudCover: frame.cloudCover, url: `/api/timelapse/frame/${fileId}` });
  }
  return { parentId, frames: savedFrames };
};
