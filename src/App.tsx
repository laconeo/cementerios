import React, { useState, useEffect, useRef } from 'react';
import * as api from './api/db';
import * as auth from './api/auth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Map, List, Users, LogOut, MapPin, CheckCircle, 
  ChevronRight, Search, Filter, Plus, FileText, 
  Calendar, Activity, Camera, HeartHandshake,
  Globe, Shield, Database, ArrowRight, Printer, AlertCircle, Save
} from 'lucide-react';
import { NewCemeteryScreen } from './components/NewCemeteryScreen';

// ─── STAGES (estático, no viene de la DB) ───────────────────────────────────
const stages = [
  { id: 0, name: "Relevado E0", icon: MapPin, desc: "Identificación y geolocalización inicial.", color: "var(--color-fs-gray)" },
  { id: 1, name: "Contacto E1", icon: Users, desc: "Primer acercamiento con la administración.", color: "var(--color-fs-blue)" },
  { id: 2, name: "Registros E2", icon: FileText, desc: "Evaluación del volumen y estado de libros.", color: "var(--color-fs-orange)" },
  { id: 3, name: "Cita Inst. E3", icon: Calendar, desc: "Reunión formal para acordar digitalización.", color: "var(--color-fs-purple)" },
  { id: 4, name: "Digitalizado E4", icon: Camera, desc: "Captura de imágenes completada.", color: "var(--color-fs-teal)" },
  { id: 5, name: "Postventa E5", icon: HeartHandshake, desc: "Entrega de DRR y capacitación.", color: "var(--color-fs-green)" },
];

const COUNTRY_DATA = [
  { name: "Argentina", prefix: "+54" },
  { name: "Chile", prefix: "+56" },
  { name: "Uruguay", prefix: "+598" },
  { name: "Paraguay", prefix: "+595" },
  { name: "Bolivia", prefix: "+591" },
  { name: "Perú", prefix: "+51" },
  { name: "Brasil", prefix: "+55" },
  { name: "Colombia", prefix: "+57" },
  { name: "Ecuador", prefix: "+593" },
];

/**
 * Formatea una fecha de YYYY-MM-DD o ISO a DD/MM/YYYY
 */
const formatDisplayDate = (dateStr: string | null | undefined) => {
  if (!dateStr || dateStr === "") return "No definida";
  // Si viene con T (ISO), tomamos la parte de la fecha
  const onlyDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const parts = onlyDate.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
};

// Custom Leaflet Icon matching FamilySearch green
const getCustomIcon = (color: string) => new L.DivIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// --- COMPONENTS ---

