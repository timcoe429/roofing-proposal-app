// Location Intelligence Service
// Handles building codes, climate factors, and local requirements

const LOCATION_DATA = {
  // States with specific roofing requirements
  'FL': {
    name: 'Florida',
    buildingCodes: [
      'High Velocity Hurricane Zone (HVHZ) compliance required in Miami-Dade and Broward',
      'Wind resistance: 150+ mph in coastal areas',
      'Impact resistance required in hurricane zones',
      'Tile and metal roofing preferred for longevity'
    ],
    climateFactors: [
      'Hurricane season: June-November',
      'High humidity and UV exposure',
      'Frequent thunderstorms',
      'Salt air corrosion in coastal areas'
    ],
    permitRequired: true,
    inspectionRequired: true,
    energyRequirements: ['ENERGY STAR rated materials recommended'],
    materialRecommendations: [
      'Impact-resistant shingles (Class 4)',
      'Metal roofing with high wind ratings',
      'Tile roofing with proper fastening',
      'Cool roof technology for energy efficiency'
    ]
  },
  'CA': {
    name: 'California',
    buildingCodes: [
      'Title 24 energy efficiency standards',
      'Fire-resistant materials required in WUI zones',
      'Seismic considerations for mounting systems',
      'Cool roof requirements in climate zones 10-15'
    ],
    climateFactors: [
      'Wildfire risk in many areas',
      'Seismic activity considerations',
      'Extreme heat in inland areas',
      'Coastal fog and moisture'
    ],
    permitRequired: true,
    inspectionRequired: true,
    energyRequirements: [
      'Cool roof compliance (SRI ≥ 75 for steep slope)',
      'Solar-ready requirements for new construction'
    ],
    materialRecommendations: [
      'Class A fire-rated materials',
      'Cool roof certified products',
      'Impact-resistant in hail-prone areas',
      'Seismic-rated mounting systems'
    ]
  },
  'TX': {
    name: 'Texas',
    buildingCodes: [
      'Wind resistance: 90-130 mph depending on region',
      'Hail resistance recommended (Class 3-4)',
      'Energy efficiency requirements',
      'Local amendments vary by city'
    ],
    climateFactors: [
      'Severe hail storms',
      'High winds and tornadoes',
      'Extreme heat in summer',
      'UV degradation concerns'
    ],
    permitRequired: true,
    inspectionRequired: true,
    energyRequirements: ['ENERGY STAR certification recommended'],
    materialRecommendations: [
      'Impact-resistant shingles (Class 3-4)',
      'High wind-rated materials',
      'Cool roof technology',
      'Proper ventilation systems'
    ]
  },
  'NY': {
    name: 'New York',
    buildingCodes: [
      'Snow load requirements: 30-50 psf',
      'Ice dam prevention measures',
      'Energy conservation code compliance',
      'NYC has additional requirements'
    ],
    climateFactors: [
      'Heavy snow loads',
      'Ice dam formation',
      'Freeze-thaw cycles',
      'High heating costs'
    ],
    permitRequired: true,
    inspectionRequired: true,
    energyRequirements: ['R-49 minimum attic insulation'],
    materialRecommendations: [
      'Ice and water shield required',
      'Proper ventilation for ice dam prevention',
      'Snow guards for metal roofing',
      'High-quality underlayment'
    ]
  }
};

// Default requirements for states not specifically listed
const DEFAULT_REQUIREMENTS = {
  buildingCodes: [
    'Local building code compliance required',
    'Manufacturer installation guidelines',
    'Proper ventilation requirements'
  ],
  climateFactors: [
    'Regional weather patterns',
    'Local environmental conditions'
  ],
  permitRequired: true,
  inspectionRequired: false,
  energyRequirements: ['Follow local energy codes'],
  materialRecommendations: [
    'Quality materials appropriate for climate',
    'Proper installation techniques',
    'Adequate ventilation'
  ]
};

export const getLocationRequirements = (state, city = '', zipCode = '') => {
  const stateCode = state?.toUpperCase();
  const requirements = LOCATION_DATA[stateCode] || DEFAULT_REQUIREMENTS;
  
  return {
    ...requirements,
    location: {
      state: stateCode,
      city,
      zipCode
    }
  };
};

export const getComplianceChecklist = (state, city = '') => {
  const requirements = getLocationRequirements(state, city);
  
  const checklist = [
    {
      id: 'permit',
      label: 'Building permit obtained',
      required: requirements.permitRequired,
      category: 'Legal'
    },
    {
      id: 'inspection',
      label: 'Inspection scheduled',
      required: requirements.inspectionRequired,
      category: 'Legal'
    }
  ];

  // Add material-specific requirements
  requirements.materialRecommendations.forEach((rec, index) => {
    checklist.push({
      id: `material_${index}`,
      label: rec,
      required: false,
      category: 'Materials'
    });
  });

  // Add energy requirements
  requirements.energyRequirements.forEach((req, index) => {
    checklist.push({
      id: `energy_${index}`,
      label: req,
      required: true,
      category: 'Energy'
    });
  });

  return checklist;
};

export const getLocationContext = (state, city = '', zipCode = '') => {
  const requirements = getLocationRequirements(state, city, zipCode);
  
  return `
LOCATION CONTEXT:
- Location: ${city}, ${state} ${zipCode}
- Climate Factors: ${requirements.climateFactors.join(', ')}
- Building Code Requirements: ${requirements.buildingCodes.join(', ')}
- Material Recommendations: ${requirements.materialRecommendations.join(', ')}
- Energy Requirements: ${requirements.energyRequirements.join(', ')}
- Permit Required: ${requirements.permitRequired ? 'Yes' : 'No'}
- Inspection Required: ${requirements.inspectionRequired ? 'Yes' : 'No'}
`;
};

export const getQuickActionsForLocation = (state) => {
  const stateCode = state?.toUpperCase();
  const baseActions = [
    {
      id: 'local_codes',
      title: 'Check Local Codes',
      prompt: `What are the specific building code requirements for roofing in ${state}?`
    },
    {
      id: 'permit_info',
      title: 'Permit Requirements',
      prompt: `What permits do I need for a roof replacement in ${state}?`
    },
    {
      id: 'material_recommendations',
      title: 'Local Material Specs',
      prompt: `What roofing materials are best for the climate in ${state}?`
    }
  ];

  // Add state-specific actions
  const stateSpecific = {
    'FL': [
      {
        id: 'hurricane_prep',
        title: 'Hurricane Compliance',
        prompt: 'What hurricane-resistant features should I include for this Florida roof?'
      }
    ],
    'CA': [
      {
        id: 'fire_rating',
        title: 'Fire Safety',
        prompt: 'What fire-resistant roofing requirements apply in California?'
      }
    ],
    'TX': [
      {
        id: 'hail_resistance',
        title: 'Hail Protection',
        prompt: 'What hail-resistant roofing options should I recommend for Texas?'
      }
    ]
  };

  return [...baseActions, ...(stateSpecific[stateCode] || [])];
};
