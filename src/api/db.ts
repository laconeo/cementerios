// src/api/db.ts
// Capa de acceso a datos que habla con json-server en localhost:3001

const BASE_URL = 'http://localhost:3001';

// ─── HELPERS ────────────────────────────────────────────────────────────────

const get = async (path: string) => {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} fallido: ${res.statusText}`);
  return res.json();
};

const post = async (path: string, body: object) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} fallido: ${res.statusText}`);
  return res.json();
};

const patch = async (path: string, body: object) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} fallido: ${res.statusText}`);
  return res.json();
};

const del = async (path: string) => {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} fallido: ${res.statusText}`);
  return res.json();
};

// ─── MISIONEROS ─────────────────────────────────────────────────────────────

export const getMissionaries = () => get('/missionaries');
export const getMissionaryById = (id: number) => get(`/missionaries/${id}`);
export const createMissionary = (data: object) => post('/missionaries', data);
export const updateMissionary = (id: number, data: object) => patch(`/missionaries/${id}`, data);
export const deleteMissionary = (id: number) => del(`/missionaries/${id}`);

// ─── CEMENTERIOS ────────────────────────────────────────────────────────────

export const getCemeteries = () => get('/cemeteries');
export const getCemeteryById = (id: number) => get(`/cemeteries/${id}`);
export const createCemetery = (data: object) => post('/cemeteries', data);
export const updateCemetery = (id: number, data: object) => patch(`/cemeteries/${id}`, data);
export const deleteCemetery = (id: number) => del(`/cemeteries/${id}`);

// ─── VISITAS (guardadas dentro del cementerio) ───────────────────────────────

/** Agrega una visita a un cementerio existente */
export const addVisit = async (cemeteryId: number, visit: object) => {
  const cemetery = await getCemeteryById(cemeteryId);
  const visits = cemetery.visits || [];
  const newVisit = { id: Date.now(), ...visit };
  return patch(`/cemeteries/${cemeteryId}`, { visits: [newVisit, ...visits] });
};

// ─── CONTACTOS ──────────────────────────────────────────────────────────────

export const getContacts = () => get('/contacts');
export const createContact = (data: object) => post('/contacts', data);
export const updateContact = (id: number, data: object) => patch(`/contacts/${id}`, data);
