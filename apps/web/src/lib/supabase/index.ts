// Supabase exports for Rule Tool

// Client
export { supabase } from './client';
export type { User, Session } from './client';

// Types
export type {
  Database,
  Json,
  UserRole,
  SiteStatus,
  EstimateStatus,
  ObjectSource,
  UnitType,
  SiteObjectType,
  Coordinates,
  MapBounds,
  SiteSettings,
  TradeSettings,
  ObjectMeasurements,
  TradeObjectMapping,
  RiskFlag,
  Organization,
  Profile,
  Site,
  SiteObject,
  Trade,
  Service,
  EstimateLineItem,
  ObjectDerivation,
  TradeEstimate,
  UnifiedEstimate,
  RevisionChange,
  EstimateRevision,
  // Insert types
  SiteInsert,
  SiteObjectInsert,
  TradeEstimateInsert,
  UnifiedEstimateInsert,
  // Update types
  SiteUpdate,
  SiteObjectUpdate,
} from './types';

// Queries
export {
  // Sites
  getSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  // Site Objects
  getSiteObjects,
  createSiteObject,
  updateSiteObject,
  deleteSiteObject,
  deleteSiteObjects,
  // Trades
  getTrades,
  getDefaultTrades,
  // Services
  getServices,
  getServicesByTrade,
  getServiceByCode,
  // Trade Estimates
  getTradeEstimates,
  saveTradeEstimate,
  // Unified Estimates
  getUnifiedEstimates,
  getLatestUnifiedEstimate,
  saveUnifiedEstimate,
  // Profile
  getCurrentProfile,
  // Combined
  getSiteWithObjects,
} from './queries';
