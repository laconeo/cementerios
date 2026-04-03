import { supabase } from './supabase';

// ─── MISIONEROS ─────────────────────────────────────────────────────────────

export const getMissionaries = async () => {
  const { data, error } = await supabase
    .from('missionaries')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
};

export const getMissionaryById = async (id: string) => {
  const { data, error } = await supabase
    .from('missionaries')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const createMissionary = async (data: any) => {
  const { data: record, error } = await supabase
    .from('missionaries')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return record;
};

export const updateMissionary = async (id: string, data: any) => {
  const { data: record, error } = await supabase
    .from('missionaries')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return record;
};

export const deleteMissionary = async (id: string) => {
  const { error } = await supabase
    .from('missionaries')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};

// ─── CEMENTERIOS ────────────────────────────────────────────────────────────

export const getCemeteries = async () => {
  const { data, error } = await supabase
    .from('cemeteries')
    .select('*, visits(*)');
  if (error) throw error;
  return data;
};

export const getCemeteryById = async (id: string) => {
  const { data, error } = await supabase
    .from('cemeteries')
    .select('*, visits(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const createCemetery = async (data: any) => {
  const { data: record, error } = await supabase
    .from('cemeteries')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return record;
};

export const updateCemetery = async (id: string, data: any) => {
  const { data: record, error } = await supabase
    .from('cemeteries')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return record;
};

export const deleteCemetery = async (id: string) => {
  const { error } = await supabase
    .from('cemeteries')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};

// ─── VISITAS ────────────────────────────────────────────────────────────────

export const addVisit = async (cemeteryId: string, visit: any) => {
  const { data, error } = await supabase
    .from('visits')
    .insert([{ ...visit, cemeteryId: cemeteryId }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ─── CONTACTOS ──────────────────────────────────────────────────────────────

export const getContacts = async () => {
  const { data, error } = await supabase
    .from('contacts')
    .select('*');
  if (error) throw error;
  return data;
};

export const createContact = async (data: any) => {
  const { data: record, error } = await supabase
    .from('contacts')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return record;
};

export const updateContact = async (id: string, data: any) => {
  const { data: record, error } = await supabase
    .from('contacts')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return record;
};
