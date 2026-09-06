// Simulate an API call to the University's ERP system
const fetchStudentAcademicRecords = async (email) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`[ERP Sync] Fetching records for: ${email}`);

  // In reality, we'd make an axios call here to the university's API.
  // For now, generate random realistic data.
  const cgpa = (Math.random() * (10 - 6) + 6).toFixed(2); // CGPA between 6 and 10
  const activeBacklogs = Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : 0; // 20% chance of having 1-3 backlogs
  
  const departments = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil'];
  const department = departments[Math.floor(Math.random() * departments.length)];

  return {
    cgpa: parseFloat(cgpa),
    activeBacklogs,
    department,
    graduationYear: 2026
  };
};

module.exports = { fetchStudentAcademicRecords };
