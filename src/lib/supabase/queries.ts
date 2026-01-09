// Database query helpers for Rule Tool

import { supabase } from './client';
import type {
  Site,
  SiteInsert,
  SiteUpdate,
  SiteObject,
  SiteObjectInsert,
  SiteObjectUpdate,
  Trade,
  Service,
  TradeEstimate,
  TradeEstimateInsert,
  UnifiedEstimate,
  UnifiedEstimateInsert,
  Profile,
} from './types';

// ============================================
// Sites
// ============================================

export async function getSites() {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Site[];
}

export async function getSite(id: string) {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Site;
}

export async function createSite(site: SiteInsert) {
  const { data, error } = await supabase
    .from('sites')
    .insert(site)
    .select()
    .single();

  if (error) throw error;
  return data as Site;
}

export async function updateSite(id: string, updates: SiteUpdate) {
  const { data, error } = await supabase
    .from('sites')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Site;
}

export async function deleteSite(id: string) {
  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// Site Objects
// ============================================

export async function getSiteObjects(siteId: string) {
  const { data, error } = await supabase
    .from('site_objects')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as SiteObject[];
}

export async function createSiteObject(obj: SiteObjectInsert) {
  const { data, error } = await supabase
    .from('site_objects')
    .insert(obj)
    .select()
    .single();

  if (error) throw error;
  return data as SiteObject;
}

export async function updateSiteObject(id: string, updates: SiteObjectUpdate) {
  const { data, error } = await supabase
    .from('site_objects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SiteObject;
}

export async function deleteSiteObject(id: string) {
  const { error } = await supabase
    .from('site_objects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteSiteObjects(ids: string[]) {
  const { error } = await supabase
    .from('site_objects')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

// ============================================
// Trades
// ============================================

export async function getTrades() {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as Trade[];
}

export async function getDefaultTrades() {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as Trade[];
}

// ============================================
// Services
// ============================================

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Service[];
}

export async function getServicesByTrade(tradeId: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('trade_id', tradeId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Service[];
}

export async function getServiceByCode(code: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('code', code)
    .single();

  if (error) throw error;
  return data as Service;
}

// ============================================
// Trade Estimates
// ============================================

export async function getTradeEstimates(siteId: string) {
  const { data, error } = await supabase
    .from('trade_estimates')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as TradeEstimate[];
}

export async function saveTradeEstimate(estimate: TradeEstimateInsert) {
  const { data, error } = await supabase
    .from('trade_estimates')
    .upsert(estimate, { onConflict: 'site_id,trade_id' })
    .select()
    .single();

  if (error) throw error;
  return data as TradeEstimate;
}

// ============================================
// Unified Estimates
// ============================================

export async function getUnifiedEstimates(siteId: string) {
  const { data, error } = await supabase
    .from('unified_estimates')
    .select('*')
    .eq('site_id', siteId)
    .order('revision_number', { ascending: false });

  if (error) throw error;
  return data as UnifiedEstimate[];
}

export async function getLatestUnifiedEstimate(siteId: string) {
  const { data, error } = await supabase
    .from('unified_estimates')
    .select('*')
    .eq('site_id', siteId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
  return data as UnifiedEstimate | null;
}

export async function saveUnifiedEstimate(estimate: UnifiedEstimateInsert) {
  const { data, error } = await supabase
    .from('unified_estimates')
    .insert(estimate)
    .select()
    .single();

  if (error) throw error;
  return data as UnifiedEstimate;
}

// ============================================
// User Profile
// ============================================

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data as Profile;
}

// ============================================
// Full Site with Objects (for loading)
// ============================================

export async function getSiteWithObjects(siteId: string) {
  const [site, objects] = await Promise.all([
    getSite(siteId),
    getSiteObjects(siteId),
  ]);

  return { site, objects };
}
