// Location Intelligence for Roofing Projects
// Building codes, climate data, and local requirements

const locationContexts = {
  'CO': {
    state: 'Colorado',
    buildingCodes: 'Colorado Building Code (based on IBC 2018)',
    climateZone: 'High altitude, heavy snow loads',
    commonRequirements: [
      'Class 4 impact-resistant shingles in hail zones',
      'Snow load calculations required (varies 20-70 PSF)',
      'Ice dam protection in mountain areas',
      'Wind uplift resistance for plains areas'
    ],
    cities: {
      'Aspen': {
        snowLoad: '70 PSF',
        elevation: '7,908 ft',
        specialRequirements: [
          'No roofing work below 20°F',
          'Mandatory snow guards on steep slopes',
          'Enhanced ice dam protection required',
          'Permit required for all re-roofs ($500-800)'
        ],
        recommendedMaterials: [
          'Impact-resistant architectural shingles',
          'Ice and water shield (first 6 feet minimum)',
          'Snow guards for slopes over 6/12 pitch'
        ]
      },
      'Denver': {
        snowLoad: '30 PSF',
        elevation: '5,280 ft',
        specialRequirements: [
          'Hail-resistant materials required',
          'Wind uplift resistance (90+ mph)',
          'Permit required ($200-400)'
        ]
      },
      'Colorado Springs': {
        snowLoad: '25 PSF',
        elevation: '6,035 ft',
        specialRequirements: [
          'Wind and hail resistance required',
          'Wildfire considerations in interface zones'
        ]
      }
    }
  },
  'FL': {
    state: 'Florida',
    buildingCodes: 'Florida Building Code 7th Edition (2020)',
    climateZone: 'Hurricane zone, high humidity',
    commonRequirements: [
      'Hurricane straps and enhanced fastening',
      'Impact-resistant materials in HVHZ',
      'Sealed roof deck construction',
      'Enhanced drainage systems'
    ],
    cities: {
      'Miami': {
        windSpeed: '175+ mph (HVHZ)',
        specialRequirements: [
          'Impact-resistant shingles mandatory',
          'Secondary water barrier required',
          'Hurricane straps every 6 feet',
          'Permit and inspection required'
        ]
      }
    }
  },
  'CA': {
    state: 'California',
    buildingCodes: 'California Building Standards Code (Title 24)',
    climateZone: 'Seismic, wildfire risk',
    commonRequirements: [
      'Class A fire-rated materials in WUI zones',
      'Seismic-resistant fasteners',
      'Cool roof requirements in some areas',
      'Solar-ready construction'
    ]
  },
  'TX': {
    state: 'Texas',
    buildingCodes: 'Texas Building Code (based on IBC)',
    climateZone: 'High heat, severe weather',
    commonRequirements: [
      'High wind resistance (varies by region)',
      'Hail-resistant materials recommended',
      'Heat-reflective materials beneficial',
      'Tornado-resistant construction in some areas'
    ]
  }
};

const materialRecommendations = {
  'heavy_snow': {
    shingles: ['Architectural with high wind rating', 'Impact-resistant preferred'],
    underlayment: ['Ice and water shield', 'Synthetic underlayment'],
    accessories: ['Snow guards', 'Enhanced ventilation', 'Heated gutters']
  },
  'high_wind': {
    shingles: ['High wind rating (130+ mph)', 'Enhanced fastening pattern'],
    underlayment: ['Sealed deck system', 'Self-adhering underlayment'],
    accessories: ['Hurricane straps', 'Enhanced flashing']
  },
  'hail_zone': {
    shingles: ['Class 4 impact-resistant', 'Algae-resistant granules'],
    underlayment: ['Impact-resistant underlayment'],
    accessories: ['Impact-resistant gutters', 'Protective coatings']
  },
  'fire_zone': {
    shingles: ['Class A fire-rated', 'Non-combustible materials'],
    underlayment: ['Fire-resistant barriers'],
    accessories: ['Ember-resistant vents', 'Fire-safe flashing']
  }
};

export const getLocationContext = (address) => {
  // Extract state from address
  const stateMatch = address.match(/\b([A-Z]{2})\b/);
  const state = stateMatch ? stateMatch[1] : null;
  
  // Extract city from address
  const cityMatch = address.match(/([^,]+),\s*[A-Z]{2}/);
  const city = cityMatch ? cityMatch[1].trim() : null;
  
  if (!state || !locationContexts[state]) {
    return null;
  }
  
  const stateContext = locationContexts[state];
  const cityContext = city && stateContext.cities && stateContext.cities[city] 
    ? stateContext.cities[city] 
    : null;
  
  return {
    state: stateContext.state,
    city: city,
    buildingCodes: stateContext.buildingCodes,
    climateZone: stateContext.climateZone,
    commonRequirements: stateContext.commonRequirements,
    citySpecific: cityContext,
    materialRecommendations: getMaterialRecommendations(stateContext, cityContext)
  };
};

const getMaterialRecommendations = (stateContext, cityContext) => {
  const recommendations = [];
  
  // Determine applicable conditions
  if (cityContext?.snowLoad && parseInt(cityContext.snowLoad) > 40) {
    recommendations.push(...materialRecommendations.heavy_snow.shingles);
  }
  
  if (cityContext?.windSpeed && parseInt(cityContext.windSpeed) > 130) {
    recommendations.push(...materialRecommendations.high_wind.shingles);
  }
  
  if (stateContext.commonRequirements.some(req => req.includes('impact-resistant'))) {
    recommendations.push(...materialRecommendations.hail_zone.shingles);
  }
  
  if (stateContext.commonRequirements.some(req => req.includes('fire-rated'))) {
    recommendations.push(...materialRecommendations.fire_zone.shingles);
  }
  
  return [...new Set(recommendations)]; // Remove duplicates
};

export const getQuickActionsForLocation = (state) => {
  const locationActions = {
    'CO': [
      { id: 'co_snow_load', title: 'CO Snow Load Requirements', prompt: 'What are the snow load requirements for roofing in Colorado?' },
      { id: 'co_hail_protection', title: 'CO Hail Protection', prompt: 'What hail protection is required for roofs in Colorado?' },
      { id: 'co_mountain_roofing', title: 'Mountain Roofing Codes', prompt: 'What are the special requirements for roofing in Colorado mountain areas?' }
    ],
    'FL': [
      { id: 'fl_hurricane_codes', title: 'FL Hurricane Codes', prompt: 'What are the hurricane building codes for roofing in Florida?' },
      { id: 'fl_wind_mitigation', title: 'FL Wind Mitigation', prompt: 'Explain Florida wind mitigation requirements for roofing.' },
      { id: 'fl_hvhz_requirements', title: 'HVHZ Requirements', prompt: 'What are the High Velocity Hurricane Zone requirements for roofing?' }
    ],
    'CA': [
      { id: 'ca_fire_codes', title: 'CA Fire Codes', prompt: 'What are the fire safety requirements for roofs in California?' },
      { id: 'ca_seismic_requirements', title: 'CA Seismic Requirements', prompt: 'What seismic considerations apply to roofing in California?' },
      { id: 'ca_cool_roof', title: 'Cool Roof Requirements', prompt: 'What are California cool roof requirements?' }
    ],
    'TX': [
      { id: 'tx_wind_requirements', title: 'TX Wind Requirements', prompt: 'What wind resistance is required for roofs in Texas?' },
      { id: 'tx_hail_protection', title: 'TX Hail Protection', prompt: 'What hail protection is recommended for Texas roofs?' }
    ]
  };
  
  return locationActions[state] || [];
};

export default {
  getLocationContext,
  getQuickActionsForLocation
};