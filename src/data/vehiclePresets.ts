// Preset vehicle brands and their most common models in Qatar / GCC markets
// Supports dynamic addition and persistence in localStorage

export interface VehicleBrandPreset {
  name: string;
  category?: 'Japanese' | 'American' | 'German / European' | 'Korean' | 'Other';
  models: string[];
}

export const DEFAULT_VEHICLE_BRANDS: VehicleBrandPreset[] = [
  {
    name: 'Toyota',
    category: 'Japanese',
    models: [
      'Land Cruiser',
      'Prado',
      'Hilux',
      'Camry',
      'Corolla',
      'RAV4',
      'Fortuner',
      'Yaris',
      'Avalon',
      'FJ Cruiser',
      'Highlander',
      'Crown',
      'HiAce',
      'Innova'
    ]
  },
  {
    name: 'Lexus',
    category: 'Japanese',
    models: [
      'LX 600',
      'LX 570',
      'GX 460',
      'GX 550',
      'RX 350',
      'ES 350',
      'IS 300',
      'NX 350',
      'LS 500',
      'LC 500',
      'UX 200'
    ]
  },
  {
    name: 'Nissan',
    category: 'Japanese',
    models: [
      'Patrol',
      'Patrol Nismo',
      'Pathfinder',
      'X-Trail',
      'Altima',
      'Sunny',
      'Maxima',
      'Navara',
      'Kicks',
      'Urvan',
      'Armada'
    ]
  },
  {
    name: 'Kia',
    category: 'Korean',
    models: [
      'Sportage',
      'Seltos',
      'Telluride',
      'Sorento',
      'Cerato',
      'Carnival',
      'Pegas',
      'K5',
      'Sonet',
      'Picanto',
      'Cadenza'
    ]
  },
  {
    name: 'GMC',
    category: 'American',
    models: [
      'Yukon',
      'Yukon XL',
      'Yukon Denali',
      'Sierra 1500',
      'Sierra HD',
      'Acadia',
      'Terrain'
    ]
  },
  {
    name: 'Chevrolet',
    category: 'American',
    models: [
      'Tahoe',
      'Silverado',
      'Suburban',
      'Traverse',
      'Captiva',
      'Camaro',
      'Corvette',
      'Trailblazer',
      'Groove'
    ]
  },
  {
    name: 'Ford',
    category: 'American',
    models: [
      'F-150',
      'F-150 Raptor',
      'Explorer',
      'Expedition',
      'Ranger',
      'Everest',
      'Mustang',
      'Taurus',
      'Bronco',
      'Edge',
      'Territory'
    ]
  },
  {
    name: 'BMW',
    category: 'German / European',
    models: [
      'X5',
      'X6',
      'X7',
      '3 Series',
      '5 Series',
      '7 Series',
      'X3',
      'X1',
      '4 Series',
      'M5',
      'M3',
      'X4'
    ]
  },
  {
    name: 'Mercedes',
    category: 'German / European',
    models: [
      'G-Class (G63)',
      'S-Class (S500)',
      'E-Class',
      'C-Class',
      'GLE',
      'GLS',
      'GLC',
      'A-Class',
      'CLA',
      'Maybach',
      'GLA'
    ]
  },
  {
    name: 'Jeep',
    category: 'American',
    models: [
      'Wrangler Rubicon',
      'Wrangler Sahara',
      'Grand Cherokee',
      'Gladiator',
      'Cherokee',
      'Compass'
    ]
  },
  {
    name: 'Volkswagen',
    category: 'German / European',
    models: [
      'Touareg',
      'Teramont',
      'Tiguan',
      'Golf GTI',
      'Golf R',
      'Passat',
      'T-Roc',
      'Jetta',
      'Arteon'
    ]
  },
  {
    name: 'Audi',
    category: 'German / European',
    models: [
      'Q7',
      'Q8',
      'Q5',
      'A6',
      'A8',
      'A4',
      'Q3',
      'RSQ8',
      'A3',
      'e-tron'
    ]
  },
  {
    name: 'Suzuki',
    category: 'Japanese',
    models: [
      'Jimny',
      'Swift',
      'Vitara',
      'Grand Vitara',
      'Baleno',
      'Dzire',
      'Ertiga',
      'Ciaz'
    ]
  },
  {
    name: 'Hyundai',
    category: 'Korean',
    models: [
      'Tucson',
      'Santa Fe',
      'Sonata',
      'Elantra',
      'Palisade',
      'Accent',
      'Creta',
      'Creta Grand',
      'Azera',
      'Staria'
    ]
  },
  {
    name: 'Mitsubishi',
    category: 'Japanese',
    models: [
      'Pajero',
      'Outlander',
      'Montero Sport',
      'L200',
      'Eclipse Cross',
      'Attrage',
      'ASX'
    ]
  },
  {
    name: 'Land Rover',
    category: 'German / European',
    models: [
      'Range Rover Vogue',
      'Range Rover Sport',
      'Defender 110',
      'Defender 90',
      'Range Rover Velar',
      'Discovery',
      'Range Rover Evoque'
    ]
  },
  {
    name: 'Porsche',
    category: 'German / European',
    models: [
      'Cayenne',
      'Cayenne Coupe',
      'Macan',
      'Panamera',
      '911 Carrera',
      'Taycan'
    ]
  },
  {
    name: 'Honda',
    category: 'Japanese',
    models: [
      'Accord',
      'Civic',
      'CR-V',
      'Pilot',
      'HR-V',
      'City'
    ]
  },
  {
    name: 'Dodge',
    category: 'American',
    models: [
      'Charger',
      'Challenger',
      'Durango',
      'Ram 1500'
    ]
  },
  {
    name: 'Mazda',
    category: 'Japanese',
    models: [
      'CX-5',
      'CX-9',
      'CX-30',
      'Mazda 6',
      'Mazda 3'
    ]
  }
];

