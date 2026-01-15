import type { Feature, LineString } from "geojson";

export type StallLayout = "single" | "double";

export type StallGroupMeasurement = {
  id: string;
  type: "STALL_GROUP";
  geometry: Feature<LineString>;
  row_length_ft: number;
  stall_width_ft: number;
  stall_depth_ft: number;
  stall_count: number;
  lineal_feet: number;
  layout: StallLayout;
  has_accessible: boolean;
  accessible_count: number;
  has_stop_bars: boolean;
  stop_bar_count: number;
  created_at: string;
};