const Stepper = ({ currentStage, onStageClick }: { currentStage: number, onStageClick?: (stage: number) => void }) => {
  return (
    <div className="w-full overflow-x-auto hide-scrollbar pb-4">
      <div className="min-w-[600px] flex items-center justify-between relative px-4">
        {/* Background Line */}
        <div className="absolute left-8 right-8 top-5 h-1 bg-[var(--color-fs-border)] z-0 rounded-full"></div>
        {/* Active Line (up to current active stage in UI) */}
        <div 
          className="absolute left-8 top-5 h-1 bg-[var(--color-primary)] z-0 transition-all duration-500 rounded-full" 
          style={{ width: `calc(${(currentStage / (stages.length - 1)) * 100}% - 2rem)` }}
        ></div>

        {stages.map((stage, idx) => {
          const isActive = idx === currentStage;
          const isCompleted = idx < currentStage;
          const Icon = stage.icon;

          return (
            <div 
              key={stage.id} 
              className={`relative z-10 flex flex-col items-center w-24 ${onStageClick ? 'cursor-pointer group' : ''}`}
              onClick={() => onStageClick && onStageClick(idx)}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                isActive ? 'bg-[var(--color-fs-bg)] scale-110 shadow-md ring-4 ring-[var(--color-primary-50)]' : 
                isCompleted ? 'text-white' : 
                'bg-[var(--color-fs-bg)] border-[var(--color-fs-border)] text-[var(--color-fs-text-secondary)]'
              }`}
              style={{
                borderColor: isActive || isCompleted ? stage.color : '',
                backgroundColor: isCompleted ? stage.color : '',
                color: isActive ? stage.color : ''
              }}>
                {isCompleted ? <CheckCircle size={18} /> : <Icon size={18} />}
              </div>
              <div className="mt-3 text-center">
                <span className={`text-[10px] font-bold block transition-colors ${
                  isActive ? 'text-[var(--color-primary)]' : 
                  isCompleted ? 'text-[var(--color-fs-text)]' : 'text-[var(--color-fs-text-secondary)]'
                } group-hover:text-[var(--color-primary)]`}>
                  {stage.name}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const Toast = ({ message, type }: { message: string, type: 'success' | 'error' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className="fixed right-6 top-6 z-[9999] flex items-center space-x-4 px-6 py-4 rounded-2xl shadow-[0_25px_60px_-10px_rgba(0,0,0,0.25)] backdrop-blur-xl border border-white/40 bg-white/70 dark:bg-black/60 dark:border-white/10"
      style={{
        maxWidth: '90vw',
        minWidth: '350px'
      }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform transition-transform ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}>
        {type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[var(--color-fs-text-secondary)] opacity-50 mb-0.5">
          {type === 'success' ? 'Notificación' : 'Error del sistema'}
        </span>
        <p className="text-sm font-extrabold text-[var(--color-secondary)] dark:text-white tracking-tight leading-snug">{message}</p>
      </div>
    </motion.div>
  );
};

const LoginScreen = ({ onLogin, onRegister }: { onLogin: (e: string, p: string) => Promise<void>, onRegister: (m: any, p: string) => Promise<void> }) => {
  const [view, setView] = useState<'login' | 'forgot' | 'contact' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regData, setRegData] = useState({ name: '', email: '', phone: '', country: '', password: '' });
  const [regSuccess, setRegSuccess] = useState(false);
  const [emailWarning, setEmailWarning] = useState(false);

  const handlePhoneChange = (val: string) => {
    let newCountry = regData.country;
    // Detectar país por prefijo
    const match = COUNTRY_DATA.find(c => val.startsWith(c.prefix));
    if (match) newCountry = match.name;
    setRegData({...regData, phone: val, country: newCountry});
  };

  const handleCountryChange = (val: string) => {
    let newPhone = regData.phone;
    const country = COUNTRY_DATA.find(c => c.name === val);
    if (country && (!newPhone || newPhone.trim() === '')) {
      newPhone = country.prefix + ' ' ;
    }
    setRegData({...regData, country: val, phone: newPhone});
  };

  const handleEmailChange = (val: string) => {
    setRegData({...regData, email: val});
    setEmailWarning(val.includes('@') && !val.toLowerCase().endsWith('@gmail.com'));
  };

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(email, password);
      showToast('Bienvenido de nuevo');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      showToast(err.message || 'Error al iniciar sesión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onRegister({
        name: regData.name,
        email: regData.email,
        phone: regData.phone,
        country: regData.country,
        status: 'Pendiente'
      }, regData.password);
      setRegSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-fs-bg-alt)] p-4 font-sans relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel border border-[var(--color-fs-border)] shadow-[var(--shadow-card)] rounded-3xl p-10 max-w-xl w-full relative z-10 bg-[var(--color-fs-bg)]"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
        </div>

        {view === 'login' && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-center text-[var(--color-fs-text)] mb-2 tracking-tight">
              OC Oportunidades Cementerios
            </h1>
            <p className="text-sm text-center text-[var(--color-fs-text-secondary)] mb-8 leading-relaxed">
              Sistema de apoyo al voluntario/misionero para digitalización de cementerios
            </p>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm border border-red-100 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <input 
                  type="email" 
                  placeholder="Correo electrónico" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]"
                />
              </div>
              <div>
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]"
                />
              </div>
              
              <div className="flex flex-col space-y-4 pt-1">
                <button 
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-sm text-[var(--color-primary)] hover:underline self-start font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
                
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>
              </div>
            </form>


          </div>
        )}

        {view === 'forgot' && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-center text-[var(--color-fs-text)] mb-4 tracking-tight">
              Recuperación de contraseña
            </h1>
            <p className="text-sm text-center text-[var(--color-fs-text-secondary)] mb-6">
              Ingresa tu correo electrónico para recibir un enlace de recuperación.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert('Enlace de recuperación enviado a tu correo.'); setView('login'); }} className="space-y-4">
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                required
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]"
              />
              <button type="submit" className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium py-3 rounded-xl transition-colors">
                Enviar enlace
              </button>
            </form>
            <div className="mt-6 text-center">
              <button onClick={() => setView('login')} className="text-sm text-[var(--color-primary)] hover:underline">
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        )}

        {view === 'contact' && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-center text-[var(--color-fs-text)] mb-4 tracking-tight">
              Solicitud de Contacto
            </h1>
            <p className="text-sm text-center text-[var(--color-fs-text-secondary)] mb-6">
              Déjanos tus datos y un representante se comunicará contigo.
            </p>
            <form 
              onSubmit={(e: any) => { 
                e.preventDefault(); 
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                api.createContact(data)
                  .then(() => {
                    alert('Solicitud enviada con éxito. Nos pondremos en contacto pronto.'); 
                    setView('login');
                  })
                  .catch(err => alert('Error al enviar solicitud: ' + err.message));
              }} 
              className="space-y-4"
            >
              <input name="name" type="text" placeholder="Nombre completo" required className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]" />
              <input name="institution" type="text" placeholder="Institución / Cementerio" required className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]" />
              <input name="email" type="email" placeholder="Correo electrónico" required className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]" />
              <textarea name="message" placeholder="Mensaje" rows={3} required className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]"></textarea>
              <button type="submit" className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium py-3 rounded-xl transition-colors">
                Enviar Solicitud
              </button>
            </form>
            <div className="mt-6 text-center">
              <button onClick={() => setView('login')} className="text-sm text-[var(--color-primary)] hover:underline">
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        )}
        {view === 'register' && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-center text-[var(--color-fs-text)] mb-4 tracking-tight">
              Registro de Misionero/Voluntario
            </h1>
            
            {regSuccess ? (
              <div className="text-center space-y-4">
                <div className="bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200 p-4 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="font-medium">¡Cuenta creada con éxito!</p>
                  <p className="text-sm mt-2">Se ha enviado un correo de verificación a <strong>{regData.email}</strong>.</p>
                  <p className="text-sm mt-2">Tu cuenta se encuentra en estado <strong>Pendiente</strong> hasta ser validada por un administrador.</p>
                </div>
                <button 
                  onClick={() => { setView('login'); setRegSuccess(false); setRegData({ name: '', email: '', phone: '', country: '' }); }}
                  className="mt-4 w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-center text-[var(--color-fs-text-secondary)] mb-6">
                  Completa tus datos para solicitar acceso al sistema.
                </p>
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Nombre completo" 
                    required
                    value={regData.name}
                    onChange={e => setRegData({...regData, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]" 
                  />
                  <div className="space-y-1">
                    <input 
                      type="email" 
                      placeholder="Correo electrónico" 
                      required
                      value={regData.email}
                      onChange={e => handleEmailChange(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]" 
                    />
                    {emailWarning && (
                      <div className="bg-[#FFFBEB] dark:bg-[#451A03] border border-[#FDE68A] dark:border-[#92400E] text-[#92400E] dark:text-[#FDE68A] p-3 rounded-xl text-xs flex items-start gap-2 animate-fade-in mb-2">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <p>Te recomendamos usar una cuenta de <b>@gmail.com</b> para asegurar que recibas los correos de confirmación sin problemas.</p>
                      </div>
                    )}
                  </div>
                  <select 
                    required
                    value={regData.country}
                    onChange={e => handleCountryChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]" 
                  >
                    <option value="">Selecciona tu país</option>
                    {COUNTRY_DATA.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    <option value="Otro">Otro</option>
                  </select>
                  <input 
                    type="tel" 
                    placeholder="Teléfono (Ej: +54 9 11 1234 5678)" 
                    required
                    value={regData.phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]" 
                  />
                  <input 
                    type="password" 
                    placeholder="Crea una contraseña" 
                    required
                    value={regData.password}
                    onChange={e => setRegData({...regData, password: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all text-[var(--color-fs-text)]" 
                  />
                  <button type="submit" disabled={loading} className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50">
                    {loading ? 'Registrando...' : 'Registrarse'}
                  </button>
                </form>
                <div className="mt-6 text-center">
                  <button onClick={() => setView('login')} className="text-sm text-[var(--color-primary)] hover:underline">
                    ¿Ya tienes cuenta? Inicia sesión
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>



      <footer className="absolute bottom-4 w-full text-center text-sm text-[var(--color-fs-text-secondary)]">
        <p>© 2026 Hecho con ❤️ para proveer apoyo al usuario</p>
        {view !== 'register' && (
          <button 
            onClick={() => setView('register')}
            className="hover:underline transition-colors opacity-70 hover:opacity-100"
            style={{ fontSize: '10px', color: 'var(--color-fs-text-secondary)', marginTop: '4px' }}
          >
            Acceso misioneros de servicio
          </button>
        )}
      </footer>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
};

const Layout = ({ children, currentView, setCurrentView, onLogout }: any) => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-fs-bg-alt)] font-sans print:min-h-0 print:h-auto print:block print:bg-white">
      {/* Top Navbar */}
      <nav className="glass-panel text-[var(--color-fs-text)] shadow-sm sticky top-0 z-40 border-b border-[var(--color-fs-border)] print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  OC
                </div>
                <span className="font-bold tracking-wide hidden sm:block text-[var(--color-secondary)]">Oportunidades Cementerios</span>
              </div>
              
              <div className="hidden md:flex space-x-1">
                <button 
                  onClick={() => setCurrentView('dashboard')} 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'text-[var(--color-fs-text-secondary)] hover:bg-[var(--color-fs-bg-alt)] hover:text-[var(--color-primary)]'}`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => setCurrentView('list')} 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'list' || currentView === 'detail' || currentView === 'new' ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'text-[var(--color-fs-text-secondary)] hover:bg-[var(--color-fs-bg-alt)] hover:text-[var(--color-primary)]'}`}
                >
                  Cementerios
                </button>
                <button 
                  onClick={() => setCurrentView('missionaries')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'missionaries' ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'text-[var(--color-fs-text-secondary)] hover:bg-[var(--color-fs-bg-alt)] hover:text-[var(--color-primary)]'}`}
                >
                  Misioneros
                </button>
                <button 
                  onClick={() => setCurrentView('reports')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'reports' ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'text-[var(--color-fs-text-secondary)] hover:bg-[var(--color-fs-bg-alt)] hover:text-[var(--color-primary)]'}`}
                >
                  Informes
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-800)] flex items-center justify-center font-bold border border-[var(--color-primary-50)]">
                  A
                </div>
                <span className="font-medium text-[var(--color-fs-text-secondary)]">Admin User</span>
              </div>
              <button onClick={onLogout} className="p-2 text-[var(--color-fs-text-secondary)] hover:bg-[var(--color-fs-bg-alt)] hover:text-[var(--color-secondary)] rounded-full transition-colors" title="Cerrar Sesión">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto print:overflow-visible print:p-0 print:block">
        <motion.div 
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-7xl mx-auto pb-12"
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-[var(--color-fs-text-secondary)] border-t border-[var(--color-fs-border)] print:hidden">
        © 2026 Hecho con ❤️ para proveer apoyo al usuario
      </footer>
    </div>
  );
};

const DashboardScreen = ({ onNavigateToList, onOpenDetail, cemeteries, missionaries, onNavigateToMissionaries, onNavigateToNewCemetery }: any) => {
  const stats = [
    { label: "Total Relevados", value: cemeteries.length, borderColor: "border-[var(--color-fs-gray)]", dotColor: "bg-[var(--color-fs-gray)]", stageId: null },
    { label: "Etapa 1: Contacto", value: cemeteries.filter((c: any) => c.stage === 1).length, borderColor: "border-[var(--color-fs-blue)]", dotColor: "bg-[var(--color-fs-blue)]", stageId: 1 },
    { label: "Etapa 2: Registros", value: cemeteries.filter((c: any) => c.stage === 2).length, borderColor: "border-[var(--color-fs-orange)]", dotColor: "bg-[var(--color-fs-orange)]", stageId: 2 },
    { label: "Etapa 3: Citas", value: cemeteries.filter((c: any) => c.stage === 3).length, borderColor: "border-[var(--color-fs-purple)]", dotColor: "bg-[var(--color-fs-purple)]", stageId: 3 },
    { label: "Etapa 4: Digitalizado", value: cemeteries.filter((c: any) => c.stage === 4).length, borderColor: "border-[var(--color-fs-teal)]", dotColor: "bg-[var(--color-fs-teal)]", stageId: 4 },
    { label: "Etapa 5: Postventa", value: cemeteries.filter((c: any) => c.stage === 5).length, borderColor: "border-[var(--color-fs-green)]", dotColor: "bg-[var(--color-fs-green)]", stageId: 5 },
  ];

  const totalVisits = cemeteries.reduce((acc: number, cem: any) => acc + (cem.visits ? cem.visits.length : 0), 0);
  const activeMissionaries = missionaries.filter((m: any) => m.status === 'Activo').length;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-[var(--color-secondary)]">Dashboard Ejecutivo</h2>
        <button 
          onClick={onNavigateToNewCemetery}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Agregar Cementerio</span>
        </button>
      </div>

      {/* Stats Grid - Clickable Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <motion.button 
            key={i} 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateToList(stat.stageId)}
            className={`bg-[var(--color-fs-bg)] p-5 rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] border-t-4 ${stat.borderColor} hover:shadow-[var(--shadow-card-hover)] transition-shadow text-left group flex flex-col justify-between`}
          >
            <p className="text-sm font-medium text-[var(--color-fs-text-secondary)] group-hover:text-[var(--color-secondary)] transition-colors line-clamp-2 h-10">{stat.label}</p>
            <p className="text-4xl font-bold mt-2 text-[var(--color-secondary)]">{stat.value}</p>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real Leaflet Map */}
        <div className="lg:col-span-2 bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] flex flex-col overflow-hidden h-[500px] border border-[var(--color-fs-border)]">
          <div className="p-5 border-b border-[var(--color-fs-border)] flex justify-between items-center bg-[var(--color-fs-bg-alt)]">
            <h3 className="font-bold text-lg text-[var(--color-fs-text)]">Mapa de Cobertura</h3>
            <span className="text-sm text-[var(--color-primary)] font-medium bg-[var(--color-primary-50)] px-3 py-1 rounded-full">En vivo</span>
          </div>
          <div className="flex-1 relative z-10">
            <MapContainer 
              center={[-33.5, -60]} 
              zoom={5} 
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {cemeteries.map((cem: any) => (
                <Marker 
                  key={cem.id} 
                  position={[cem.lat, cem.lng]}
                  icon={getCustomIcon(stages[cem.stage].color)}
                >
                  <Popup>
                    <div className="text-center p-1 font-sans">
                      <h4 className="font-bold text-[var(--color-fs-text)] mb-1">{cem.name}</h4>
                      <p className="text-xs text-[var(--color-fs-text-secondary)] mb-1">Imágenes: {cem.inventory}</p>
                      <p className="text-xs text-[var(--color-fs-text-secondary)] mb-3">Etapa: {stages[cem.stage].name} (E{cem.stage})</p>
                      <button 
                        onClick={() => onOpenDetail(cem.id)}
                        className="bg-[var(--color-primary)] text-white text-xs px-3 py-1.5 rounded-md hover:bg-[var(--color-primary-hover)] transition-colors w-full font-medium"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] flex flex-col h-[500px] border border-[var(--color-fs-border)]">
          <div className="p-5 border-b border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)]">
            <h3 className="font-bold text-lg text-[var(--color-fs-text)]">Últimos Comentarios</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {cemeteries
              .flatMap((c: any) => (c.visits || []).map((v: any) => ({ ...v, cemeteryName: c.name, cemeteryId: c.id })))
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((visit: any, i: number) => (
              <div key={i} className="flex space-x-4 text-sm relative">
                {i !== 4 && <div className="absolute left-2 top-6 bottom-[-24px] w-0.5 bg-[var(--color-fs-border)]"></div>}
                <div className={`w-4 h-4 mt-1 rounded-full bg-[var(--color-primary)] flex-shrink-0 relative z-10 border-2 border-[var(--color-fs-bg)] shadow-sm`}></div>
                <div>
                  <p className="text-[var(--color-fs-text)]"><span className="font-bold">{visit.missionary}</span> en <span className="font-bold text-[var(--color-primary)] cursor-pointer hover:underline" onClick={() => onOpenDetail(visit.cemeteryId)}>{visit.cemeteryName}</span></p>
                  <p className="text-xs text-[var(--color-fs-text-secondary)] mt-0.5 font-medium">{new Date(visit.date).toLocaleDateString()}</p>
                  <p className="text-sm mt-1 text-[var(--color-fs-text)] italic">"{visit.notes}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const MissionaryListScreen = ({ missionaries, cemeteries, onNewMissionary, onOpenDetail }: any) => {
  const totalVisits = cemeteries.reduce((acc: number, cem: any) => acc + (cem.visits ? cem.visits.length : 0), 0);
  const activeMissionaries = missionaries.filter((m: any) => m.status === 'Activo').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold text-[var(--color-secondary)]">Gestión de Misioneros</h2>
        <button 
          onClick={onNewMissionary}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
        >
          + Alta de Misionero
        </button>
      </div>

      {/* Missionary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--color-fs-bg)] p-5 rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] border-l-4 border-[var(--color-primary)] flex items-center space-x-4">
          <div className="p-3 bg-[var(--color-primary-50)] rounded-full text-[var(--color-primary)]">
            <Globe size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-fs-text-secondary)]">Misioneros Activos</p>
            <p className="text-2xl font-bold text-[var(--color-secondary)]">{activeMissionaries}</p>
          </div>
        </div>
        <div className="bg-[var(--color-fs-bg)] p-5 rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] border-l-4 border-[var(--color-fs-blue)] flex items-center space-x-4">
          <div className="p-3 bg-[var(--color-fs-blue)] bg-opacity-10 rounded-full text-[var(--color-fs-blue)]">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-fs-text-secondary)]">Visitas Realizadas</p>
            <p className="text-2xl font-bold text-[var(--color-secondary)]">{totalVisits}</p>
          </div>
        </div>
        <div className="bg-[var(--color-fs-bg)] p-5 rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] border-l-4 border-[var(--color-fs-orange)] flex items-center space-x-4">
          <div className="p-3 bg-[var(--color-fs-orange)] bg-opacity-10 rounded-full text-[var(--color-fs-orange)]">
            <Database size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-fs-text-secondary)]">Cementerios Asignados</p>
            <p className="text-2xl font-bold text-[var(--color-secondary)]">{cemeteries.filter((c: any) => c.missionaryId).length}</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] overflow-hidden border border-[var(--color-fs-border)]">
        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-[var(--color-fs-border)]">
          {missionaries.map((missionary: any) => {
            const assignedCemeteries = cemeteries.filter((c: any) => c.missionaryId === missionary.id);
            const stagesCount = assignedCemeteries.reduce((acc: any, cem: any) => {
              acc[cem.stage] = (acc[cem.stage] || 0) + 1;
              return acc;
            }, {});

            return (
              <div key={missionary.id} className="p-4 hover:bg-[var(--color-fs-bg-alt)] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-[var(--color-fs-text)] text-lg">{missionary.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    missionary.status === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 
                    missionary.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                  }`}>
                    {missionary.status}
                  </span>
                </div>
                <div className="text-[var(--color-fs-text-secondary)] text-sm mb-3">
                  <div>{missionary.email}</div>
                  <div>{missionary.phone}</div>
                </div>
                <div className="mb-3">
                  <span className="text-xs font-bold text-[var(--color-fs-text-secondary)] uppercase tracking-wider block mb-1">Cementerios ({assignedCemeteries.length})</span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(stagesCount).map(([stage, count]: any) => (
                      <span key={stage} className={`px-2 py-0.5 rounded text-xs font-bold text-white`} style={{ backgroundColor: stages[Number(stage)].color }} title={`Etapa ${stage}`}>
                        E{stage}: {count}
                      </span>
                    ))}
                    {assignedCemeteries.length === 0 && <span className="text-xs text-[var(--color-fs-text-secondary)]">Ninguno</span>}
                  </div>
                </div>
                <button 
                  onClick={() => onOpenDetail(missionary.id)}
                  className="w-full bg-[var(--color-primary-50)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)] px-3 py-2 rounded-lg font-bold text-sm transition-colors text-center"
                >
                  Ver detalles
                </button>
              </div>
            );
          })}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-fs-bg-alt)] border-b border-[var(--color-fs-border)]">
                <th className="p-4 font-bold text-[var(--color-fs-text-secondary)]">Nombre</th>
                <th className="p-4 font-bold text-[var(--color-fs-text-secondary)]">Contacto</th>
                <th className="p-4 font-bold text-[var(--color-fs-text-secondary)]">Estado</th>
                <th className="p-4 font-bold text-[var(--color-fs-text-secondary)]">Cementerios Asignados</th>
                <th className="p-4 font-bold text-[var(--color-fs-text-secondary)]">Etapas</th>
                <th className="p-4 font-bold text-[var(--color-fs-text-secondary)] text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {missionaries.map((missionary: any) => {
                const assignedCemeteries = cemeteries.filter((c: any) => c.missionaryId === missionary.id);
                const stagesCount = assignedCemeteries.reduce((acc: any, cem: any) => {
                  acc[cem.stage] = (acc[cem.stage] || 0) + 1;
                  return acc;
                }, {});

                return (
                  <tr key={missionary.id} className="border-b border-[var(--color-fs-border)] hover:bg-[var(--color-fs-bg-alt)] transition-colors">
                    <td className="p-4 font-bold text-[var(--color-fs-text)]">{missionary.name}</td>
                    <td className="p-4 text-[var(--color-fs-text-secondary)] text-sm">
                      <div>{missionary.email}</div>
                      <div>{missionary.phone}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        missionary.status === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 
                        missionary.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                      }`}>
                        {missionary.status}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-[var(--color-fs-text)]">{assignedCemeteries.length}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(stagesCount).map(([stage, count]: any) => (
                          <span key={stage} className={`px-2 py-0.5 rounded text-xs font-bold text-white`} style={{ backgroundColor: stages[Number(stage)].color }} title={`Etapa ${stage}`}>
                            E{stage}: {count}
                          </span>
                        ))}
                        {assignedCemeteries.length === 0 && <span className="text-xs text-[var(--color-fs-text-secondary)]">Ninguno</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button 
                        onClick={() => onOpenDetail(missionary.id)}
                        className="bg-[var(--color-primary-50)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)] px-3 py-1.5 rounded-lg font-bold text-sm transition-colors"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
const CemeteryListScreen = ({ onOpenDetail, onNewCemetery, initialFilterStage, cemeteries }: any) => {
  const [filterStage, setFilterStage] = useState<string>(initialFilterStage !== null && initialFilterStage !== undefined ? initialFilterStage.toString() : 'all');

  const filteredCemeteries = filterStage === 'all' 
    ? cemeteries 
    : cemeteries.filter((c: any) => c.stage.toString() === filterStage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold text-[var(--color-secondary)]">Directorio de Cementerios</h2>
        <button onClick={onNewCemetery} className="btn-primary flex items-center space-x-2">
          <Plus size={18} />
          <span>Nuevo Cementerio</span>
        </button>
      </div>

      <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] overflow-hidden border border-[var(--color-fs-border)]">
        <div className="p-5 border-b border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)] flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--color-fs-text-secondary)]" size={20} />
            <input type="text" placeholder="Buscar por nombre o ciudad..." className="pl-12 w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)]" />
          </div>
          <div className="flex space-x-3">
            <select 
              className="w-auto bg-[var(--color-fs-bg)] font-medium text-[var(--color-fs-text)] border-[var(--color-fs-border)]"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
            >
              <option value="all">Todas las Etapas</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
              ))}
            </select>
            <button className="p-3 border border-[var(--color-fs-border)] rounded-xl text-[var(--color-fs-text-secondary)] hover:bg-[var(--color-fs-bg-alt)] transition-colors bg-[var(--color-fs-bg)]">
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-[var(--color-fs-border)]">
          {filteredCemeteries.map(cem => (
            <div key={cem.id} className="p-4 hover:bg-[var(--color-fs-bg-alt)] transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-[var(--color-secondary)] text-lg">{cem.name}</h3>
                <span 
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: stages[cem.stage].color }}
                >
                  E{cem.stage}
                </span>
              </div>
              <p className="text-sm text-[var(--color-fs-text-secondary)] mb-3">
                <MapPin size={14} className="inline mr-1 text-[var(--color-primary)]" />
                {cem.city}, {cem.province}
              </p>
              {cem.address && (
                <p className="text-xs text-[var(--color-fs-text-secondary)] mb-2 italic">
                  {cem.address}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div>
                  <span className="block text-xs text-[var(--color-fs-text-secondary)]">Ingreso</span>
                  <span className="font-medium text-[var(--color-fs-text)]">{cem.entryDate}</span>
                </div>
                <div>
                  <span className="block text-xs text-[var(--color-fs-text-secondary)]">Último contacto</span>
                  <span className="font-medium text-[var(--color-fs-text)]">{cem.lastContactDate}</span>
                </div>
                <div className="col-span-2 mt-1">
                  <span className="block text-xs text-[var(--color-fs-text-secondary)]">Misionero</span>
                  <span className="font-medium text-[var(--color-fs-text)]">{cem.missionary}</span>
                </div>
              </div>
              <button onClick={() => onOpenDetail(cem.id)} className="w-full bg-[var(--color-primary-50)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)] px-3 py-2 rounded-lg font-bold text-sm transition-colors text-center">
                Ver Detalle
              </button>
            </div>
          ))}
          {filteredCemeteries.length === 0 && (
            <div className="p-8 text-center text-[var(--color-fs-text-secondary)]">
              No se encontraron cementerios para esta etapa.
            </div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-fs-bg)] text-[var(--color-fs-text-secondary)] text-sm border-b border-[var(--color-fs-border)]">
                <th className="p-5 font-semibold">Nombre</th>
                <th className="p-5 font-semibold">Ubicación</th>
                <th className="p-5 font-semibold">Dirección</th>
                <th className="p-5 font-semibold whitespace-nowrap">Etapa Actual</th>
                <th className="p-5 font-semibold whitespace-nowrap">Fecha Ingreso</th>
                <th className="p-5 font-semibold whitespace-nowrap">Último Contacto</th>
                <th className="p-5 font-semibold">Misionero</th>
                <th className="p-5 font-semibold text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-fs-border)]">
              {filteredCemeteries.map(cem => (
                <tr key={cem.id} className="hover:bg-[var(--color-fs-bg-alt)] transition-colors group">
                  <td className="p-5 font-bold text-[var(--color-secondary)]">{cem.name}</td>
                  <td className="p-5 text-[var(--color-fs-text-secondary)]">{cem.city}, {cem.province}, {cem.country}</td>
                  <td className="p-5 text-[var(--color-fs-text-secondary)]">{cem.address || '-'}</td>
                  <td className="p-5 whitespace-nowrap">
                    <span 
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: stages[cem.stage].color }}
                    >
                      {stages[cem.stage].name} (E{cem.stage})
                    </span>
                  </td>
                  <td className="p-5 text-[var(--color-fs-text-secondary)] whitespace-nowrap">{formatDisplayDate(cem.entryDate)}</td>
                  <td className="p-5 text-[var(--color-fs-text-secondary)] whitespace-nowrap">{formatDisplayDate(cem.lastContactDate)}</td>
                  <td className="p-5">
                    <div className="font-medium text-[var(--color-fs-text)]">{cem.missionary}</div>
                    <div className="text-xs text-[var(--color-fs-text-secondary)]">{cem.missionaryEmail}</div>
                  </td>
                  <td className="p-5 text-right whitespace-nowrap">
                    <button onClick={() => onOpenDetail(cem.id)} className="bg-[var(--color-primary-50)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)] px-3 py-1.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-end w-fit ml-auto space-x-1">
                      <span>Ver Detalle</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCemeteries.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--color-fs-text-secondary)]">
                    No se encontraron cementerios para esta etapa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const NewMissionaryScreen = ({ onSave, onCancel }: any) => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', status: 'Activo', country: '' });
  const [emailWarning, setEmailWarning] = useState(false);

  const handleEmailChange = (val: string) => {
    setFormData({...formData, email: val});
    setEmailWarning(val.includes('@') && !val.toLowerCase().endsWith('@gmail.com'));
  };

  const handleCountryChange = (val: string) => {
    let newPhone = formData.phone;
    const country = COUNTRY_DATA.find(c => c.name === val);
    if (country && (!newPhone || newPhone.trim() === '')) {
      newPhone = country.prefix + ' ' ;
    }
    setFormData({...formData, country: val, phone: newPhone});
  };

  const handlePhoneChange = (val: string) => {
    let newCountry = formData.country;
    const match = COUNTRY_DATA.find(c => val.startsWith(c.prefix));
    if (match) newCountry = match.name;
    setFormData({...formData, phone: val, country: newCountry});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={onCancel} className="p-2 hover:bg-[var(--color-fs-bg-alt)] rounded-full transition-colors">
          <ArrowRight className="rotate-180" />
        </button>
        <h2 className="text-3xl font-bold text-[var(--color-secondary)]">Alta de Misionero</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--color-fs-bg)] p-8 rounded-2xl shadow-sm border border-[var(--color-fs-border)] space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Nombre Completo</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)]" 
              placeholder="Ej. Élder Smith"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[var(--color-fs-text)]">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={e => handleEmailChange(e.target.value)}
              className="w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)]" 
              placeholder="correo@ejemplo.com"
            />
            {emailWarning && (
              <div className="bg-[#FFFBEB] dark:bg-[#451A03] border border-[#FDE68A] dark:border-[#92400E] text-[#92400E] dark:text-[#FDE68A] p-2 rounded-lg text-[11px] flex items-start gap-1.5 animate-fade-in">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <p>Se recomienda <b>Gmail</b> para mejor recepción de avisos.</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">País</label>
            <select 
              required
              value={formData.country}
              onChange={e => handleCountryChange(e.target.value)}
              className="w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)]"
            >
              <option value="">Selecciona un país</option>
              {COUNTRY_DATA.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Teléfono</label>
            <input 
              type="tel" 
              required
              value={formData.phone}
              onChange={e => handlePhoneChange(e.target.value)}
              className="w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)]" 
              placeholder="+54 11 1234-5678"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Status</label>
            <select 
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)]"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-[var(--color-fs-border)]">
          <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg font-bold text-[var(--color-fs-text-secondary)] hover:bg-[var(--color-fs-bg-alt)] transition-colors">
            Cancelar
          </button>
          <button type="submit" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-2 rounded-lg font-bold transition-colors">
            Guardar Misionero
          </button>
        </div>
      </form>
    </div>
  );
};

const MissionaryDetailScreen = ({ id, onBack, missionaries, cemeteries, onAssignCemetery, onRemoveCemetery, onUpdateMissionary }: any) => {
  const missionary = missionaries.find((m: any) => m.id === id);
  const assignedCemeteries = cemeteries.filter((c: any) => c.missionaryId === missionary?.id);
  const unassignedCemeteries = cemeteries.filter((c: any) => !c.missionaryId);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: missionary?.name || '',
    email: missionary?.email || '',
    phone: missionary?.phone || '',
    country: missionary?.country || '',
    status: missionary?.status || 'Activo'
  });
  const [emailWarning, setEmailWarning] = useState(false);

  const handleEmailChange = (val: string) => {
    setFormData({...formData, email: val});
    setEmailWarning(val.includes('@') && !val.toLowerCase().endsWith('@gmail.com'));
  };

  const handleCountryChange = (val: string) => {
    let newPhone = formData.phone;
    const country = COUNTRY_DATA.find(c => c.name === val);
    if (country && (!newPhone || newPhone.trim() === '')) {
      newPhone = country.prefix + ' ' ;
    }
    setFormData({...formData, country: val, phone: newPhone});
  };

  const handlePhoneChange = (val: string) => {
    let newCountry = formData.country;
    const match = COUNTRY_DATA.find(c => val.startsWith(c.prefix));
    if (match) newCountry = match.name;
    setFormData({...formData, phone: val, country: newCountry});
  };

  const [showAssignModal, setShowAssignModal] = useState(false);

  if (!missionary) return null;

  const handleSave = () => {
    onUpdateMissionary(missionary.id, formData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center space-x-2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] font-bold transition-colors w-fit">
        <div className="w-8 h-8 rounded-full bg-[var(--color-fs-bg)] shadow-sm flex items-center justify-center border border-[var(--color-fs-border)]">
          <ChevronRight className="transform rotate-180" size={18} />
        </div>
        <span>Volver a Misioneros</span>
      </button>

      <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] overflow-hidden border border-[var(--color-fs-border)] p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--color-secondary)]">Detalles del Misionero</h2>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-[var(--color-primary-50)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)] px-4 py-2 rounded-lg font-bold transition-colors"
            >
              Modificar Datos
            </button>
          ) : (
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  setFormData({
                    name: missionary.name,
                    email: missionary.email,
                    phone: missionary.phone,
                    country: missionary.country,
                    status: missionary.status
                  });
                  setIsEditing(false);
                }}
                className="px-4 py-2 rounded-lg font-bold text-[var(--color-fs-text-secondary)] hover:bg-[var(--color-fs-bg-alt)] transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg font-bold transition-colors"
              >
                Guardar
              </button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text-secondary)]">Nombre</label>
            {isEditing ? (
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)] rounded-md p-2" />
            ) : (
              <p className="text-lg font-medium text-[var(--color-fs-text)]">{missionary.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text-secondary)]">Estado</label>
            {isEditing ? (
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)] rounded-md p-2">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            ) : (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                missionary.status === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 
                missionary.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
              }`}>
                {missionary.status}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[var(--color-fs-text-secondary)]">Correo Electrónico</label>
            {isEditing ? (
              <>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => handleEmailChange(e.target.value)} 
                  className="w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)] rounded-md p-2" 
                />
                {emailWarning && (
                  <div className="bg-[#FFFBEB] dark:bg-[#451A03] border border-[#FDE68A] dark:border-[#92400E] text-[#92400E] dark:text-[#FDE68A] p-2 rounded-lg text-[11px] flex items-start gap-1.5 animate-fade-in">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <p>Se recomienda <b>Gmail</b> para mejor recepción de avisos.</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-lg font-medium text-[var(--color-fs-text)]">{missionary.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text-secondary)]">País</label>
            {isEditing ? (
              <select 
                value={formData.country} 
                onChange={e => handleCountryChange(e.target.value)} 
                className="w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)] rounded-md p-2"
              >
                <option value="">Selecciona un país</option>
                {COUNTRY_DATA.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                <option value="Otro">Otro</option>
              </select>
            ) : (
              <p className="text-lg font-medium text-[var(--color-fs-text)]">{missionary.country || 'No especificado'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text-secondary)]">Teléfono</label>
            {isEditing ? (
              <input 
                type="tel" 
                value={formData.phone} 
                onChange={e => handlePhoneChange(e.target.value)} 
                className="w-full bg-[var(--color-fs-bg)] text-[var(--color-fs-text)] border-[var(--color-fs-border)] rounded-md p-2" 
              />
            ) : (
              <p className="text-lg font-medium text-[var(--color-fs-text)]">{missionary.phone}</p>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--color-fs-border)] pt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-[var(--color-secondary)]">Cementerios Asignados</h3>
            <button 
              onClick={() => setShowAssignModal(!showAssignModal)}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center space-x-2 text-sm"
            >
              <Plus size={16} />
              <span>Asociar Cementerio</span>
            </button>
          </div>

          {showAssignModal && (
            <div className="mb-6 bg-[var(--color-fs-bg-alt)] p-4 rounded-xl border border-[var(--color-fs-border)]">
              <h4 className="font-bold text-[var(--color-fs-text)] mb-3">Seleccionar Cementerio para Asociar</h4>
              {unassignedCemeteries.length > 0 ? (
                <div className="max-h-60 overflow-y-auto w-full">
                  {/* Mobile View */}
                  <div className="block md:hidden divide-y divide-[var(--color-fs-border)]">
                    {unassignedCemeteries.map((cem: any) => (
                      <div key={cem.id} className="py-3 flex flex-col space-y-2">
                        <div>
                          <div className="font-bold text-[var(--color-fs-text)] text-sm">{cem.name}</div>
                          <div className="text-xs text-[var(--color-fs-text-secondary)]">{cem.city}, {cem.province}</div>
                        </div>
                        <button 
                          onClick={() => {
                            onAssignCemetery(cem.id, missionary.id);
                            setShowAssignModal(false);
                          }}
                          className="w-full text-[var(--color-primary-700)] font-bold text-sm px-3 py-2 bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-100)] rounded-md transition-colors text-center"
                        >
                          Asignar
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--color-fs-border)]">
                          <th className="p-2 font-bold text-[var(--color-fs-text-secondary)] text-sm">Nombre</th>
                          <th className="p-2 font-bold text-[var(--color-fs-text-secondary)] text-sm">Ubicación</th>
                          <th className="p-2 font-bold text-[var(--color-fs-text-secondary)] text-sm text-right whitespace-nowrap">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedCemeteries.map((cem: any) => (
                          <tr key={cem.id} className="border-b border-[var(--color-fs-border)] hover:bg-[var(--color-fs-bg)]">
                            <td className="p-2 font-medium text-[var(--color-fs-text)] text-sm">{cem.name}</td>
                            <td className="p-2 text-sm text-[var(--color-fs-text-secondary)]">{cem.city}, {cem.province}</td>
                            <td className="p-2 text-right whitespace-nowrap">
                              <button 
                                onClick={() => {
                                  onAssignCemetery(cem.id, missionary.id);
                                  setShowAssignModal(false);
                                }}
                                className="text-xs bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-3 py-1.5 rounded-lg font-medium hover:bg-[var(--color-primary-100)] transition-colors"
                              >
                                Asignar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-fs-text-secondary)]">No hay cementerios sin asignar disponibles.</p>
              )}
            </div>
          )}

          {assignedCemeteries.length > 0 ? (
            <ul className="space-y-3 mb-6">
              {assignedCemeteries.map((cem: any) => (
                <li key={cem.id} className="flex justify-between items-center bg-[var(--color-fs-bg-alt)] p-4 rounded-xl border border-[var(--color-fs-border)]">
                  <div>
                    <p className="font-bold text-[var(--color-fs-text)]">{cem.name}</p>
                    <p className="text-sm text-[var(--color-fs-text-secondary)]">{cem.city}, {cem.province}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: stages[cem.stage].color }}>
                      {stages[cem.stage].name}
                    </span>
                    <button 
                      onClick={() => onRemoveCemetery(cem.id)}
                      className="text-white font-bold text-sm px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-fs-text-secondary)] mb-6">No tiene cementerios asignados.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const CemeteryDetailScreen = ({ id, onBack, cemeteries, missionaries, onUpdateCemetery, showToast }: any) => {
  const cemetery = cemeteries.find((c: any) => c.id === id) || cemeteries[0];
  const [currentStage, setCurrentStage] = useState(cemetery.stage);
  const [visits, setVisits] = useState(cemetery.visits || []);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Sincronizar visitas cuando cambia el cementerio (por recargas de API)
  useEffect(() => {
    if (cemetery.visits) setVisits(cemetery.visits);
  }, [cemetery.visits]);

  const [newVisit, setNewVisit] = useState({ date: '', missionary: cemetery.missionary || '', contact: '', purpose: '', notes: '', type: 'Visita' });
  const [showNewVisitForm, setShowNewVisitForm] = useState(false);
  const [loadingVisit, setLoadingVisit] = useState(false);
  const [assignedMissionaryId, setAssignedMissionaryId] = useState<string | ''>(cemetery.missionaryId || '');

  // Etapa 2 state
  const [fsAlreadyDigitized, setFsAlreadyDigitized] = useState(cemetery.fsAlreadyDigitized || false);
  const [imageUsageStatus, setImageUsageStatus] = useState(cemetery.imageUsageStatus || '');
  const [imageRequest, setImageRequest] = useState(cemetery.imageRequest || '');
  const [digitizationDate, setDigitizationDate] = useState(cemetery.digitizationDate || '');
  const [collectionName, setCollectionName] = useState(cemetery.collectionName || '');
  const [digitizedPeriods, setDigitizedPeriods] = useState(cemetery.digitizedPeriods || '');

  // Etapa 3 state
  const [readyForVisitDate, setReadyForVisitDate] = useState(cemetery.readyForVisitDate || '');
  const [managerNotifiedDate, setManagerNotifiedDate] = useState(cemetery.managerNotifiedDate || '');
  const [managerNotifiedName, setManagerNotifiedName] = useState(cemetery.managerNotifiedName || '');
  const [isDigitizationConfirmed, setIsDigitizationConfirmed] = useState(false);

  const handleGeneratePDF = async () => {
    if (showToast) showToast('Generando reporte ejecutivo PDF...');
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      let y = 20;

      // --- Estilos Base ---
      const primaryColor = [79, 70, 229]; // Indigo/Primary
      const textColor = [31, 41, 55]; // Gray 800
      const lightGray = [243, 244, 246]; // Gray 100
      
      // --- Encabezado ---
      pdf.setFillColor(0, 0, 0);
      pdf.rect(15, y, 180, 2, 'F');
      y += 10;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(0, 0, 0);
      pdf.text('FAMILYSEARCH', 15, y);
      
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('DEPARTAMENTO DE RELACIONES INSTITUCIONALES (GRI)', 15, y + 5);
      
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('DOCUMENTO CONFIDENCIAL / INFORME EJECUTIVO', 130, y);
      pdf.text(`GENERADO: ${formatDisplayDate(new Date().toISOString().split('T')[0])}`, 130, y + 4);
      
      y += 20;

      // --- Título del Proyecto ---
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(15, y, 195, y);
      y += 10;
      
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      pdf.text(cemetery.name.toUpperCase(), 15, y);
      y += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Resumen consolidado para la toma de decisiones institucionales', 15, y);
      y += 15;

      // --- Secciones I y II (Grid-like) ---
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      
      // I. Datos
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(15, y, 85, 6, 'F');
      pdf.text('I. DATOS DE CONTACTO', 17, y + 4.5);
      
      // II. Registros (Explicitly reset fill color to lightGray)
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(110, y, 85, 6, 'F');
      pdf.text('II. RELEVAMIENTO TÉCNICO', 112, y + 4.5);
      
      y += 12;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      
      // Contenido I
      const startYContent = y;
      pdf.text(`Dirección: ${cemetery.address || cemetery.city || '-'}`, 15, y);
      y += 6;
      pdf.text(`Administración: ${cemetery.adminType || 'Municipal'}`, 15, y);
      y += 6;
      pdf.text(`Referente: ${cemetery.contactName || 'No registrado'}`, 15, y);
      y += 6;
      pdf.text(`Cargo: ${cemetery.contactPosition || '-'}`, 15, y);
      y += 6;
      pdf.text(`Interés: ${cemetery.contactInterestLevel || 'Medio'}`, 15, y);
      
      // Contenido II
      y = startYContent;
      pdf.text(`Est. Actas: ${cemetery.estimatedRecords || '---'}`, 110, y);
      y += 6;
      pdf.text(`Cant. Libros: ${cemetery.numberOfBooks || '---'}`, 110, y);
      y += 6;
      pdf.text(`Cronología: ${cemetery.dateRangeFrom || '-'} al ${cemetery.dateRangeTo || '-'}`, 110, y);
      y += 6;
      pdf.text(`Previo FS: ${cemetery.fsAlreadyDigitized ? 'SÍ (REVISAR)' : 'NO (NUEVO)'}`, 110, y);
      
      y = Math.max(y, startYContent + 30) + 10;

      // --- III. Planificación ---
      pdf.setFont('helvetica', 'bold');
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(15, y, 180, 6, 'F');
      pdf.text('III. PLANIFICACIÓN INSTITUCIONAL', 17, y + 4.5);
      
      y += 12;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Responsable FS: ${managerNotifiedName || 'No definido'}`, 15, y);
      pdf.text(`Disponibilidad: ${readyForVisitDate ? formatDisplayDate(readyForVisitDate) : '-'}`, 110, y);
      y += 6;
      pdf.text(`Notificación GRI: ${managerNotifiedDate ? formatDisplayDate(managerNotifiedDate) : '-'}`, 15, y);
      pdf.text(`Estado Misión: CITA INSTITUCIONAL PENDIENTE`, 110, y);
      
      y += 15;

      // --- IV. Bitácora (Anexo) ---
      pdf.setFont('helvetica', 'bold');
      pdf.text('APÉNDICE: BITÁCORA DE GESTIONES', 15, y);
      y += 4;
      pdf.setLineWidth(0.2);
      pdf.line(15, y, 195, y);
      y += 8;
      
      pdf.setFontSize(8);
      const sortedVisits = [...visits].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
      
      sortedVisits.forEach((visit: any) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${formatDisplayDate(visit.date)} - ${visit.missionary}`, 15, y);
        y += 4;
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(`${visit.contact}: ${visit.notes || 'Sin notas'}`, 170);
        pdf.text(lines, 20, y);
        y += (lines.length * 4) + 4;
      });

      // --- Footer ---
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Este documento es confidencial y para uso interno exclusivo de FamilySearch.', 105, 285, { align: 'center' });
      pdf.text('Generado automáticamente por el Sistema Oportunidades Cementerios.', 105, 289, { align: 'center' });

      const fileName = `Informe_${cemetery.name.substring(0, 15).replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
      
      if (showToast) showToast('¡Reporte PDF ejecutivo generado!');
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      if (showToast) showToast('Error: Revisar consola', 'error');
    }
  };

  const [stage1Data, setStage1Data] = useState({
    contactName: cemetery.contactName || '',
    contactPosition: cemetery.contactPosition || '',
    contactPhone: cemetery.contactPhone || '',
    contactEmail: cemetery.contactEmail || '',
    contactInterestLevel: cemetery.contactInterestLevel || 'Alto',
    previousFsAgreement: cemetery.previousFsAgreement || 'Desconoce'
  });

  const [stage2Data, setStage2Data] = useState({
    estimatedRecords: cemetery.estimatedRecords || '',
    numberOfBooks: cemetery.numberOfBooks || '',
    dateRangeFrom: cemetery.dateRangeFrom || '',
    dateRangeTo: cemetery.dateRangeTo || ''
  });

  const [stage5Data, setStage5Data] = useState({
    drrRecipient: cemetery.drrRecipient || '',
    drrDeliveryDate: cemetery.drrDeliveryDate || '',
    trainingRecipient: cemetery.trainingRecipient || '',
    trainingDate: cemetery.trainingDate || '',
    postSaleNotes: cemetery.postSaleNotes || '',
    processCompleted: cemetery.processCompleted || false
  });

  const handleSaveStageData = () => {
    if (onUpdateCemetery) {
      // Limpiamos los campos numéricos para evitar errores de sintaxis en PostgreSQL ('' != integer)
      const cleanStage2Data = {
        estimatedRecords: stage2Data.estimatedRecords === '' ? null : parseInt(String(stage2Data.estimatedRecords)),
        numberOfBooks: stage2Data.numberOfBooks === '' ? null : parseInt(String(stage2Data.numberOfBooks)),
        dateRangeFrom: stage2Data.dateRangeFrom === '' ? null : parseInt(String(stage2Data.dateRangeFrom)),
        dateRangeTo: stage2Data.dateRangeTo === '' ? null : parseInt(String(stage2Data.dateRangeTo))
      };

      // Limpiamos los campos de fecha de etapa 5 para evitar errores SQL ("" != NULL)
      const cleanStage5Data = {
        ...stage5Data,
        drrDeliveryDate: stage5Data.drrDeliveryDate === '' ? null : stage5Data.drrDeliveryDate,
        trainingDate: stage5Data.trainingDate === '' ? null : stage5Data.trainingDate
      };

      onUpdateCemetery(cemetery.id, {
        ...stage1Data,
        ...cleanStage2Data,
        fsAlreadyDigitized,
        imageUsageStatus,
        imageRequest,
        digitizationDate: digitizationDate === '' ? null : digitizationDate,
        collectionName,
        digitizedPeriods,
        readyForVisitDate: readyForVisitDate === '' ? null : readyForVisitDate,
        managerNotifiedDate: managerNotifiedDate === '' ? null : managerNotifiedDate,
        managerNotifiedName,
        ...cleanStage5Data, // Persistir datos de postventa saneados
        stage: currentStage // Sincronizar la etapa actual con la base de datos al guardar
      });
      if (showToast) showToast('Borrador guardado exitosamente');
    }
  };

  const handleAddVisit = () => {
    if (!newVisit.date) return showToast('La fecha es obligatoria', 'error');
    if (!newVisit.missionary) return showToast('El misionero es obligatorio', 'error');
    if (!newVisit.contact) return showToast('El contacto es obligatorio', 'error');
    
    setLoadingVisit(true);
    // Incluir la etapa actual en la visita para histórico
    const visitData = { 
      ...newVisit, 
      stage: currentStage 
    };

    console.log('Intentando guardar visita:', visitData);

    api.addVisit(cemetery.id, visitData)
      .then((res) => {
        console.log('Visita guardada con éxito:', res);
        // Recargamos los datos para ver la nueva visita
        if (onUpdateCemetery) onUpdateCemetery(cemetery.id, {}); 
        setNewVisit({ date: '', missionary: cemetery.missionary || '', contact: '', purpose: '', notes: '', type: 'Visita' });
        setShowNewVisitForm(false);
        if (showToast) showToast('Contacto registrado con éxito');
      })
      .catch(err => {
        console.error('Error al guardar visita:', err);
        if (showToast) showToast('Error al guardar: ' + (err.message || 'Error desconocido'), 'error');
      })
      .finally(() => setLoadingVisit(false));
  };

  const renderVisitLog = () => {
    // Ordenar: más recientes primero
    const sortedVisits = [...visits].sort((a: any, b: any) => {
      // Manejar nulos o vacíos al final
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Helper para formato limpio DD/MM/AAAA sin líos de zona horaria (usamos el global)
    const formatCleanDate = formatDisplayDate;

    return (
      <div className="mt-8 pt-6 border-t border-[var(--color-fs-border)] print:border-black print:mt-6 print:pt-4">
        <div className="flex justify-between items-center mb-6 print:mb-4">
          <h3 className="text-lg font-bold text-[var(--color-fs-text)] print:text-black">Registro de Contacto</h3>
          <button 
            type="button"
            onClick={() => setShowNewVisitForm(!showNewVisitForm)}
            className="text-sm bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-3 py-1.5 rounded-lg font-medium hover:bg-[var(--color-primary-100)] transition-colors flex items-center space-x-1 print:hidden"
          >
            <Plus size={16} />
            <span>Nuevo Contacto</span>
          </button>
        </div>

      {showNewVisitForm && (
        <div className="bg-[var(--color-fs-bg-alt)] p-5 rounded-xl border border-[var(--color-fs-border)] mb-6 space-y-4 animate-fade-in print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-[var(--color-fs-text)]">Fecha *</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={newVisit.date} 
                  onChange={e => setNewVisit({...newVisit, date: e.target.value})} 
                  className="w-full text-sm p-2 bg-[var(--color-fs-bg)] text-transparent border-[var(--color-fs-border)] focus:text-transparent appearance-none" 
                />
                <div className="absolute inset-y-[1px] left-[1px] right-10 pl-3 flex items-center pointer-events-none text-xs text-[var(--color-fs-text)] bg-[var(--color-fs-bg)] rounded-l-lg">
                  {newVisit.date ? formatDisplayDate(newVisit.date) : <span className="text-[var(--color-fs-text-secondary)] italic">dd/mm/aaaa</span>}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-[var(--color-fs-text)]">Tipo *</label>
              <select value={newVisit.type} onChange={e => setNewVisit({...newVisit, type: e.target.value})} className="w-full text-sm p-2 bg-[var(--color-fs-bg)] border-[var(--color-fs-border)]">
                <option value="Visita">Visita</option>
                <option value="Teléfono">Teléfono</option>
                <option value="Video">Video</option>
                <option value="Email">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-[var(--color-fs-text)]">Misionero *</label>
              <input type="text" placeholder="Ej. Juan Pérez" value={newVisit.missionary} onChange={e => setNewVisit({...newVisit, missionary: e.target.value})} className="w-full text-sm p-2 bg-[var(--color-fs-bg)] border-[var(--color-fs-border)]" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-[var(--color-fs-text)]">Contacto *</label>
              <input type="text" placeholder="Ej. Director Gómez" value={newVisit.contact} onChange={e => setNewVisit({...newVisit, contact: e.target.value})} className="w-full text-sm p-2 bg-[var(--color-fs-bg)] border-[var(--color-fs-border)]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-[var(--color-fs-text)]">Propósito de la visita</label>
            <input type="text" placeholder="Ej. Presentación del proyecto" value={newVisit.purpose} onChange={e => setNewVisit({...newVisit, purpose: e.target.value})} className="w-full text-sm p-2 bg-[var(--color-fs-bg)] border-[var(--color-fs-border)]" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-[var(--color-fs-text)]">Observaciones</label>
            <textarea rows={2} placeholder="Detalles de la conversación..." value={newVisit.notes} onChange={e => setNewVisit({...newVisit, notes: e.target.value})} className="w-full text-sm p-2 bg-[var(--color-fs-bg)] border-[var(--color-fs-border)]"></textarea>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={() => setShowNewVisitForm(false)} className="text-sm px-4 py-2 text-[var(--color-fs-text-secondary)] hover:bg-[var(--color-fs-border)] rounded-lg transition-colors font-medium">Cancelar</button>
            <button 
              type="button" 
              onClick={handleAddVisit} 
              disabled={loadingVisit || !newVisit.date || !newVisit.missionary || !newVisit.contact} 
              className="text-sm px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loadingVisit && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              <span>{loadingVisit ? 'Guardando...' : 'Guardar Contacto'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedVisits.length === 0 ? (
          <p className="text-sm text-[var(--color-fs-text-secondary)] italic text-center py-4 print:text-left print:py-1">No hay contactos registrados aún.</p>
        ) : (
          sortedVisits.map((visit: any) => (
            <div key={visit.id} className="bg-[var(--color-fs-bg-alt)] border border-[var(--color-fs-border)] p-4 rounded-xl shadow-sm break-inside-avoid print:bg-transparent print:border-b print:border-gray-300 print:rounded-none print:shadow-none print:p-2 print:mb-4">
              <div className="flex justify-between items-start mb-2 print:mb-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  <span className="font-bold text-[var(--color-fs-text)] print:text-black">{formatCleanDate(visit.date)}</span>
                  <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 px-2 py-1 rounded-md font-medium">{visit.type || 'Visita'}</span>
                  {visit.stage !== undefined && stages[visit.stage] && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold text-white shadow-sm flex items-center gap-1" style={{ backgroundColor: stages[visit.stage].color }}>
                      {stages[visit.stage].name}
                    </span>
                  )}
                  {visit.purpose && (
                    <span className="text-xs bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-2 py-1 rounded-md font-medium print:bg-transparent print:text-gray-600 print:p-0 print:border-l print:border-gray-400 print:pl-2">{visit.purpose}</span>
                  )}
                </div>
              </div>
              <div className="text-sm text-[var(--color-fs-text-secondary)] mb-3 print:mb-1 print:text-gray-800">
                <strong>{visit.missionary}</strong> habló con <strong>{visit.contact}</strong>
              </div>
              {visit.notes && (
                <p className="text-sm text-[var(--color-fs-text)] bg-[var(--color-fs-bg)] p-3 rounded-lg border border-[var(--color-fs-border)] print:bg-transparent print:border-none print:p-0 print:italic print:text-gray-700">"{visit.notes}"</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

  return (
    <div className="space-y-6 animate-slide-up">
      <button onClick={onBack} className="flex items-center space-x-2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] font-bold transition-colors w-fit print:hidden">
        <div className="w-8 h-8 rounded-full bg-[var(--color-fs-bg)] shadow-sm flex items-center justify-center border border-[var(--color-fs-border)]">
          <ChevronRight className="transform rotate-180" size={18} />
        </div>
        <span>Volver al directorio</span>
      </button>

      <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] overflow-hidden border border-[var(--color-fs-border)]">
        {/* Header */}
        <div className="p-8 border-b border-[var(--color-fs-border)] bg-[var(--color-fs-bg-alt)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl font-bold text-[var(--color-secondary)]">{cemetery.name}</h2>
              <p className="text-[var(--color-fs-text-secondary)] flex items-center mt-2 font-medium">
                <MapPin size={18} className="mr-2 text-[var(--color-primary)]" />
                {cemetery.city}, {cemetery.province}, {cemetery.country}
              </p>
            </div>
            <div className="text-left md:text-right bg-[var(--color-fs-bg)] p-4 rounded-xl border border-[var(--color-fs-border)] shadow-sm">
              <p className="text-xs text-[var(--color-fs-text-secondary)] font-bold uppercase tracking-wider mb-1">Misionero Asignado</p>
              <select 
                value={assignedMissionaryId}
                onChange={(e) => {
                  const newId = e.target.value || '';
                  setAssignedMissionaryId(newId);
                  const selectedMissionary = missionaries.find((m: any) => m.id === newId);
                  if (onUpdateCemetery) {
                    onUpdateCemetery(cemetery.id, { 
                      missionaryId: newId, 
                      missionary: selectedMissionary ? selectedMissionary.name : 'Sin asignar',
                      missionaryEmail: selectedMissionary ? selectedMissionary.email : ''
                    });
                  }
                }}
                className="w-full md:w-auto bg-[var(--color-fs-bg-alt)] text-[var(--color-secondary)] font-bold border border-[var(--color-fs-border)] rounded-md px-2 py-1 text-sm"
              >
                <option value="">Sin asignar</option>
                {missionaries.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <p className="text-xs text-[var(--color-fs-text-secondary)] mt-1 md:text-right">{cemetery.missionaryEmail}</p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="py-10 px-4 md:px-8 bg-[var(--color-fs-bg)]">
          <Stepper currentStage={currentStage} onStageClick={setCurrentStage} />
        </div>

        {/* Stage Content */}
        <div className="p-8 bg-[var(--color-fs-bg-alt)] border-t border-[var(--color-fs-border)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h3 className="text-2xl font-bold text-[var(--color-secondary)] flex items-center">
                {stages[currentStage].name}
              </h3>
              <p className="text-[var(--color-fs-text-secondary)] mt-1">{stages[currentStage].desc}</p>
            </div>
            {(currentStage < stages.length - 1 || currentStage === 5) && (
              <button 
                onClick={() => {
                  if (currentStage === 4 && !isDigitizationConfirmed) {
                    if (showToast) showToast('Debes confirmar que la digitalización ha finalizado antes de continuar', 'error');
                    return;
                  }
                  if (currentStage === 5 && !stage5Data.processCompleted) {
                    if (showToast) showToast('Debes marcar el proceso como finalizado para concluir el proyecto', 'error');
                    return;
                  }
                  
                  if (currentStage < stages.length - 1) {
                    const nextStage = currentStage + 1;
                    setCurrentStage(nextStage);
                    if (onUpdateCemetery) onUpdateCemetery(cemetery.id, { stage: nextStage });
                  } else {
                    // Acción final para Etapa 5
                    handleSaveStageData();
                    if (showToast) showToast('¡Proyecto finalizado exitosamente!', 'success');
                  }
                }} 
                className={`btn-primary shadow-md print:hidden ${(currentStage === 4 && !isDigitizationConfirmed) || (currentStage === 5 && !stage5Data.processCompleted) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {currentStage === 5 ? 'Finalizar Proyecto' : 'Completar Etapa'}
              </button>
            )}
          </div>

          <div className="bg-[var(--color-fs-bg)] p-8 rounded-2xl border border-[var(--color-fs-border)] shadow-sm">
            {currentStage === 0 && (
              <div className="space-y-6">
                <div className="bg-[var(--color-primary-50)] text-[var(--color-primary-800)] p-4 rounded-xl border border-[var(--color-primary-100)] flex items-start space-x-3">
                  <MapPin className="flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-sm font-medium">El cementerio ha sido relevado y geolocalizado. Inicie el contacto para avanzar a la Etapa 1.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Tipo de Administración</label>
                    <select disabled className="bg-[var(--color-fs-bg-alt)] text-[var(--color-fs-text-secondary)]"><option>Municipal</option></select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Notas Generales</label>
                    <textarea disabled rows={3} className="bg-[var(--color-fs-bg-alt)] text-[var(--color-fs-text-secondary)]" value="Cementerio principal de la ciudad."></textarea>
                  </div>
                </div>
              </div>
            )}

            {currentStage === 1 && (
              <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                <div className="bg-[#E0F2FE] border border-[#BAE6FD] text-[#0369A1] dark:bg-[#0C4A6E] dark:border-[#0284C7] dark:text-[#E0F2FE] p-4 rounded-xl flex items-start space-x-3">
                  <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-sm font-medium">
                    <strong>Importante:</strong> Los datos de contacto en esta etapa deben corresponder a la persona que toma la decisión. 
                    Esta etapa se debe marcar como completada únicamente cuando este contacto sepa que estamos estableciendo comunicación con él para digitalizar.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Nombre del Contacto</label>
                    <input type="text" placeholder="Ej. Director Juan Pérez" value={stage1Data.contactName} onChange={e => setStage1Data({...stage1Data, contactName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Cargo</label>
                    <input type="text" placeholder="Director / Administrador" value={stage1Data.contactPosition} onChange={e => setStage1Data({...stage1Data, contactPosition: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Teléfono</label>
                    <input type="tel" placeholder="+54 9 11..." value={stage1Data.contactPhone} onChange={e => setStage1Data({...stage1Data, contactPhone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Email</label>
                    <input type="email" placeholder="contacto@cementerio.gob.ar" value={stage1Data.contactEmail} onChange={e => setStage1Data({...stage1Data, contactEmail: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Nivel de Interés</label>
                    <select value={stage1Data.contactInterestLevel} onChange={e => setStage1Data({...stage1Data, contactInterestLevel: e.target.value})}>
                      <option>Alto</option>
                      <option>Medio</option>
                      <option>Bajo</option>
                      <option>Ninguno</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Convenio Previo FS</label>
                    <select value={stage1Data.previousFsAgreement} onChange={e => setStage1Data({...stage1Data, previousFsAgreement: e.target.value})}>
                      <option>Desconoce</option>
                      <option>Sí</option>
                      <option>No</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button type="button" onClick={handleSaveStageData} className="btn-primary py-3 px-8 text-sm flex items-center space-x-2 shadow-lg hover:scale-105 transition-transform">
                    <Save size={18} />
                    <span>Guardar Cambios Etapa 1</span>
                  </button>
                </div>

                {renderVisitLog()}
              </form>
            )}

            {currentStage === 2 && (
              <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Cantidad estimada de actas</label>
                    <input type="number" placeholder="Ej. 50000" value={stage2Data.estimatedRecords} onChange={e => setStage2Data({...stage2Data, estimatedRecords: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Cantidad de libros/tomos</label>
                    <input type="number" placeholder="Ej. 120" value={stage2Data.numberOfBooks} onChange={e => setStage2Data({...stage2Data, numberOfBooks: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Rango de fechas (Desde)</label>
                    <input type="number" placeholder="Ej. 1890" value={stage2Data.dateRangeFrom} onChange={e => setStage2Data({...stage2Data, dateRangeFrom: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Rango de fechas (Hasta)</label>
                    <input type="number" placeholder="Ej. 2020" value={stage2Data.dateRangeTo} onChange={e => setStage2Data({...stage2Data, dateRangeTo: e.target.value})} />
                  </div>
                  <div className="md:col-span-2 bg-[var(--color-fs-bg-alt)] p-5 rounded-xl border border-[var(--color-fs-border)] space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={fsAlreadyDigitized}
                        onChange={(e) => setFsAlreadyDigitized(e.target.checked)}
                        className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-5 h-5 border-[var(--color-fs-border)]" 
                      />
                      <span className="font-bold text-[var(--color-fs-text)]">FamilySearch ya ha digitalizado esto previamente</span>
                    </label>
                    {fsAlreadyDigitized && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200 p-3 rounded-lg flex items-start space-x-2 mt-3">
                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">Esta información debe ser verificada con algún responsable de registros de FamilySearch.</p>
                      </div>
                    )}

                    {fsAlreadyDigitized && (
                      <div className="pl-8 space-y-4 animate-fade-in mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Fecha de digitalización</label>
                            <input type="date" value={digitizationDate} onChange={(e) => setDigitizationDate(e.target.value)} className="w-full bg-[var(--color-fs-bg)]" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Nombre de la colección</label>
                            <input type="text" placeholder="Ej. Registros de defunción" value={collectionName} onChange={(e) => setCollectionName(e.target.value)} className="w-full bg-[var(--color-fs-bg)]" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Años o periodos digitalizados</label>
                            <input type="text" placeholder="Ej. 1890 - 1920" value={digitizedPeriods} onChange={(e) => setDigitizedPeriods(e.target.value)} className="w-full bg-[var(--color-fs-bg)]" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Estado de las imágenes entregadas</label>
                          <select 
                            value={imageUsageStatus}
                            onChange={(e) => setImageUsageStatus(e.target.value)}
                            className="w-full bg-[var(--color-fs-bg)]"
                          >
                            <option value="">Seleccione una opción...</option>
                            <option value="saben_usar">Saben usar las imágenes que le entregamos</option>
                            <option value="nunca_usaron">Nunca las pudieron usar</option>
                            <option value="extraviado">Están extraviadas / perdidas</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">¿Qué les gustaría recibir?</label>
                          <select 
                            value={imageRequest}
                            onChange={(e) => setImageRequest(e.target.value)}
                            className="w-full bg-[var(--color-fs-bg)]"
                          >
                            <option value="">Seleccione una opción...</option>
                            <option value="nueva_copia">Una nueva copia de las imágenes que actualmente tiene FS</option>
                            <option value="enseñar_acceso">Que le enseñemos cómo acceder online a sus imágenes</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button type="button" onClick={handleSaveStageData} className="btn-primary py-3 px-8 text-sm flex items-center space-x-2 shadow-lg hover:scale-105 transition-transform">
                    <Save size={18} />
                    <span>Guardar Cambios Etapa 2</span>
                  </button>
                </div>

                {renderVisitLog()}
              </form>
            )}

            {currentStage === 3 && (
              <div className="space-y-6">
                {/* Alert and Button Section (UI Only) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                  <div className="bg-purple-50 border border-purple-200 text-purple-800 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-200 p-4 rounded-xl flex items-start space-x-3 flex-1">
                    <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-sm font-medium leading-tight">Revise el resumen completo y genere el <b>PDF Ejecutivo</b> para enviar a Gerencia. Este documento consolida todas las etapas previas.</p>
                  </div>
                  <button 
                    onClick={handleGeneratePDF} 
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center space-x-2 shrink-0 hover:scale-105"
                  >
                    <Printer size={18} />
                    <span>Generar Reporte PDF</span>
                  </button>
                </div>

                {/* THE DOCUMENT AREA (This is captured by jspdf) */}
                <div ref={reportRef} className="bg-white p-8 md:p-12 rounded-none md:rounded-2xl border-none md:border border-[var(--color-fs-border)] shadow-none md:shadow-sm text-black">
                  {/* Institutional Header */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                    <div>
                      <h1 className="text-3xl font-black uppercase tracking-tighter text-black">FamilySearch</h1>
                      <p className="text-sm font-bold text-gray-800">Departamento de Relaciones Institucionales (GRI)</p>
                      <p className="text-xs text-gray-600 mt-1 uppercase tracking-widest font-medium">Informe Ejecutivo de Priorización de Proyectos</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest mb-2 inline-block">Confidencial</div>
                      <p className="text-xs text-black font-semibold">Generado: {formatDisplayDate(new Date().toISOString().split('T')[0])}</p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase">ID: {cemetery.id.substring(0,8)}</p>
                    </div>
                  </div>

                  <div className="mb-10 text-center">
                    <h2 className="text-2xl font-bold text-black border-b-4 border-black inline-block pb-1 uppercase">{cemetery.name}</h2>
                    <p className="text-sm text-gray-600 mt-2 italic">Resumen consolidado para la toma de decisiones institucionales</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Section 1 */}
                    <div className="space-y-4">
                      <div className="border-l-4 border-black pl-3 py-1 bg-gray-50">
                        <h3 className="text-sm font-black uppercase text-black">I. Datos de Contacto y Ubicación</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex border-b border-gray-100 py-1"><span className="font-bold w-32 shrink-0 text-gray-700">Dirección:</span> <span>{cemetery.address || cemetery.location || `${cemetery.city}, ${cemetery.province}`}</span></div>
                        <div className="flex border-b border-gray-100 py-1"><span className="font-bold w-32 shrink-0 text-gray-700">Jurisdicción:</span> <span>{cemetery.adminType || 'Municipal'}</span></div>
                        <div className="flex border-b border-gray-100 py-1"><span className="font-bold w-32 shrink-0 text-gray-700">Referente:</span> <span>{cemetery.contactName || 'No registrado'}</span></div>
                        <div className="flex border-b border-gray-100 py-1"><span className="font-bold w-32 shrink-0 text-gray-700">Cargo:</span> <span>{cemetery.contactPosition || 'No registrado'}</span></div>
                        <div className="flex border-b border-gray-100 py-1"><span className="font-bold w-32 shrink-0 text-gray-700">Interés:</span> <span className="font-bold uppercase text-purple-700">{cemetery.contactInterestLevel || 'No registrado'}</span></div>
                      </div>
                    </div>

                    {/* Section 2 */}
                    <div className="space-y-4">
                      <div className="border-l-4 border-black pl-3 py-1 bg-gray-50">
                        <h3 className="text-sm font-black uppercase text-black">II. Relevamiento de Registros</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex border-b border-gray-100 py-1"><span className="font-bold w-32 shrink-0 text-gray-700">Est. Actas:</span> <span className="font-mono font-bold">{cemetery.estimatedRecords || '---'}</span></div>
                        <div className="flex border-b border-gray-100 py-1"><span className="font-bold w-32 shrink-0 text-gray-700">Cant. Libros:</span> <span className="font-mono font-bold">{cemetery.numberOfBooks || '---'}</span></div>
                        <div className="flex border-b border-gray-100 py-1"><span className="font-bold w-32 shrink-0 text-gray-700">Cronología:</span> <span>{cemetery.dateRangeFrom || '-'} al {cemetery.dateRangeTo || '-'}</span></div>
                        <div className="flex border-b border-gray-100 py-1"><span className="font-bold w-32 shrink-0 text-gray-700">Previo FS:</span> <span className="font-bold">{fsAlreadyDigitized ? 'SÍ (REVISAR)' : 'NO (NUEVO)'}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3 */}
                  <div className="mt-10 space-y-4">
                    <div className="border-l-4 border-black pl-3 py-1 bg-gray-50">
                      <h3 className="text-sm font-black uppercase text-black">III. Planificación Institucional (Etapa 3)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 text-sm bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Responsable FS Notificado</label>
                        <p className="font-bold text-gray-900 border-b border-gray-300 pb-1">{managerNotifiedName || 'No definido'}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Disponibilidad del Contacto</label>
                        <p className="font-bold text-gray-900 border-b border-gray-300 pb-1">{formatDisplayDate(readyForVisitDate)}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Fecha de Notificación GRI</label>
                        <p className="font-bold text-gray-900 border-b border-gray-300 pb-1">{formatDisplayDate(managerNotifiedDate)}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Estado de la Misión</label>
                        <p className="font-bold text-purple-700 border-b border-purple-300 pb-1 uppercase">Cita Institucional Pendiente</p>
                      </div>
                    </div>
                  </div>

                  {/* Bitácora / Anexo */}
                  <div className="mt-12 break-before-page">
                    <div className="border-b-2 border-black pb-2 mb-6">
                      <h3 className="text-lg font-black uppercase text-black">Apéndice: Bitácora de Gestiones</h3>
                      <p className="text-xs text-gray-500">Historial de acercamiento y contactos realizados por el equipo de misioneros</p>
                    </div>
                    {renderVisitLog()}
                  </div>

                  {/* Footer */}
                  <div className="mt-16 pt-8 border-t border-gray-200 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold italic">Este documento ha sido generado automáticamente por el Sistema OC Oportunidades Cementerios. Todos los derechos reservados © 2026.</p>
                  </div>
                </div>

                <div className="flex justify-center print:hidden">
                   <button type="button" onClick={handleSaveStageData} className="btn-primary py-3 px-12 text-sm flex items-center space-x-2 shadow-xl bg-purple-700 hover:bg-purple-800">
                      <Save size={18} />
                      <span>Sincronizar Cambios con la Base de Datos</span>
                    </button>
                </div>
              </div>
            )}

            {currentStage === 4 && (
              <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                <div className="bg-[var(--color-fs-bg-alt)] border border-[var(--color-fs-border)] text-[var(--color-secondary)] p-6 rounded-xl flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-[var(--color-fs-bg)] rounded-full flex items-center justify-center shadow-sm border border-[var(--color-fs-border)]">
                    <Camera size={32} className="text-[var(--color-secondary)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl">Proceso de Digitalización</h4>
                    <p className="mt-2 max-w-md mx-auto font-medium text-[var(--color-fs-text-secondary)]">Esta etapa no depende de tu departamento. Marca esta casilla únicamente cuando el equipo de cámaras haya confirmado que la captura de imágenes ha finalizado.</p>
                  </div>
                  <label className="flex items-center space-x-3 cursor-pointer bg-[var(--color-fs-bg)] px-6 py-4 rounded-xl shadow-sm border border-[var(--color-fs-border)] hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-100)] transition-colors mt-4">
                    <input 
                      type="checkbox" 
                      checked={isDigitizationConfirmed}
                      onChange={(e) => setIsDigitizationConfirmed(e.target.checked)}
                      className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-6 h-6 border-[var(--color-fs-border)]" 
                    />
                    <span className="font-bold text-lg text-[var(--color-secondary)]">Confirmar Digitalización Completada</span>
                  </label>
                </div>
                
                {/* Render Visit Log */}
                <div>
                  {renderVisitLog()}
                </div>
              </form>
            )}

            {currentStage === 5 && (
              <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                <div className="bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] text-[var(--color-primary-800)] p-5 rounded-xl mb-6 flex items-start space-x-3">
                  <HeartHandshake className="flex-shrink-0 mt-0.5" size={24} />
                  <div>
                    <h4 className="font-bold text-lg">Postventa y Fidelización</h4>
                    <p className="text-sm mt-1 font-medium">Registra la entrega del Disco Rígido (DRR) y la capacitación brindada al personal del cementerio.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Persona que recibió el DRR</label>
                    <input type="text" placeholder="Ej. Juan Pérez" value={stage5Data.drrRecipient} onChange={e => setStage5Data({...stage5Data, drrRecipient: e.target.value})} className="w-full bg-[var(--color-fs-bg)] border-[var(--color-fs-border)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Fecha de entrega de DRR</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={stage5Data.drrDeliveryDate} 
                        onChange={e => setStage5Data({...stage5Data, drrDeliveryDate: e.target.value})} 
                        className="w-full text-sm p-2 bg-[var(--color-fs-bg)] text-transparent border-[var(--color-fs-border)] focus:text-transparent appearance-none" 
                      />
                      <div className="absolute inset-y-[1px] left-[1px] right-10 pl-3 flex items-center pointer-events-none text-sm text-[var(--color-fs-text)] bg-[var(--color-fs-bg)] rounded-l-lg font-medium">
                        {stage5Data.drrDeliveryDate ? formatDisplayDate(stage5Data.drrDeliveryDate) : <span className="text-[var(--color-fs-text-secondary)] italic">dd/mm/aaaa</span>}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Nombre de la persona que recibió la capacitación</label>
                    <input type="text" placeholder="Ej. María Gómez" value={stage5Data.trainingRecipient} onChange={e => setStage5Data({...stage5Data, trainingRecipient: e.target.value})} className="w-full bg-[var(--color-fs-bg)] border-[var(--color-fs-border)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Fecha de Capacitación</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={stage5Data.trainingDate} 
                        onChange={e => setStage5Data({...stage5Data, trainingDate: e.target.value})} 
                        className="w-full text-sm p-2 bg-[var(--color-fs-bg)] text-transparent border-[var(--color-fs-border)] focus:text-transparent appearance-none" 
                      />
                      <div className="absolute inset-y-[1px] left-[1px] right-10 pl-3 flex items-center pointer-events-none text-sm text-[var(--color-fs-text)] bg-[var(--color-fs-bg)] rounded-l-lg font-medium">
                        {stage5Data.trainingDate ? formatDisplayDate(stage5Data.trainingDate) : <span className="text-[var(--color-fs-text-secondary)] italic">dd/mm/aaaa</span>}
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Resolución de dudas / Notas de Postventa</label>
                    <textarea rows={4} placeholder="¿Qué dudas tuvieron? ¿Cómo fue la recepción del programa?" value={stage5Data.postSaleNotes} onChange={e => setStage5Data({...stage5Data, postSaleNotes: e.target.value})} className="w-full bg-[var(--color-fs-bg)] border-[var(--color-fs-border)]"></textarea>
                  </div>
                  <div className="md:col-span-2 bg-[var(--color-fs-bg-alt)] p-4 rounded-xl border border-[var(--color-fs-border)]">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={stage5Data.processCompleted}
                        onChange={e => setStage5Data({...stage5Data, processCompleted: e.target.checked})}
                        className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-5 h-5 border-[var(--color-fs-border)]" 
                      />
                      <span className="font-bold text-[var(--color-fs-text)]">Proceso completo finalizado exitosamente</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button type="button" onClick={handleSaveStageData} className="btn-secondary flex items-center space-x-2">
                    <Save size={18} />
                    <span>Guardar Postventa</span>
                  </button>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-bold text-[var(--color-fs-text)] mb-4">Chat / Registro de Visitas de Postventa</h3>
                  {renderVisitLog()}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('login'); 
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [selectedCemeteryId, setSelectedCemeteryId] = useState<string | null>(null);
  const [selectedMissionaryId, setSelectedMissionaryId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cemeteries, setCemeteries] = useState<any[]>([]);
  const [missionaries, setMissionaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Escuchar cambios de autenticación
  useEffect(() => {
    auth.getSession().then(s => {
      setSession(s);
      if (s) setCurrentView('dashboard');
      setAuthLoading(false);
    });

    const subscription = auth.onAuthStateChange((s) => {
      setSession(s);
      if (s) {
        // Solo redirigir al dashboard si el usuario estaba en Login o Register
        // Esto evita que al hacer Alt+Tab o refrescar sesión silenciosamente
        // el usuario sea expulsado de la vista de detalle en la que estaba trabajando.
        setCurrentView(prev => (prev === 'login' || prev === 'register') ? 'dashboard' : prev);
      } else {
        setCurrentView('login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Carga inicial 
  const loadData = () => {
    if (!session) return;
    setLoading(true);
    setDbError(null);
    Promise.all([api.getCemeteries(), api.getMissionaries()])
      .then(([cemData, misData]) => {
        setCemeteries(cemData);
        setMissionaries(misData);
      })
      .catch((err) => {
        setDbError('No se pudo conectar a Supabase. ' + err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    if (session) {
      loadData(); 
    }
  }, [session]);

  // Apply dark mode class to html element
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogin = async (email: string, pass: string) => {
    await auth.signIn(email, pass);
    // onAuthStateChange se encarga del resto
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const handleNavigateToList = (stageId: number | null = null) => {
    setFilterStage(stageId);
    setCurrentView('list');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Theme toggle button component
  const ThemeToggle = () => (
    <button 
      onClick={toggleDarkMode}
      className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-[var(--color-fs-bg)] shadow-lg border border-[var(--color-fs-border)] text-[var(--color-fs-text)] hover:scale-110 transition-transform print:hidden"
      aria-label="Toggle Dark Mode"
    >
      {isDarkMode ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );

  const handleRegister = async (newMissionary: any, pass: string) => {
    // 1. Crear el usuario en Supabase Auth
    await auth.signUp(newMissionary.email, pass, { name: newMissionary.name });
    
    // 2. Crear el perfil en la tabla de misioneros si es necesario (el trigger de Supabase es mejor pero lo hacemos aquí por sencillez)
    await api.createMissionary(newMissionary);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-fs-bg-alt)]">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (currentView === 'login' && !session) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} onRegister={handleRegister} />
        <ThemeToggle />
      </>
    );
  }

  return (
    <>
      <Layout currentView={currentView} setCurrentView={setCurrentView} onLogout={handleLogout}>
        {currentView === 'dashboard' && (
          <DashboardScreen 
            cemeteries={cemeteries}
            missionaries={missionaries}
            onNavigateToList={handleNavigateToList} 
            onOpenDetail={(id: string) => { setSelectedCemeteryId(id); setCurrentView('detail'); }} 
            onNavigateToMissionaries={() => setCurrentView('missionaries')}
            onNavigateToNewCemetery={() => setCurrentView('new')}
          />
        )}
        {currentView === 'list' && (
          <CemeteryListScreen 
            cemeteries={cemeteries}
            initialFilterStage={filterStage}
            onOpenDetail={(id: string) => { setSelectedCemeteryId(id); setCurrentView('detail'); }} 
            onNewCemetery={() => setCurrentView('new')}
          />
        )}
        {currentView === 'detail' && (
          <CemeteryDetailScreen 
            id={selectedCemeteryId} 
            cemeteries={cemeteries}
            missionaries={missionaries}
            showToast={showToast}
            onUpdateCemetery={(id: string, updates: any) => {
              if (Object.keys(updates).length === 0) {
                // Si no hay actualizaciones de campos, solo recargamos (útil para visitas nuevas)
                loadData();
                return;
              }
              api.updateCemetery(id, updates)
                .then(() => loadData())
                .catch(err => showToast(err.message || 'Error al actualizar', 'error'));
            }}
            onBack={() => setCurrentView('list')} 
          />
        )}
        {currentView === 'new' && (
          <NewCemeteryScreen 
            onBack={() => setCurrentView('list')} 
            onSave={(data) => {
              setLoading(true);
              api.createCemetery({
                ...data,
                stage: 0,
                entryDate: new Date().toISOString().split('T')[0],
                lastContactDate: new Date().toISOString().split('T')[0],
                missionary: 'Sin asignar',
                inventory: 0
              })
                .then(() => {
                  loadData();
                  setCurrentView('list');
                  showToast('Cementerio creado con éxito');
                })
                .catch(err => showToast('Error al guardar cementerio: ' + err.message, 'error'))
                .finally(() => setLoading(false));
            }}
          />
        )}
        {currentView === 'missionaries' && (
          <MissionaryListScreen 
            missionaries={missionaries}
            cemeteries={cemeteries}
            onNewMissionary={() => setCurrentView('new_missionary')}
            onOpenDetail={(id: string) => { setSelectedMissionaryId(id); setCurrentView('missionary_detail'); }}
          />
        )}
        {currentView === 'missionary_detail' && (
          <MissionaryDetailScreen
            id={selectedMissionaryId}
            missionaries={missionaries}
            cemeteries={cemeteries}
            onBack={() => setCurrentView('missionaries')}
            onUpdateMissionary={(id: string, updates: any) => {
              api.updateMissionary(id, updates)
                .then(() => {
                  loadData();
                  showToast('Misionero actualizado');
                })
                .catch(err => showToast('Error al actualizar misionero: ' + err.message, 'error'));
            }}
            onAssignCemetery={(cemeteryId: string, missionaryId: string) => {
              const selectedMissionary = missionaries.find(m => m.id === missionaryId);
              api.updateCemetery(cemeteryId, { 
                missionaryId, 
                missionary: selectedMissionary?.name,
                missionaryEmail: selectedMissionary?.email
              })
                .then(() => {
                  loadData();
                  showToast('Cementerio asignado');
                })
                .catch(err => showToast('Error al asignar cementerio: ' + err.message, 'error'));
            }}
            onRemoveCemetery={(cemeteryId: string) => {
              api.updateCemetery(cemeteryId, { 
                missionaryId: null, 
                missionary: 'Sin asignar',
                missionaryEmail: ''
              })
                .then(() => {
                  loadData();
                  showToast('Vínculo removido');
                })
                .catch(err => showToast('Error al quitar cementerio: ' + err.message, 'error'));
            }}
          />
        )}
        {currentView === 'new_missionary' && (
          <NewMissionaryScreen 
            onCancel={() => setCurrentView('missionaries')}
            onSave={(data: any) => {
              api.createMissionary(data)
                .then(() => {
                  loadData();
                  setCurrentView('missionaries');
                  showToast('Nuevo misionero creado');
                })
                .catch(err => showToast('Error al crear misionero: ' + err.message, 'error'));
            }}
          />
        )}
        {currentView === 'reports' && (
          <ReportsScreen cemeteries={cemeteries} missionaries={missionaries} />
        )}
      </Layout>
      <ThemeToggle />
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </>
  );
}

const ReportsScreen = ({ cemeteries, missionaries }: any) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filtrar cementerios por fecha de ingreso
  const filteredCemeteries = cemeteries.filter((c: any) => {
    if (!dateFrom && !dateTo) return true;
    const entryDate = c.entryDate;
    if (!entryDate) return false;
    const from = dateFrom || '1900-01-01';
    const to = dateTo || '2100-12-31';
    return entryDate >= from && entryDate <= to;
  });

  const completed = filteredCemeteries.filter((c: any) => c.processCompleted).length;
  
  const stageStats = stages.map(s => ({
    ...s,
    count: filteredCemeteries.filter((c: any) => c.stage === s.id && !c.processCompleted).length
  }));

  const totalRecords = filteredCemeteries.reduce((acc: number, c: any) => acc + (c.estimatedRecords || 0), 0);
  
  // Agrupación por país
  const countryStats = COUNTRY_DATA.map(country => ({
    name: country.name,
    count: filteredCemeteries.filter((c: any) => c.country === country.name).length
  })).filter(c => c.count > 0);

  // Rankings de Misioneros (Visitas totales)
  const missionaryStats = missionaries.map((m: any) => {
    const visitsCount = filteredCemeteries.reduce((acc: number, c: any) => {
      const missionaryVisits = (c.visits || []).filter((v: any) => v.missionary === m.name);
      return acc + missionaryVisits.length;
    }, 0);
    return { name: m.name, count: visitsCount };
  }).sort((a: any, b: any) => b.count - a.count).slice(0, 5);

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-[var(--color-secondary)]">Análisis de Operaciones Nacionales</h2>
          <p className="text-[var(--color-fs-text-secondary)] mt-1 font-medium tracking-tight">Reporte ejecutivo de productividad e impacto institucional</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-[var(--color-fs-bg)] p-3 rounded-2xl border border-[var(--color-fs-border)] shadow-sm print:hidden">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[var(--color-fs-text-secondary)] uppercase px-1">Desde</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs p-1 bg-transparent border-none focus:ring-0 text-[var(--color-fs-text)]" />
          </div>
          <div className="w-px h-8 bg-[var(--color-fs-border)]"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[var(--color-fs-text-secondary)] uppercase px-1">Hasta</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs p-1 bg-transparent border-none focus:ring-0 text-[var(--color-fs-text)]" />
          </div>
          <button onClick={() => window.print()} className="bg-[var(--color-primary)] text-white p-2 ml-2 rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors">
            <Printer size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--color-fs-bg)] p-6 rounded-2xl border border-[var(--color-fs-border)] shadow-sm flex flex-col justify-between h-32">
          <p className="text-xs font-bold text-[var(--color-fs-text-secondary)] uppercase flex items-center">
            <Database className="mr-2 opacity-50" size={14} /> Total Proyectos
          </p>
          <p className="text-4xl font-bold text-[var(--color-secondary)] tracking-tighter">{filteredCemeteries.length}</p>
        </div>
        <div className="bg-[var(--color-fs-bg)] p-6 rounded-2xl border border-[var(--color-fs-border)] shadow-sm border-l-4 border-l-[var(--color-fs-green)] flex flex-col justify-between h-32">
          <p className="text-xs font-bold text-[var(--color-fs-text-secondary)] uppercase flex items-center">
            <CheckCircle className="mr-2 text-[var(--color-fs-green)] opacity-50" size={14} /> Finalizados
          </p>
          <p className="text-4xl font-bold text-[var(--color-fs-green)] tracking-tighter">{completed}</p>
        </div>
        <div className="bg-[var(--color-fs-bg)] p-6 rounded-2xl border border-[var(--color-fs-border)] shadow-sm flex flex-col justify-between h-32">
          <p className="text-xs font-bold text-[var(--color-fs-text-secondary)] uppercase flex items-center">
            <FileText className="mr-2 opacity-50" size={14} /> Actas Estimadas
          </p>
          <p className="text-3xl font-bold text-[var(--color-secondary)] tracking-tighter">{totalRecords.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--color-fs-bg)] p-6 rounded-2xl border border-[var(--color-fs-border)] shadow-sm flex flex-col justify-between h-32">
          <p className="text-xs font-bold text-[var(--color-fs-text-secondary)] uppercase flex items-center">
            <Globe className="mr-2 opacity-50" size={14} /> Países Activos
          </p>
          <p className="text-4xl font-bold text-[var(--color-primary)] tracking-tighter">{countryStats.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Country Breakdown */}
        <div className="bg-[var(--color-fs-bg)] p-8 rounded-2xl border border-[var(--color-fs-border)] shadow-sm">
          <h3 className="font-bold text-[var(--color-secondary)] mb-6 flex items-center">
            <Globe className="mr-2 text-[var(--color-primary)]" size={20} />
            Distribución por País
          </h3>
          <div className="space-y-4">
            {countryStats.length > 0 ? countryStats.map((c, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-24 text-sm font-bold text-[var(--color-fs-text-secondary)]">{c.name}</div>
                <div className="flex-1 h-3 bg-[var(--color-fs-bg-alt)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${(c.count / filteredCemeteries.length) * 100}%` }}></div>
                </div>
                <div className="w-10 text-right text-xs font-black">{c.count}</div>
              </div>
            )) : (
              <p className="text-sm text-[var(--color-fs-text-secondary)] italic">No hay datos para este periodo.</p>
            )}
          </div>
        </div>

        {/* Missionary Productivity */}
        <div className="bg-[var(--color-fs-bg)] p-8 rounded-2xl border border-[var(--color-fs-border)] shadow-sm">
          <h3 className="font-bold text-[var(--color-secondary)] mb-6 flex items-center">
            <Users className="mr-2 text-[var(--color-primary)]" size={20} />
            Top Productividad de Misioneros
          </h3>
          <div className="space-y-4">
            {missionaryStats.length > 0 ? missionaryStats.map((m, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-[var(--color-fs-bg-alt)] rounded-xl border border-[var(--color-fs-border)]">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-100)] text-[var(--color-primary-700)] flex items-center justify-center font-bold text-xs">
                    {i + 1}
                  </div>
                  <span className="font-bold text-[var(--color-fs-text)] uppercase text-xs">{m.name}</span>
                </div>
                <span className="text-xs font-black text-[var(--color-primary)]">{m.count} contactos/visitas</span>
              </div>
            )) : (
              <p className="text-sm text-[var(--color-fs-text-secondary)] italic">No hay registros de visitas encontrados.</p>
            )}
          </div>
        </div>

        {/* Visits per Project Index */}
        <div className="lg:col-span-2 bg-[var(--color-fs-bg)] p-8 rounded-2xl border border-[var(--color-fs-border)] shadow-sm">
          <h3 className="font-bold text-[var(--color-secondary)] mb-6 flex items-center">
            <Activity className="mr-2 text-[var(--color-primary)]" size={20} />
            Índice de Visitas por Proyecto (Top 10)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[var(--color-fs-text-secondary)] border-b border-[var(--color-fs-border)]">
                  <th className="pb-3 px-2 font-bold uppercase text-[10px]">Cementerio</th>
                  <th className="pb-3 px-2 font-bold uppercase text-[10px]">País</th>
                  <th className="pb-3 px-2 font-bold uppercase text-[10px]">Etapa</th>
                  <th className="pb-3 px-2 font-bold uppercase text-[10px] text-center">Visitas/Contactos</th>
                  <th className="pb-3 px-2 font-bold uppercase text-[10px] text-right">Evolución</th>
                </tr>
              </thead>
              <tbody>
                {filteredCemeteries
                  .sort((a: any, b: any) => (b.visits?.length || 0) - (a.visits?.length || 0))
                  .slice(0, 10)
                  .map((cem: any, i) => (
                  <tr key={i} className="border-b border-[var(--color-fs-border)] hover:bg-[var(--color-fs-bg-alt)] transition-colors">
                    <td className="py-4 px-2 font-bold text-[var(--color-secondary)]">{cem.name}</td>
                    <td className="py-4 px-2">{cem.country}</td>
                    <td className="py-4 px-2">
                       <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: stages[cem.stage].color }}>
                         E{cem.stage}
                       </span>
                    </td>
                    <td className="py-4 px-2 text-center text-lg font-black text-[var(--color-primary)]">{cem.visits?.length || 0}</td>
                    <td className="py-4 px-2 text-right">
                      <div className="w-24 h-2 bg-[var(--color-fs-bg-alt)] rounded-full inline-block overflow-hidden">
                         <div className="h-full bg-[var(--color-primary)]" style={{ width: `${Math.min((cem.stage / 5) * 100, 100)}%` }}></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-[var(--color-fs-border)] text-center text-xs text-[var(--color-fs-text-secondary)] hidden print:block">
        Reporte Oficial OC Oportunidades Cementerios - Generado el {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};