const STORAGE_KEY = 'nah_custom_vehicle_presets';

interface CustomPresetsStorage {
  customBrands: string[];
  customModels: Record<string, string[]>;
}

function getStoredCustomPresets(): CustomPresetsStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse stored vehicle presets', e);
  }
  return { customBrands: [], customModels: {} };
}

function saveStoredCustomPresets(data: CustomPresetsStorage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save vehicle presets', e);
  }
}

/**
 * Returns all available brands (defaults + user added custom brands)
 */
export function getAllVehicleBrands(): string[] {
  const custom = getStoredCustomPresets();
  const defaultNames = DEFAULT_VEHICLE_BRANDS.map(b => b.name);
  const combined = Array.from(new Set([...defaultNames, ...custom.customBrands]));
  return combined.sort((a, b) => a.localeCompare(b));
}

/**
 * Returns the most common models for a given brand name (case-insensitive)
 */
export function getVehicleModelsForBrand(brandName: string): string[] {
  if (!brandName || !brandName.trim()) return [];
  const normalized = brandName.trim().toLowerCase();

  const foundDefault = DEFAULT_VEHICLE_BRANDS.find(
    b => b.name.toLowerCase() === normalized
  );

  const defaultModels = foundDefault ? foundDefault.models : [];

  const custom = getStoredCustomPresets();
  const customList = Object.entries(custom.customModels).find(
    ([k]) => k.toLowerCase() === normalized
  );

  const customModels = customList ? customList[1] : [];
  const combined = Array.from(new Set([...defaultModels, ...customModels]));
  return combined;
}

/**
 * Adds a new custom brand to presets
 */
export function addCustomVehicleBrand(brandName: string, initialModel?: string): void {
  const trimmed = brandName.trim();
  if (!trimmed) return;

  const current = getStoredCustomPresets();
  if (!current.customBrands.some(b => b.toLowerCase() === trimmed.toLowerCase())) {
    current.customBrands.push(trimmed);
  }

  if (initialModel && initialModel.trim()) {
    const trimmedModel = initialModel.trim();
    if (!current.customModels[trimmed]) {
      current.customModels[trimmed] = [];
    }
    if (!current.customModels[trimmed].some(m => m.toLowerCase() === trimmedModel.toLowerCase())) {
      current.customModels[trimmed].push(trimmedModel);
    }
  }

  saveStoredCustomPresets(current);
}

/**
 * Adds a new custom model for a brand to presets
 */
export function addCustomVehicleModel(brandName: string, modelName: string): void {
  const trimmedBrand = brandName.trim();
  const trimmedModel = modelName.trim();
  if (!trimmedBrand || !trimmedModel) return;

  const current = getStoredCustomPresets();
  const key = Object.keys(current.customModels).find(
    k => k.toLowerCase() === trimmedBrand.toLowerCase()
  ) || trimmedBrand;

  if (!current.customModels[key]) {
    current.customModels[key] = [];
  }

  if (!current.customModels[key].some(m => m.toLowerCase() === trimmedModel.toLowerCase())) {
    current.customModels[key].push(trimmedModel);
  }

  saveStoredCustomPresets(current);
}
