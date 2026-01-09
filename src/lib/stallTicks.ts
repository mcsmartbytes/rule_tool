import type mapboxgl from "mapbox-gl";
import type { Feature, LineString } from "geojson";

/**
 * Generate perpendicular "stall divider" tick marks along a row.
 * Uses screen-space geometry for consistent visuals across latitudes.
 *
 * @param opts.map Mapbox map instance
 * @param opts.start Row start lng/lat
 * @param opts.end Row end lng/lat
 * @param opts.stallWidthFt e.g. 9
 * @param opts.tickLengthFt visual length of tick (approx), e.g. 2.5
 * @param opts.includeEnds whether to include tick at start/end
 * @param opts.featureProps additional properties to add to each tick feature
 */
export function buildStallTickFeatures(opts: {
  map: mapboxgl.Map;
  start: mapboxgl.LngLat;
  end: mapboxgl.LngLat;
  stallWidthFt: number;
  tickLengthFt?: number;
  includeEnds?: boolean;
  featureProps?: Record<string, unknown>;
}): Feature<LineString>[] {
  const {
    map,
    start,
    end,
    stallWidthFt,
    tickLengthFt = 2.5,
    includeEnds = false,
    featureProps = {},
  } = opts;

  if (stallWidthFt <= 0) return [];

  // Dynamic import mapboxgl for Point and MercatorCoordinate
  const mapboxgl = (map as any).constructor.__proto__.constructor;

  // Project endpoints to screen pixels
  const s = map.project(start);
  const e = map.project(end);

  const dx = e.x - s.x;
  const dy = e.y - s.y;

  const pxLen = Math.hypot(dx, dy);
  if (pxLen < 6) return [];

  // Convert feet to pixels at current zoom/lat
  // metersPerPixel at this latitude and zoom
  let metersPerPixel: number;
  try {
    metersPerPixel = mapboxgl.MercatorCoordinate.meterInMercatorCoordinateUnits(start.lat) * Math.pow(2, map.getZoom());
    // Actually use the correct formula
    metersPerPixel = 40075016.686 * Math.cos(start.lat * Math.PI / 180) / Math.pow(2, map.getZoom() + 8);
  } catch {
    // Fallback approximation
    metersPerPixel = 156543.03392 * Math.cos(start.lat * Math.PI / 180) / Math.pow(2, map.getZoom());
  }

  const feetPerPixel = metersPerPixel * 3.280839895;
  const pxPerFoot = feetPerPixel > 0 ? 1 / feetPerPixel : 0;
  if (pxPerFoot <= 0) return [];

  const stallWidthPx = stallWidthFt * pxPerFoot;
  const tickHalfPx = (tickLengthFt * pxPerFoot) / 2;

  // Unit vector along row in screen space
  const ux = dx / pxLen;
  const uy = dy / pxLen;

  // Perpendicular unit vector
  const px = -uy;
  const py = ux;

  // Number of stall boundaries we can fit
  const count = Math.floor(pxLen / stallWidthPx);
  if (count <= 0) return [];

  const features: Feature<LineString>[] = [];
  const startIndex = includeEnds ? 0 : 1;
  const endIndex = includeEnds ? count : count;

  for (let i = startIndex; i <= endIndex; i++) {
    const t = (i * stallWidthPx) / pxLen; // 0..1 along the row
    if (t < 0 || t > 1) continue;

    const cx = s.x + dx * t;
    const cy = s.y + dy * t;

    // Tick endpoints in screen space
    const aPoint = { x: cx + px * tickHalfPx, y: cy + py * tickHalfPx };
    const bPoint = { x: cx - px * tickHalfPx, y: cy - py * tickHalfPx };

    const A = map.unproject(aPoint as mapboxgl.PointLike);
    const B = map.unproject(bPoint as mapboxgl.PointLike);

    features.push({
      type: "Feature",
      properties: { ...featureProps, kind: "stall_tick", tickIndex: i },
      geometry: {
        type: "LineString",
        coordinates: [
          [A.lng, A.lat],
          [B.lng, B.lat],
        ],
      },
    });
  }

  return features;
}
