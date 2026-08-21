import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { COLLEGE_DEPARTMENTS, normalizeDepartment } from '../utils/departments';
import { exportDepartmentPlacementCSV } from '../utils/exportHelper';
import { toast } from 'react-hot-toast';

const DepartmentAnalytics = ({ applications = [], jobs = [], drives = [], selectedDriveId = 'ALL' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table' | 'placed_students'

  // Filter apps by drive
  const driveFilteredApps = useMemo(() => {
    if (selectedDriveId === 'ALL') return applications;
    return applications.filter(app => {
      const driveId = typeof app.drive === 'object' ? app.drive?._id : (app.drive || app.job?.drive?._id || app.job?.drive);
      return driveId === selectedDriveId;
    });
  }, [applications, selectedDriveId]);

  // Aggregate stats per department across all standard departments
  const departmentStats = useMemo(() => {
    const statsMap = {};

    // Initialize with standard college departments
    COLLEGE_DEPARTMENTS.forEach(dept => {
      statsMap[dept.code] = {
        code: dept.code,
        name: dept.name,
        shortName: dept.shortName,
        icon: dept.icon,
        applications: 0,
        shortlisted: 0,
        selected: 0,
        rejected: 0,
        withdrawn: 0,
        companies: new Set(),
        placedStudents: [],
        salaryPackages: []
      };
    });

    // Populate data from applications
    driveFilteredApps.forEach(app => {
      const rawDept = app.student?.academicDetails?.department || 'CSE';
      const normCode = normalizeDepartment(rawDept).toUpperCase();
      const targetDept = statsMap[normCode] || statsMap['CSE'];

      targetDept.applications += 1;

      if (['Shortlisted', 'Assessment Round', 'Technical Interview', 'HR Interview', 'Interview Scheduled'].includes(app.status)) {
        targetDept.shortlisted += 1;
      }

      if (app.status === 'Selected' || app.status === 'Hired') {
        targetDept.selected += 1;
        const compName = app.job?.company?.name || 'Company';
        targetDept.companies.add(compName);
        targetDept.placedStudents.push({
          _id: app._id,
          studentName: app.student?.name || 'Candidate',
          studentEmail: app.student?.email || '',
          cgpa: app.student?.academicDetails?.cgpa || 'N/A',
          jobTitle: app.job?.title || 'Position',
          companyName: compName,
          salary: app.job?.salary || 'Competitive',
          driveName: app.drive?.name || app.job?.drive?.name || 'Campus Drive',
          date: app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : 'Recent'
        });
      } else if (app.status === 'Rejected') {
        targetDept.rejected += 1;
      } else if (app.status === 'Withdrawn' || app.status === 'Terminated') {
        targetDept.withdrawn += 1;
      }
    });

    return Object.values(statsMap).map(d => ({
      ...d,
      companies: Array.from(d.companies),
      placementRate: d.applications > 0 ? Math.round((d.selected / d.applications) * 100) : 0
    }));
  }, [driveFilteredApps]);

  // Placed students list across all or selected departments
  const allPlacedStudents = useMemo(() => {
    const list = [];
    departmentStats.forEach(dept => {
      dept.placedStudents.forEach(st => {
        list.push({ ...st, department: dept.name, departmentCode: dept.code });
      });
    });
    return list;
  }, [departmentStats]);

  // Filtered by search and selected department
  const filteredDepartments = departmentStats.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          dept.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDeptFilter === 'ALL' || dept.code === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  const filteredPlacedStudents = allPlacedStudents.filter(st => {
    const matchesSearch = st.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          st.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          st.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDeptFilter === 'ALL' || st.departmentCode === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  // Top-level KPI counts
  const totalApplications = driveFilteredApps.length;
  const totalPlaced = allPlacedStudents.length;
  const overallRate = totalApplications > 0 ? Math.round((totalPlaced / totalApplications) * 100) : 0;

  // Chart data
  const chartData = departmentStats.map(d => ({
    name: d.code,
    fullName: d.shortName,
    Applications: d.applications,
    Placed: d.selected,
    Rate: d.placementRate
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#e11d48'];

  const handleExportCSV = () => {
    const targetDrive = drives.find(d => d._id === selectedDriveId);
    exportDepartmentPlacementCSV(departmentStats, targetDrive ? targetDrive.name : 'All Placement Drives');
    toast.success('Department-wise Placement CSV Report downloaded!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-900/40 text-blue-400 rounded-xl text-xl">🏛️</span>
            <h2 className="text-2xl font-bold text-white">Department-Wise Placement Statistics & Details</h2>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Comprehensive placement analytics, department performance metrics, and placed candidate directories
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 shrink-0"
        >
          <span>📥 Export Department CSV Report</span>
        </button>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-900/30 text-blue-400 text-2xl">🏛️</div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Total Departments</p>
            <h3 className="text-2xl font-bold text-white">{COLLEGE_DEPARTMENTS.length}</h3>
          </div>
        </div>

        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-purple-900/30 text-purple-400 text-2xl">📋</div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Tracked Applications</p>
            <h3 className="text-2xl font-bold text-white">{totalApplications}</h3>
          </div>
        </div>

        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-green-900/30 text-green-400 text-2xl">🎉</div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Placed / Hired Students</p>
            <h3 className="text-2xl font-bold text-green-400">{totalPlaced}</h3>
          </div>
        </div>

        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-yellow-900/30 text-yellow-400 text-2xl">📈</div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Avg Placement Conversion</p>
            <h3 className="text-2xl font-bold text-yellow-400">{overallRate}%</h3>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📊 Applications vs Placements by Department</span>
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                <Legend />
                <Bar dataKey="Applications" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Placed" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🥧 Placements Distribution</span>
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentStats.filter(d => d.selected > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="selected"
                  nameKey="code"
                >
                  {departmentStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* View Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-gray-800/80 p-4 rounded-2xl border border-gray-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'cards' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            📇 Department Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'table' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            📋 Comparison Table
          </button>
          <button
            onClick={() => setViewMode('placed_students')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'placed_students' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            🎓 Placed Students Directory ({allPlacedStudents.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
          >
            <option value="ALL">All Departments</option>
            {COLLEGE_DEPARTMENTS.map(d => (
              <option key={d.code} value={d.code}>{d.code} - {d.shortName}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search department or student..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500 w-full sm:w-60"
          />
        </div>
      </div>

      {/* VIEW 1: DEPARTMENT CARDS GRID */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map(dept => (
            <div
              key={dept.code}
              className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-blue-500/60 transition-all shadow-lg flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 bg-gray-900 rounded-xl border border-gray-700">{dept.icon}</span>
                    <div>
                      <h4 className="text-base font-bold text-white">{dept.name}</h4>
                      <span className="text-xs text-blue-400 font-semibold">{dept.code} Department</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-green-950 text-green-400 border border-green-800 rounded-lg text-xs font-bold">
                    {dept.placementRate}% Placed
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-900 rounded-full h-2.5 my-3 overflow-hidden border border-gray-700">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${dept.placementRate}%` }}
                  ></div>
                </div>

                {/* Stats Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-gray-900/60 rounded-xl border border-gray-700/60 my-2">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Applicants</span>
                    <strong className="text-white text-sm">{dept.applications}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Shortlisted</span>
                    <strong className="text-purple-300 text-sm">{dept.shortlisted}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Hired</span>
                    <strong className="text-green-400 text-sm">{dept.selected}</strong>
                  </div>
                </div>

                {/* Companies Hiring */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-gray-400 block mb-1">Recruiting Organizations:</span>
                  {dept.companies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {dept.companies.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-950 text-blue-300 rounded text-[11px] border border-blue-800/60">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 italic">No offers recorded yet</span>
                  )}
                </div>
              </div>

              {dept.placedStudents.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedDeptFilter(dept.code);
                    setViewMode('placed_students');
                  }}
                  className="w-full py-2 bg-gray-900 hover:bg-gray-700 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-colors border border-gray-700"
                >
                  View {dept.placedStudents.length} Placed Student(s) &rarr;
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: COMPARISON TABLE */}
      {viewMode === 'table' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-900 text-gray-400 border-b border-gray-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Department</th>
                  <th className="p-4">Code</th>
                  <th className="p-4 text-center">Total Applications</th>
                  <th className="p-4 text-center">Shortlisted</th>
                  <th className="p-4 text-center">Offers / Hired</th>
                  <th className="p-4 text-center">Placement Success %</th>
                  <th className="p-4">Hiring Organizations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800/60">
                {filteredDepartments.map((d) => (
                  <tr key={d.code} className="hover:bg-gray-700/40 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <span>{d.icon}</span>
                      <span>{d.name}</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-blue-400">{d.code}</td>
                    <td className="p-4 text-center font-bold text-white">{d.applications}</td>
                    <td className="p-4 text-center text-purple-300 font-semibold">{d.shortlisted}</td>
                    <td className="p-4 text-center text-green-400 font-bold">{d.selected}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold ${
                        d.placementRate >= 70 ? 'bg-green-950 text-green-400 border border-green-800' :
                        d.placementRate >= 40 ? 'bg-yellow-950 text-yellow-400 border border-yellow-800' :
                        'bg-gray-900 text-gray-400 border border-gray-700'
                      }`}>
                        {d.placementRate}%
                      </span>
                    </td>
                    <td className="p-4">
                      {d.companies.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {d.companies.map((c, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-900 text-gray-300 rounded text-[10px]">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">None yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: PLACED STUDENTS DIRECTORY */}
      {viewMode === 'placed_students' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-gray-700 pb-3">
            <div>
              <h3 className="text-lg font-bold text-white">Placed Candidates Directory</h3>
              <p className="text-xs text-gray-400">List of candidates who received verified placement offers</p>
            </div>
            <span className="px-3 py-1 bg-green-950 text-green-300 border border-green-800 rounded-xl text-xs font-bold">
              {filteredPlacedStudents.length} Offers Found
            </span>
          </div>

          {filteredPlacedStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs italic bg-gray-900/40 rounded-xl border border-gray-800">
              No placement offers recorded for the selected department / search criteria yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="p-3.5">Candidate</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">CGPA</th>
                    <th className="p-3.5">Organization</th>
                    <th className="p-3.5">Position Role</th>
                    <th className="p-3.5">Package</th>
                    <th className="p-3.5">Placement Drive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                  {filteredPlacedStudents.map((st, idx) => (
                    <tr key={idx} className="hover:bg-gray-700/40 transition-colors">
                      <td className="p-3.5">
                        <strong className="text-white block">{st.studentName}</strong>
                        <span className="text-[11px] text-gray-400">{st.studentEmail}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-blue-950 text-blue-300 rounded border border-blue-800/60 font-bold">
                          {st.departmentCode}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-yellow-300">{st.cgpa}</td>
                      <td className="p-3.5 font-bold text-green-400">{st.companyName}</td>
                      <td className="p-3.5 text-gray-200">{st.jobTitle}</td>
                      <td className="p-3.5 text-gray-300">{st.salary}</td>
                      <td className="p-3.5 text-gray-400">{st.driveName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default DepartmentAnalytics;
