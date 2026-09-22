// backend/services/changeDetectionService.js
import sharp from "sharp";

/**
 * 🔍 Compare two satellite images and detect changes
 * @param {Buffer} beforeBuffer - First satellite image
 * @param {Buffer} afterBuffer - Second satellite image
 * @returns {Object} Analysis results with change percentage and diff image
 */
export const detectChanges = async (beforeBuffer, afterBuffer) => {
  try {
    console.log("🔍 Starting change detection...");

    // Get image metadata
    const beforeMeta = await sharp(beforeBuffer).metadata();
    const afterMeta = await sharp(afterBuffer).metadata();

    console.log(`📊 Before image: ${beforeMeta.width}x${beforeMeta.height}`);
    console.log(`📊 After image: ${afterMeta.width}x${afterMeta.height}`);

    // Resize both images to same size for comparison
    const width = Math.min(beforeMeta.width, afterMeta.width);
    const height = Math.min(beforeMeta.height, afterMeta.height);

    console.log(`🔗 Normalizing to: ${width}x${height}`);

    // Convert to raw pixel data
    const beforePixels = await sharp(beforeBuffer)
      .resize(width, height, { fit: "cover" })
      .raw()
      .toBuffer();

    const afterPixels = await sharp(afterBuffer)
      .resize(width, height, { fit: "cover" })
      .raw()
      .toBuffer();

    console.log(`📥 Before pixels: ${beforePixels.length} bytes`);
    console.log(`📥 After pixels: ${afterPixels.length} bytes`);

    // Calculate pixel-by-pixel differences
    const differences = calculatePixelDifferences(beforePixels, afterPixels);

    console.log(`✅ Change detection complete`);

    return differences;
  } catch (error) {
    console.error("❌ Change Detection Error:", error.message);
    throw new Error(`Change detection failed: ${error.message}`);
  }
};

/**
 * 📊 Calculate pixel differences between two images
 * @param {Buffer} beforePixels - First image pixel data
 * @param {Buffer} afterPixels - Second image pixel data
 * @returns {Object} Analysis results
 */
const calculatePixelDifferences = (beforePixels, afterPixels) => {
  let changedPixels = 0;
  const totalPixels = beforePixels.length / 3; // RGB = 3 bytes per pixel

  // Compare each pixel
  for (let i = 0; i < beforePixels.length; i += 3) {
    const beforeR = beforePixels[i];
    const beforeG = beforePixels[i + 1];
    const beforeB = beforePixels[i + 2];

    const afterR = afterPixels[i];
    const afterG = afterPixels[i + 1];
    const afterB = afterPixels[i + 2];

    // Calculate color difference (Euclidean distance)
    const colorDiff = Math.sqrt(
      Math.pow(afterR - beforeR, 2) +
        Math.pow(afterG - beforeG, 2) +
        Math.pow(afterB - beforeB, 2)
    );

    // If difference is significant (threshold: 50 out of 255)
    if (colorDiff > 50) {
      changedPixels++;
    }
  }

  const changePercentage = (changedPixels / totalPixels) * 100;
  const severity = calculateSeverity(changePercentage);
  const changeType = identifyChangeType(changePercentage);

  console.log(`📈 Changed pixels: ${changedPixels}/${totalPixels}`);
  console.log(`📊 Change percentage: ${changePercentage.toFixed(2)}%`);
  console.log(`⚠️ Severity: ${severity}`);
  console.log(`🔍 Change type: ${changeType}`);

  return {
    changePercentage: parseFloat(changePercentage.toFixed(2)),
    changedPixels,
    totalPixels,
    severity,
    changeType,
    summary: generateSummary(changePercentage, changeType, severity),
  };
};

/**
 * 📊 Determine severity level based on change percentage
 */
const calculateSeverity = (changePercentage) => {
  if (changePercentage > 20) return "high";
  if (changePercentage > 10) return "medium";
  return "low";
};

/**
 * 🔍 Identify type of change (deforestation, flooding, fire, etc.)
 * Note: This is a simple heuristic. Real implementation would use ML models
 */
const identifyChangeType = (changePercentage) => {
  // This is simplified logic
  // In production, you'd use ML models or spectral analysis
  if (changePercentage > 15) {
    return "significant_change"; // Could be deforestation, construction, flooding
  }
  if (changePercentage > 8) {
    return "moderate_change"; // Seasonal variation, cloud coverage changes
  }
  return "minor_change"; // Normal variation, noise
};

/**
 * 📝 Generate human-readable summary
 */
const generateSummary = (changePercentage, changeType, severity) => {
  const summaries = {
    high: `⚠️ CRITICAL: ${changePercentage.toFixed(2)}% change detected. Significant environmental change observed. Immediate review recommended.`,
    medium: `⚡ WARNING: ${changePercentage.toFixed(2)}% change detected. Moderate environmental change observed. Further analysis recommended.`,
    low: `✅ INFO: ${changePercentage.toFixed(2)}% change detected. Minor change observed. Likely natural variation or seasonal effect.`,
  };

  return summaries[severity] || summaries.low;
};

/**
 * 🖼️ Create difference visualization (highlight changed areas)
 * Returns a PNG image buffer showing changes
 */
export const createDiffImage = async (
  beforeBuffer,
  afterBuffer,
  width = 512,
  height = 512
) => {
  try {
    console.log("🎨 Creating difference visualization...");

    // Resize both to same size
    const beforeResized = await sharp(beforeBuffer)
      .resize(width, height, { fit: "cover" })
      .raw()
      .toBuffer();

    const afterResized = await sharp(afterBuffer)
      .resize(width, height, { fit: "cover" })
      .raw()
      .toBuffer();

    // Create diff image (highlight changes in red)
    const diffPixels = Buffer.alloc(width * height * 3);

    for (let i = 0; i < beforeResized.length; i += 3) {
      const beforeR = beforeResized[i];
      const beforeG = beforeResized[i + 1];
      const beforeB = beforeResized[i + 2];

      const afterR = afterResized[i];
      const afterG = afterResized[i + 1];
      const afterB = afterResized[i + 2];

      const colorDiff = Math.sqrt(
        Math.pow(afterR - beforeR, 2) +
          Math.pow(afterG - beforeG, 2) +
          Math.pow(afterB - beforeB, 2)
      );

      if (colorDiff > 30) {
        // Highlight changes in red
        diffPixels[i] = Math.min(255, afterR + 100); // Red channel
        diffPixels[i + 1] = Math.max(0, afterG - 50); // Green channel
        diffPixels[i + 2] = Math.max(0, afterB - 50); // Blue channel
      } else {
        // Keep original
        diffPixels[i] = afterR;
        diffPixels[i + 1] = afterG;
        diffPixels[i + 2] = afterB;
      }
    }

    // Convert to PNG
    const diffImage = await sharp(diffPixels, {
      raw: { width, height, channels: 3 },
    })
      .png()
      .toBuffer();

    console.log(`✅ Diff image created: ${diffImage.length} bytes`);
    return diffImage;
  } catch (error) {
    console.error("❌ Diff image creation error:", error.message);
    throw error;
  }
};