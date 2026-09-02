/**
 * Mapa canónico de servicios: nombre legible (frontend) -> collection key en la DB
 * Las claves están en su forma original legible y también proveemos la versión normalizada.
 */
const SERVICES = [
  { name: 'Cuidados Adultos', collection: 'cuidados_adultos' },
  { name: 'Plomeros', collection: 'plomeros' },
  { name: 'Pintor', collection: 'pintor' },
  { name: 'Electricistas', collection: 'electricistas' },
  { name: 'Gasistas', collection: 'gasistas' },
  { name: 'Limpieza Alfombras', collection: 'limpieza_alfombras' },
  { name: 'Limpieza Sillones', collection: 'limpieza_sillones' },
  { name: 'Limpieza de hogar', collection: 'limpieza_de_hogar' },
  { name: 'Tecnico de Aires Acondicionados', collection: 'service_aire_ac', aliases: ['tecnico_de_aires_ac','tecnico_de_aire_ac','tecnico_aires_ac'] },
  { name: 'Tecnico de heladera', collection: 'service_heladera', aliases: ['tecnico_de_heladera','tecnico_heladeras'] },
  { name: 'Arreglos generales', collection: 'arreglos_generales' },
  { name: 'Construcción - Maestros', collection: 'construccion_maestros' },
];

function normalizeName(s) {
  return String(s || '').trim().toLowerCase();
}

const mapByNormalized = {};
for (const s of SERVICES) {
  const norm = normalizeName(s.name);
  mapByNormalized[norm] = s.collection;
  // also accept underscored variant (used by frontend selects)
  mapByNormalized[norm.replace(/\s+/g, '_')] = s.collection;
  // also accept the collection key itself as a selector
  mapByNormalized[String(s.collection).toLowerCase()] = s.collection;
  // also accept explicit aliases if provided
  if (Array.isArray(s.aliases)) {
    for (const a of s.aliases) {
      mapByNormalized[normalizeName(a)] = s.collection;
      mapByNormalized[String(a).toLowerCase().replace(/\s+/g, '_')] = s.collection;
    }
  }
}

module.exports = { SERVICES, mapByNormalized, normalizeName };
