/** Especie identificada por BirdNET (o candidata alternativa), con sus nombres y taxonomía. */
export interface Species {
  id: string;
  commonName: string;
  commonNameEn: string;
  scientificName: string;
  family: string;
  order: string;
  iucnStatus: IucnStatus;
  imageUrl?: string;
  behaviorNotes?: string;
  /** Solo referencia, de Xeno-canto para la especie en general; nunca el análisis de una grabación concreta. */
  typicalVocalizations: string[];
}

/**
 * Nombre común en el idioma activo; si falta, el nombre científico. Nunca el del otro idioma:
 * así la interfaz en español no muestra nombres en inglés.
 */
export function speciesDisplayName(
  species: Pick<Species, 'commonName' | 'commonNameEn' | 'scientificName'>,
  lang: 'es' | 'en',
): string {
  const localized = lang === 'en' ? species.commonNameEn : species.commonName;
  return localized?.trim() || species.scientificName;
}

export type IucnStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'DD' | 'NE' | 'EW' | 'EX';

/**
 * Traduzco los valores del campo type de Xeno-canto que aparecen con frecuencia (claves en minúscula);
 * lo que no está aquí lo muestro tal cual (VocalizationTagPipe).
 */
export const XENO_CANTO_VOCALIZATION_LABELS: Record<string, string> = {
  song: 'vocalizationTag.song',
  singing: 'vocalizationTag.song',
  call: 'vocalizationTag.call',
  calls: 'vocalizationTag.call',
  'alarm call': 'vocalizationTag.alarmCall',
  'flight call': 'vocalizationTag.flightCall',
  'nocturnal flight call': 'vocalizationTag.nocturnalFlightCall',
  duet: 'vocalizationTag.duet',
  subsong: 'vocalizationTag.subsong',
  'begging call': 'vocalizationTag.beggingCall',
  'dawn song': 'vocalizationTag.dawnSong',
  purring: 'vocalizationTag.purring',
  drumming: 'vocalizationTag.drumming',
  // Valores vistos en el catálogo real de producción (octubre 2026).
  'contact call': 'vocalizationTag.contactCall',
  'various calls': 'vocalizationTag.call',
  chamado: 'vocalizationTag.call',
  'call of a fledgeling': 'vocalizationTag.fledglingCall',
  'call from birds at roost': 'vocalizationTag.roostCall',
  imitation: 'vocalizationTag.mimicry',
  'mimicry/imitation': 'vocalizationTag.mimicry',
  gobble: 'vocalizationTag.gobble',
  'song of victory': 'vocalizationTag.victorySong',
  // No vocal: sonido mecánico de alas, visto repetido en pruebas reales bajo
  // varias redacciones distintas del mismo fenómeno.
  wingbeats: 'vocalizationTag.wingSound',
  wings: 'vocalizationTag.wingSound',
  'wing beats': 'vocalizationTag.wingSound',
  'flapping of wings': 'vocalizationTag.wingSound',
  'mechanical sound - wings beating': 'vocalizationTag.wingSound',
  'wingbeats of flight display': 'vocalizationTag.wingSound',
};

/** Clave de traducción para un tag de Xeno-canto, o null si no está en el diccionario (el caller decide el fallback). */
export function xenoCantoVocalizationLabelKey(rawType: string): string | null {
  return XENO_CANTO_VOCALIZATION_LABELS[rawType.toLowerCase().trim()] ?? null;
}
