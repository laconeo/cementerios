import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, MapPin, Building, Users, FileText, Search, Loader } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon issue
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Region Data
const COUNTRIES_DATA: any = {
  "Argentina": ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"],
  "Chile": ["Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", "Metropolitana de Santiago", "O'Higgins", "Maule", "Ñuble", "Biobío", "Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"],
  "Uruguay": ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres"],
  "Paraguay": ["Asunción", "Concepción", "San Pedro", "Cordillera", "Guairá", "Caaguazú", "Caazapá", "Itapúa", "Misiones", "Paraguarí", "Alto Paraná", "Central", "Ñeembucú", "Amambay", "Canindeyú", "Presidente Hayes", "Boquerón", "Alto Paraguay"],
  "Bolivia": ["Beni", "Chuquisaca", "Cochabamba", "La Paz", "Oruro", "Pando", "Potosí", "Santa Cruz", "Tarija"],
  "Perú": ["Amazonas", "Ancash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao", "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali"],
  "Brasil": ["Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"],
  "Colombia": ["Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda", "San Andrés", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada"],
  "Ecuador": ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"],
  "México": ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Coahuila", "Colima", "Durazno", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas", "CDMX"],
  "España": ["Andalucía", "Aragón", "Asturias", "Baleares", "Canarias", "Cantabria", "Castilla y León", "Castilla-La Mancha", "Cataluña", "Extremadura", "Galicia", "Madrid", "Murcia", "Navarra", "País Vasco", "La Rioja", "Valencia"],
  "Estados Unidos": ["Alaska", "Alabama", "Arkansas", "Arizona", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Iowa", "Idaho", "Illinois", "Indiana", "Kansas", "Kentucky", "Louisiana", "Massachusetts", "Maryland", "Maine", "Michigan", "Minnesota", "Missouri", "Mississippi", "Montana", "North Carolina", "North Dakota", "Nebraska", "New Hampshire", "New Jersey", "New Mexico", "Nevada", "New York", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Virginia", "Vermont", "Washington", "Wisconsin", "West Virginia", "Wyoming"],
  "Venezuela": ["Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo", "Cojedes", "Delta Amacuro", "Falcón", "Guárico", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira", "Trujillo", "Vargas", "Yaracuy", "Zulia", "Distrito Capital"],
  "Canadá": ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland", "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan"],
  "Panamá": ["Bocas del Toro", "Coclé", "Colón", "Chiriquí", "Darién", "Herrera", "Los Santos", "Panamá", "Panamá Oeste", "Veraguas"],
  "Costa Rica": ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"],
  "Guatemala": ["Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa"],
  "Honduras": ["Atlántida", "Choluteca", "Colón", "Comayagua", "Copán", "Cortés", "El Paraíso", "Francisco Morazán", "Gracias a Dios", "Intibucá", "Islas de la Bahía", "La Paz", "Lempira", "Ocotepeque", "Olancho", "Santa Bárbara", "Valle", "Yoro"],
  "El Salvador": ["Ahuachapán", "Cabañas", "Chalatenango", "Cuscatlán", "La Libertad", "La Paz", "La Unión", "Morazán", "San Miguel", "San Salvador", "San Vicente", "Santa Ana", "Sonsonate", "Usulután"],
  "Nicaragua": ["Boaco", "Carazo", "Chinandega", "Chontales", "Estelí", "Granada", "Jinotega", "León", "Madriz", "Managua", "Masaya", "Matagalpa", "Nueva Segovia", "Río San Juan", "Rivas", "Costa Caribe Norte", "Costa Caribe Sur"],
  "República Dominicana": ["Azua", "Bahoruco", "Barahona", "Dajabón", "Distrito Nacional", "Duarte", "El Seibo", "Elías Piña", "Espaillat", "Hato Mayor", "Hermanas Mirabal", "Independencia", "La Altagracia", "La Romana", "La Vega", "María Trinidad Sánchez", "Monseñor Nouel", "Monte Cristi", "Monte Plata", "Pedernales", "Peravia", "Puerto Plata", "Samaná", "San Cristóbal", "San José de Ocoa", "San Juan", "San Pedro de Macorís", "Sánchez Ramírez", "Santiago", "Santiago Rodríguez", "Santo Domingo", "Valverde"]
};

// Component to handle map centering
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const NewCemeteryScreen = ({ onBack, onSave }: { onBack: () => void, onSave: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    province: '',
    country: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    adminType: 'Municipal',
    inventoryNotes: '',
    lat: -34.6037,
    lng: -58.3816
  });

  const [geocoding, setGeocoding] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-34.6037, -58.3816]);
  const [zoom, setZoom] = useState(4);
  const markerRef = useRef<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setFormData(prev => ({ ...prev, country, province: '', city: '' }));
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const province = e.target.value;
    setFormData(prev => ({ ...prev, province, city: '' }));
  };

  // Geocode when location fields change
  useEffect(() => {
    const geocode = async () => {
      if (!formData.country) return;
      
      let query = `${formData.country}`;
      if (formData.province) query = `${formData.province}, ${query}`;
      if (formData.city) query = `${formData.city}, ${query}`;
      if (formData.address) query = `${formData.address}, ${query}`;

      setGeocoding(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
        const data = await response.json();
        if (data && data[0]) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setFormData(prev => ({ ...prev, lat, lng }));
          setMapCenter([lat, lng]);
          
          // Ajustar zoom según qué tan específica es la búsqueda
          if (formData.address) setZoom(16);
          else if (formData.city) setZoom(13);
          else if (formData.province) setZoom(9);
          else setZoom(5);
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      } finally {
        setGeocoding(false);
      }
    };

    const timer = setTimeout(geocode, 1000); // Debounce
    return () => clearTimeout(timer);
  }, [formData.country, formData.province, formData.city, formData.address]);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const pos = marker.getLatLng();
        setFormData(prev => ({ ...prev, lat: pos.lat, lng: pos.lng }));
      }
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const provinces = formData.country ? (COUNTRIES_DATA[formData.country] || []) : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-[var(--color-fs-bg-alt)] rounded-full transition-colors text-[var(--color-fs-text-secondary)]">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-[var(--color-secondary)]">Nuevo Cementerio</h2>
            <p className="text-[var(--color-fs-text-secondary)] mt-1 font-medium">Registra los datos y ubicación precisa del cementerio.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Información General */}
          <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] p-6 border border-[var(--color-fs-border)]">
            <div className="flex items-center space-x-3 mb-6 border-b border-[var(--color-fs-border)] pb-4">
              <div className="w-10 h-10 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] rounded-xl flex items-center justify-center">
                <Building size={20} />
              </div>
              <h3 className="text-xl font-bold text-[var(--color-fs-text)]">Información General</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Nombre del Cementerio *</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej. Cementerio Municipal San Juan" 
                  className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Tipo de Administración</label>
                <select 
                  name="adminType"
                  value={formData.adminType}
                  onChange={handleChange}
                  className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)]"
                >
                  <option value="Municipal">Municipal</option>
                  <option value="Privado">Privado</option>
                  <option value="Religioso">Religioso</option>
                  <option value="Mixto">Mixto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ubicación Detallada */}
          <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] p-6 border border-[var(--color-fs-border)]">
            <div className="flex items-center justify-between mb-6 border-b border-[var(--color-fs-border)] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] rounded-xl flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-fs-text)]">Ubicación</h3>
              </div>
              {geocoding && <div className="flex items-center text-xs text-[var(--color-primary)] font-bold animate-pulse">
                <Loader className="animate-spin mr-1" size={14} />
                Localizando...
              </div>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">País *</label>
                <select 
                  name="country"
                  required
                  value={formData.country}
                  onChange={handleCountryChange}
                  className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)]"
                >
                  <option value="">Seleccionar País</option>
                  {Object.keys(COUNTRIES_DATA).sort().map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Provincia / Comuna *</label>
                {formData.country && formData.country !== 'Otro' ? (
                  <select 
                    name="province"
                    required
                    value={formData.province}
                    onChange={handleProvinceChange}
                    className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)]"
                  >
                    <option value="">Seleccionar</option>
                    {provinces.sort().map((p: string) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    name="province"
                    required
                    value={formData.province}
                    onChange={handleChange}
                    placeholder="Provincia" 
                    className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)]"
                  />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Ciudad / Localidad *</label>
                <input 
                  type="text" 
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Ej. La Plata" 
                  className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2 text-[var(--color-fs-text)]">Calle y Número</label>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Ej. Calle Falsa 123" 
                  className="w-full bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)]"
                />
              </div>
              <div className="flex space-x-2 md:col-span-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[var(--color-fs-text-secondary)] uppercase">Latitud</label>
                  <div className="bg-[var(--color-fs-bg-alt)] p-2 rounded-lg text-sm font-mono border border-[var(--color-fs-border)]">
                    {formData.lat.toFixed(6)}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[var(--color-fs-text-secondary)] uppercase">Longitud</label>
                  <div className="bg-[var(--color-fs-bg-alt)] p-2 rounded-lg text-sm font-mono border border-[var(--color-fs-border)]">
                    {formData.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 flex flex-col">
          {/* Mapa Interactiva */}
          <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] border border-[var(--color-fs-border)] flex-1 flex flex-col overflow-hidden min-h-[400px]">
            <div className="p-4 bg-[var(--color-fs-bg-alt)] border-b border-[var(--color-fs-border)] flex justify-between items-center">
              <h3 className="font-bold text-[var(--color-fs-text)] flex items-center">
                <MapPin className="mr-2 text-[var(--color-primary)]" size={18} />
                Ubicación en Mapa
              </h3>
              <p className="text-[10px] text-[var(--color-fs-text-secondary)] font-bold uppercase">Arrastra el marcador para ajustar</p>
            </div>
            <div className="flex-1 relative z-10 w-full">
              <MapContainer 
                center={mapCenter} 
                zoom={zoom} 
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <ChangeView center={mapCenter} zoom={zoom} />
                <Marker 
                  position={[formData.lat, formData.lng]} 
                  draggable={true}
                  eventHandlers={eventHandlers}
                  ref={markerRef}
                >
                  <Popup>
                    <div className="text-center font-bold text-xs p-1">
                      Ubicación del Cementerio
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

          {/* Contacto & Notas Compacto */}
          <div className="bg-[var(--color-fs-bg)] rounded-[var(--radius-fs)] shadow-[var(--shadow-card)] p-6 border border-[var(--color-fs-border)]">
            <h3 className="text-lg font-bold mb-4 flex items-center text-[var(--color-fs-text)]">
              <Users className="mr-2 text-[var(--color-primary)]" size={18} /> 
              Contacto & Notas
            </h3>
            <div className="space-y-4">
              <input 
                type="text" 
                name="contactName" 
                placeholder="Nombre del Contacto" 
                value={formData.contactName} 
                onChange={handleChange} 
                className="w-full text-sm p-3 bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)]"
              />
              <textarea 
                name="inventoryNotes" 
                rows={2} 
                placeholder="Notas adicionales..." 
                value={formData.inventoryNotes} 
                onChange={handleChange} 
                className="w-full text-sm p-3 bg-[var(--color-fs-bg-alt)] border-[var(--color-fs-border)]"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button type="button" onClick={onBack} className="btn-secondary py-2 px-6">Cancelar</button>
              <button type="submit" className="btn-primary py-2 px-8 shadow-lg">
                <Save size={18} className="mr-2" />
                Guardar Cementerio
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
