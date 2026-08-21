// Standard College Department Catalog and Normalization Utilities

export const COLLEGE_DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science & Engineering', shortName: 'Computer Science', icon: '💻' },
  { code: 'IT', name: 'Information Technology', shortName: 'Information Technology', icon: '🌐' },
  { code: 'ECE', name: 'Electronics & Communication Engineering', shortName: 'ECE', icon: '📡' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering', shortName: 'EEE', icon: '⚡' },
  { code: 'MECH', name: 'Mechanical Engineering', shortName: 'Mechanical', icon: '⚙️' },
  { code: 'CIVIL', name: 'Civil Engineering', shortName: 'Civil', icon: '🏗️' },
  { code: 'AIDS', name: 'Artificial Intelligence & Data Science', shortName: 'AI & Data Science', icon: '🧠' },
  { code: 'AIML', name: 'Artificial Intelligence & Machine Learning', shortName: 'AI & ML', icon: '🤖' },
  { code: 'CSBS', name: 'Computer Science & Business Systems', shortName: 'CSBS', icon: '📊' },
  { code: 'AUTO', name: 'Automobile Engineering', shortName: 'Automobile', icon: '🚗' },
  { code: 'BIOTECH', name: 'Biotechnology', shortName: 'Biotech', icon: '🧬' }
];

export const DEPARTMENT_OPTIONS = COLLEGE_DEPARTMENTS.map(d => ({
  value: d.name,
  code: d.code,
  label: `${d.code} - ${d.name}`,
  icon: d.icon
}));

export const DEPARTMENT_NAMES = COLLEGE_DEPARTMENTS.map(d => d.name);

// Resilient Department Alias Dictionary
const DEPARTMENT_ALIASES = {
  'cse': [
    'computer science', 
    'computer science & engineering', 
    'computer science and engineering', 
    'cse', 
    'cs', 
    'computer science engineering'
  ],
  'it': [
    'information technology', 
    'it', 
    'info tech', 
    'information tech'
  ],
  'ece': [
    'electronics & communication', 
    'electronics and communication engineering', 
    'ece', 
    'electronics & communication engineering', 
    'electronics and communication',
    'electronics'
  ],
  'eee': [
    'electrical & electronics', 
    'electrical and electronics engineering', 
    'eee', 
    'electrical & electronics engineering', 
    'electrical and electronics',
    'electrical'
  ],
  'mech': [
    'mechanical', 
    'mechanical engineering', 
    'mech', 
    'me', 
    'mechanical eng'
  ],
  'civil': [
    'civil', 
    'civil engineering', 
    'ce', 
    'civil eng'
  ],
  'aids': [
    'artificial intelligence & data science', 
    'artificial intelligence and data science', 
    'ai & data science', 
    'ai and ds', 
    'aids', 
    'ai/ds',
    'data science & ai',
    'data science and ai'
  ],
  'aiml': [
    'artificial intelligence & machine learning', 
    'artificial intelligence and machine learning', 
    'ai & machine learning', 
    'aiml', 
    'ai/ml'
  ],
  'csbs': [
    'computer science & business systems', 
    'computer science and business systems', 
    'csbs'
  ],
  'auto': [
    'automobile', 
    'automobile engineering', 
    'auto', 
    'auto eng'
  ],
  'biotech': [
    'biotechnology', 
    'biotech', 
    'bio technology', 
    'bt'
  ]
};

/**
 * Normalizes any department string (code, full name, informal name) to a canonical code.
 */
export const normalizeDepartment = (dept) => {
  if (!dept) return '';
  const clean = String(dept).toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [canonical, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
    if (canonical === clean) return canonical;
    for (const alias of aliases) {
      if (alias.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) {
        return canonical;
      }
    }
  }
  return clean;
};

/**
 * Checks if student's department satisfies the allowed departments list.
 */
export const isDepartmentEligible = (studentDept, allowedDepts) => {
  if (!allowedDepts || allowedDepts.length === 0) return true;
  if (!studentDept) return false;
  
  const normStudent = normalizeDepartment(studentDept);
  return allowedDepts.some(d => {
    const raw = String(d).toLowerCase().trim();
    if (raw === 'all' || raw === 'all departments' || raw === 'any') return true;
    return normalizeDepartment(d) === normStudent;
  });
};

/**
 * Returns formatted label / icon for a given department string.
 */
export const getDepartmentMeta = (deptStr) => {
  const norm = normalizeDepartment(deptStr);
  const found = COLLEGE_DEPARTMENTS.find(d => d.code.toLowerCase() === norm);
  if (found) return found;
  return {
    code: deptStr || 'OTHER',
    name: deptStr || 'General',
    shortName: deptStr || 'General',
    icon: '🎓'
  };
};
