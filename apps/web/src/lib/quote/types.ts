export type Mode = "MAP" | "PHOTO";
export type QuoteWorkflowMode = "QUOTE" | "EDIT";

export type MeasurementType = "AREA" | "LENGTH" | "COUNT";

export type MapFocus = {
  lng: number;
  lat: number;
  zoom?: number;
  address?: string;
  requestedAt: number;
};

export type ServiceTemplate = {
  id: string;
  name: string;
  measurementType: MeasurementType; // AREA for sealcoat, LENGTH for striping, etc.
  unitLabel: "sqft" | "ft" | "ea";
  defaultRate: number;
  minimumCharge?: number;
};

export type GeometryKind = "POLYGON" | "POLYLINE" | "POINT";

export type Geometry = {
  id: string;
  serviceId: string;
  kind: GeometryKind;

  // raw data by mode:
  mapGeoJson?: GeoJSON.Feature;  // for MAP mode
  photoPoints?: { x: number; y: number }[]; // for PHOTO mode (image pixels)

  measurementValue: number; // sqft / ft / ea
  createdAt: string;
  updatedAt: string;
};

export type QuoteLine = {
  serviceId: string;
  serviceName: string;
  qty: number;
  unitLabel: "sqft" | "ft" | "ea";
  rate: number;
  subtotal: number;
  minApplied: boolean;
};

export type MeasurementDoc = {
  id: string;
  jobId: string;
  name: string;                 // "Parking lot - North"
  mode: Mode;                   // MAP or PHOTO
  photoMeta?: {
    imageUrl: string;
    // calibration: pixels -> feet
    pixelsPerFoot: number;
  };
  geometries: Geometry[];
  createdAt: string;
  updatedAt: string;
};
