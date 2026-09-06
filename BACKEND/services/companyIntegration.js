// Simulate an API call to a global company registry (e.g., Clearbit, Crunchbase)
const fetchCompanyRegistryDetails = async (companyName) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`[Registry Sync] Fetching records for company: ${companyName}`);

  // In reality, we'd make an API call to an external service.
  // For now, simulate some data.
  const industries = ['Software Development', 'FinTech', 'EdTech', 'E-commerce', 'HealthTech', 'Consulting'];
  const sizes = ['1-50 employees', '51-200 employees', '201-1000 employees', '1000+ employees'];
  
  const industry = industries[Math.floor(Math.random() * industries.length)];
  const size = sizes[Math.floor(Math.random() * sizes.length)];
  
  // Create a fake website
  const website = `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`;

  return {
    industry,
    size,
    website,
    verified: true
  };
};

module.exports = { fetchCompanyRegistryDetails };
