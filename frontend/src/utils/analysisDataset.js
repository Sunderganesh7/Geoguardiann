export const normalizeIsoDate = (value) => {
  if (typeof value !== "string") return "";
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
};

export const normalizeBbox = (value) => {
  const values = (Array.isArray(value) ? value : String(value || "").split(",")).map(Number);
  return values.length === 4 && values.every(Number.isFinite)
    ? values.map((coordinate) => String(coordinate)).join(",")
    : "";
};

export const resultMatchesConfig = (config, result) => {
  if (!result?.analysis) return true;
  const dataset = result.dataset || result;
  const configBbox = normalizeBbox(config.bbox);
  const resultBbox = normalizeBbox(dataset.bbox || result.bbox);
  if (configBbox && configBbox !== resultBbox) return false;
  const configBefore = normalizeIsoDate(config.beforeDate);
  const configAfter = normalizeIsoDate(config.afterDate);
  if (configBefore && configBefore !== normalizeIsoDate(dataset.beforeDate || result.analysis.beforeDate)) return false;
  if (configAfter && configAfter !== normalizeIsoDate(dataset.afterDate || result.analysis.afterDate)) return false;
  return true;
};
