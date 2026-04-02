import React, { useState } from 'react';
import { ArrowLeft, Save, MapPin, Building, Users, FileText } from 'lucide-react';

export const NewCemeteryScreen = ({ onBack, onSave }: { onBack: () => void, onSave: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    province: '',
    country: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    adminType: 'Municipal',
    inventoryNotes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-[var(--color-fs-bg-alt)] rounded-full transition-colors text-[var(--color-fs-text-secondary)]">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-[var(--color-secondary)]">Nuevo Cementerio</h2>
          <p className="text-[var(--color-fs-text-secondary)] mt-1">Registra un nuevo cementerio en el sistema para iniciar el proceso.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Información General */}
        <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] p-6 md:p-8 border border-[var(--color-fs-border)]">
          <div className="flex items-center space-x-3 mb-6 border-b border-[var(--color-fs-border)] pb-4">
            <div className="w-10 h-10 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] rounded-xl flex items-center justify-center">
              <Building size={20} />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-fs-text)]">Información General</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Nombre del Cementerio *</label>
              <input 
                type="text" 
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej. Cementerio Municipal San Juan" 
                className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)] focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Tipo de Administración</label>
              <select 
                name="adminType"
                value={formData.adminType}
                onChange={handleChange}
                className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)] focus:ring-[var(--color-primary)]"
              >
                <option value="Municipal">Municipal</option>
                <option value="Privado">Privado</option>
                <option value="Religioso">Religioso</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] p-6 md:p-8 border border-[var(--color-fs-border)]">
          <div className="flex items-center space-x-3 mb-6 border-b border-[var(--color-fs-border)] pb-4">
            <div className="w-10 h-10 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] rounded-xl flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-fs-text)]">Ubicación</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">País *</label>
              <input 
                type="text" 
                name="country"
                required
                value={formData.country}
                onChange={handleChange}
                placeholder="Ej. Argentina" 
                className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)] focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Provincia / Estado *</label>
              <input 
                type="text" 
                name="province"
                required
                value={formData.province}
                onChange={handleChange}
                placeholder="Ej. Buenos Aires" 
                className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)] focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Ciudad *</label>
              <input 
                type="text" 
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                placeholder="Ej. La Plata" 
                className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)] focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Contacto Inicial */}
        <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] p-6 md:p-8 border border-[var(--color-fs-border)]">
          <div className="flex items-center space-x-3 mb-6 border-b border-[var(--color-fs-border)] pb-4">
            <div className="w-10 h-10 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-fs-text)]">Contacto Inicial (Opcional)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Nombre del Contacto</label>
              <input 
                type="text" 
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                placeholder="Ej. Lic. Roberto Gómez" 
                className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)] focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Teléfono</label>
              <input 
                type="tel" 
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="+54 11 1234-5678" 
                className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)] focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Correo Electrónico</label>
              <input 
                type="email" 
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="contacto@cementerio.gob.ar" 
                className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)] focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Notas Preliminares */}
        <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] p-6 md:p-8 border border-[var(--color-fs-border)]">
          <div className="flex items-center space-x-3 mb-6 border-b border-[var(--color-fs-border)] pb-4">
            <div className="w-10 h-10 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-fs-text)]">Notas Preliminares</h3>
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Observaciones sobre el inventario o estado</label>
            <textarea 
              name="inventoryNotes"
              value={formData.inventoryNotes}
              onChange={handleChange}
              rows={4}
              placeholder="Ej. Se estima que tienen registros desde 1890. El archivo parece estar en buenas condiciones..." 
              className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)] focus:ring-[var(--color-primary)]"
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button 
            type="button" 
            onClick={onBack}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn-primary flex items-center space-x-2"
          >
            <Save size={18} />
            <span>Guardar Cementerio</span>
          </button>
        </div>
      </form>
    </div>
  );
};
