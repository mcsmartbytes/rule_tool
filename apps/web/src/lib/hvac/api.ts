/**
 * HVAC Estimating Platform - API Utilities
 * Supabase CRUD operations for HVAC entities
 */

import { supabase } from '@/lib/supabase/client';
import type {
  HvacProject,
  HvacDocument,
  HvacDocumentPage,
  HvacEquipment,
  HvacDuctwork,
  HvacFitting,
  HvacAirDevice,
  HvacControl,
  HvacPiping,
  HvacDamper,
  HvacChecklist,
  HvacRiskFlag,
  HvacEstimate,
  HvacEstimateNote,
  HvacUserSettings,
  CreateHvacProjectRequest,
  UpdateHvacProjectRequest,
} from './types';

// ============================================================================
// PROJECTS
// ============================================================================

export async function getHvacProjects(): Promise<HvacProject[]> {
  const { data, error } = await supabase
    .from('hvac_projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getHvacProject(id: string): Promise<HvacProject | null> {
  const { data, error } = await supabase
    .from('hvac_projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createHvacProject(
  project: CreateHvacProjectRequest
): Promise<HvacProject> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('hvac_projects')
    .insert({ ...project, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacProject(
  id: string,
  updates: Partial<HvacProject>
): Promise<HvacProject> {
  const { data, error } = await supabase
    .from('hvac_projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacProject(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_projects').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export async function getHvacDocuments(projectId: string): Promise<HvacDocument[]> {
  const { data, error } = await supabase
    .from('hvac_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createHvacDocument(
  document: Omit<HvacDocument, 'id' | 'created_at'>
): Promise<HvacDocument> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('hvac_documents')
    .insert({ ...document, uploaded_by: user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacDocument(
  id: string,
  updates: Partial<HvacDocument>
): Promise<HvacDocument> {
  const { data, error } = await supabase
    .from('hvac_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacDocument(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_documents').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// DOCUMENT PAGES
// ============================================================================

export async function getHvacDocumentPages(
  documentId: string
): Promise<HvacDocumentPage[]> {
  const { data, error } = await supabase
    .from('hvac_document_pages')
    .select('*')
    .eq('document_id', documentId)
    .order('page_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateHvacDocumentPage(
  id: string,
  updates: Partial<HvacDocumentPage>
): Promise<HvacDocumentPage> {
  const { data, error } = await supabase
    .from('hvac_document_pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// EQUIPMENT
// ============================================================================

export async function getHvacEquipment(projectId: string): Promise<HvacEquipment[]> {
  const { data, error } = await supabase
    .from('hvac_equipment')
    .select('*')
    .eq('project_id', projectId)
    .order('tag', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createHvacEquipment(
  equipment: Omit<HvacEquipment, 'id' | 'created_at' | 'updated_at'>
): Promise<HvacEquipment> {
  const { data, error } = await supabase
    .from('hvac_equipment')
    .insert(equipment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacEquipment(
  id: string,
  updates: Partial<HvacEquipment>
): Promise<HvacEquipment> {
  const { data, error } = await supabase
    .from('hvac_equipment')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacEquipment(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_equipment').delete().eq('id', id);

  if (error) throw error;
}

export async function bulkCreateHvacEquipment(
  items: Omit<HvacEquipment, 'id' | 'created_at' | 'updated_at'>[]
): Promise<HvacEquipment[]> {
  const { data, error } = await supabase
    .from('hvac_equipment')
    .insert(items)
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================================================
// DUCTWORK
// ============================================================================

export async function getHvacDuctwork(projectId: string): Promise<HvacDuctwork[]> {
  const { data, error } = await supabase
    .from('hvac_ductwork')
    .select('*')
    .eq('project_id', projectId)
    .order('duct_type', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createHvacDuctwork(
  ductwork: Omit<HvacDuctwork, 'id' | 'created_at'>
): Promise<HvacDuctwork> {
  const { data, error } = await supabase
    .from('hvac_ductwork')
    .insert(ductwork)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacDuctwork(
  id: string,
  updates: Partial<HvacDuctwork>
): Promise<HvacDuctwork> {
  const { data, error } = await supabase
    .from('hvac_ductwork')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacDuctwork(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_ductwork').delete().eq('id', id);

  if (error) throw error;
}

export async function bulkCreateHvacDuctwork(
  items: Omit<HvacDuctwork, 'id' | 'created_at'>[]
): Promise<HvacDuctwork[]> {
  const { data, error } = await supabase
    .from('hvac_ductwork')
    .insert(items)
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================================================
// FITTINGS
// ============================================================================

export async function getHvacFittings(projectId: string): Promise<HvacFitting[]> {
  const { data, error } = await supabase
    .from('hvac_fittings')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data || [];
}

export async function createHvacFitting(
  fitting: Omit<HvacFitting, 'id' | 'created_at'>
): Promise<HvacFitting> {
  const { data, error } = await supabase
    .from('hvac_fittings')
    .insert(fitting)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacFitting(
  id: string,
  updates: Partial<HvacFitting>
): Promise<HvacFitting> {
  const { data, error } = await supabase
    .from('hvac_fittings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacFitting(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_fittings').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// AIR DEVICES
// ============================================================================

export async function getHvacAirDevices(projectId: string): Promise<HvacAirDevice[]> {
  const { data, error } = await supabase
    .from('hvac_air_devices')
    .select('*')
    .eq('project_id', projectId)
    .order('device_type', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createHvacAirDevice(
  device: Omit<HvacAirDevice, 'id' | 'created_at'>
): Promise<HvacAirDevice> {
  const { data, error } = await supabase
    .from('hvac_air_devices')
    .insert(device)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacAirDevice(
  id: string,
  updates: Partial<HvacAirDevice>
): Promise<HvacAirDevice> {
  const { data, error } = await supabase
    .from('hvac_air_devices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacAirDevice(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_air_devices').delete().eq('id', id);

  if (error) throw error;
}

export async function bulkCreateHvacAirDevices(
  items: Omit<HvacAirDevice, 'id' | 'created_at'>[]
): Promise<HvacAirDevice[]> {
  const { data, error } = await supabase
    .from('hvac_air_devices')
    .insert(items)
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================================================
// CONTROLS
// ============================================================================

export async function getHvacControls(projectId: string): Promise<HvacControl[]> {
  const { data, error } = await supabase
    .from('hvac_controls')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data || [];
}

export async function createHvacControl(
  control: Omit<HvacControl, 'id' | 'created_at'>
): Promise<HvacControl> {
  const { data, error } = await supabase
    .from('hvac_controls')
    .insert(control)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacControl(
  id: string,
  updates: Partial<HvacControl>
): Promise<HvacControl> {
  const { data, error } = await supabase
    .from('hvac_controls')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacControl(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_controls').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// PIPING
// ============================================================================

export async function getHvacPiping(projectId: string): Promise<HvacPiping[]> {
  const { data, error } = await supabase
    .from('hvac_piping')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data || [];
}

export async function createHvacPiping(
  piping: Omit<HvacPiping, 'id' | 'created_at'>
): Promise<HvacPiping> {
  const { data, error } = await supabase
    .from('hvac_piping')
    .insert(piping)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacPiping(
  id: string,
  updates: Partial<HvacPiping>
): Promise<HvacPiping> {
  const { data, error } = await supabase
    .from('hvac_piping')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacPiping(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_piping').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// DAMPERS
// ============================================================================

export async function getHvacDampers(projectId: string): Promise<HvacDamper[]> {
  const { data, error } = await supabase
    .from('hvac_dampers')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data || [];
}

export async function createHvacDamper(
  damper: Omit<HvacDamper, 'id' | 'created_at'>
): Promise<HvacDamper> {
  const { data, error } = await supabase
    .from('hvac_dampers')
    .insert(damper)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacDamper(
  id: string,
  updates: Partial<HvacDamper>
): Promise<HvacDamper> {
  const { data, error } = await supabase
    .from('hvac_dampers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacDamper(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_dampers').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// CHECKLIST
// ============================================================================

export async function getHvacChecklist(projectId: string): Promise<HvacChecklist | null> {
  const { data, error } = await supabase
    .from('hvac_checklists')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createHvacChecklist(projectId: string): Promise<HvacChecklist> {
  const { data, error } = await supabase
    .from('hvac_checklists')
    .insert({ project_id: projectId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacChecklist(
  projectId: string,
  updates: Partial<HvacChecklist>
): Promise<HvacChecklist> {
  const { data, error } = await supabase
    .from('hvac_checklists')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// RISK FLAGS
// ============================================================================

export async function getHvacRiskFlags(projectId: string): Promise<HvacRiskFlag[]> {
  const { data, error } = await supabase
    .from('hvac_risk_flags')
    .select('*')
    .eq('project_id', projectId)
    .order('severity', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createHvacRiskFlag(
  flag: Omit<HvacRiskFlag, 'id' | 'created_at'>
): Promise<HvacRiskFlag> {
  const { data, error } = await supabase
    .from('hvac_risk_flags')
    .insert(flag)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacRiskFlag(
  id: string,
  updates: Partial<HvacRiskFlag>
): Promise<HvacRiskFlag> {
  const { data, error } = await supabase
    .from('hvac_risk_flags')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacRiskFlag(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_risk_flags').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// ESTIMATES
// ============================================================================

export async function getHvacEstimates(projectId: string): Promise<HvacEstimate[]> {
  const { data, error } = await supabase
    .from('hvac_estimates')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCurrentHvacEstimate(
  projectId: string
): Promise<HvacEstimate | null> {
  const { data, error } = await supabase
    .from('hvac_estimates')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_current', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createHvacEstimate(
  estimate: Omit<HvacEstimate, 'id' | 'created_at' | 'updated_at'>
): Promise<HvacEstimate> {
  const { data: { user } } = await supabase.auth.getUser();

  // Mark existing estimates as not current
  await supabase
    .from('hvac_estimates')
    .update({ is_current: false })
    .eq('project_id', estimate.project_id);

  const { data, error } = await supabase
    .from('hvac_estimates')
    .insert({ ...estimate, created_by: user?.id, is_current: true })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacEstimate(
  id: string,
  updates: Partial<HvacEstimate>
): Promise<HvacEstimate> {
  const { data, error } = await supabase
    .from('hvac_estimates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// ESTIMATE NOTES
// ============================================================================

export async function getHvacEstimateNotes(
  estimateId: string
): Promise<HvacEstimateNote[]> {
  const { data, error } = await supabase
    .from('hvac_estimate_notes')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createHvacEstimateNote(
  note: Omit<HvacEstimateNote, 'id' | 'created_at'>
): Promise<HvacEstimateNote> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('hvac_estimate_notes')
    .insert({ ...note, created_by: user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHvacEstimateNote(
  id: string,
  updates: Partial<HvacEstimateNote>
): Promise<HvacEstimateNote> {
  const { data, error } = await supabase
    .from('hvac_estimate_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHvacEstimateNote(id: string): Promise<void> {
  const { error } = await supabase.from('hvac_estimate_notes').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// USER SETTINGS
// ============================================================================

export async function getHvacUserSettings(): Promise<HvacUserSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('hvac_user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createOrUpdateHvacUserSettings(
  settings: Partial<HvacUserSettings>
): Promise<HvacUserSettings> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('hvac_user_settings')
    .upsert({ ...settings, user_id: user.id, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function loadFullProjectData(projectId: string) {
  const [
    project,
    documents,
    equipment,
    ductwork,
    fittings,
    airDevices,
    controls,
    piping,
    dampers,
    checklist,
    riskFlags,
    estimate,
  ] = await Promise.all([
    getHvacProject(projectId),
    getHvacDocuments(projectId),
    getHvacEquipment(projectId),
    getHvacDuctwork(projectId),
    getHvacFittings(projectId),
    getHvacAirDevices(projectId),
    getHvacControls(projectId),
    getHvacPiping(projectId),
    getHvacDampers(projectId),
    getHvacChecklist(projectId),
    getHvacRiskFlags(projectId),
    getCurrentHvacEstimate(projectId),
  ]);

  return {
    project,
    documents,
    equipment,
    ductwork,
    fittings,
    airDevices,
    controls,
    piping,
    dampers,
    checklist,
    riskFlags,
    estimate,
  };
}

export async function deleteAllProjectTakeoff(projectId: string): Promise<void> {

  await Promise.all([
    supabase.from('hvac_equipment').delete().eq('project_id', projectId),
    supabase.from('hvac_ductwork').delete().eq('project_id', projectId),
    supabase.from('hvac_fittings').delete().eq('project_id', projectId),
    supabase.from('hvac_air_devices').delete().eq('project_id', projectId),
    supabase.from('hvac_controls').delete().eq('project_id', projectId),
    supabase.from('hvac_piping').delete().eq('project_id', projectId),
    supabase.from('hvac_dampers').delete().eq('project_id', projectId),
  ]);
}
