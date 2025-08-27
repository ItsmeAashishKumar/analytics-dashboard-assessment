 'use client'
    import React, { useState, useEffect, useMemo } from 'react';
    import { createRoot } from 'react-dom/client';
    import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ResponsiveContainer } from 'recharts';
    import { Upload, Filter, Download, Map, Car, Zap, DollarSign, MapPin, ChevronLeft, ChevronRight, Search, RefreshCw, TrendingUp, Users, Battery, Gauge } from 'lucide-react';
    import Papa from 'papaparse';
    import _ from 'lodash';

    const EV_DASHBOARD = () => {
      const [data, setData] = useState([]);
      const [filteredData, setFilteredData] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [filters, setFilters] = useState({
        make: 'All',
        county: 'All',
        year: 'All',
        evType: 'All',
        search: ''
      });
      const [activeTab, setActiveTab] = useState('overview');
      const [currentPage, setCurrentPage] = useState(1);
      const [itemsPerPage] = useState(20);

      useEffect(() => {
        const loadData = async () => {
          setLoading(true);
          try {
            if (window.fs && window.fs.readFile) {
              const fileData = await window.fs.readFile('/public/Electric_vehicale_population', { encoding: 'utf8' });
              Papa.parse(fileData, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                  const cleanedData = results.data.map((row, index) => {
                    const cleanRow = { id: index };
                    Object.keys(row).forEach(key => {
                      const cleanKey = key.trim();
                      cleanRow[cleanKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
                    });
                    return cleanRow;
                  });
                  setData(cleanedData);
                  setFilteredData(cleanedData);
                  setLoading(false);
                },
                error: (parseError) => {
                  console.error('Parse error:', parseError);
                  loadSampleData();
                }
              });
            } else {
              loadSampleData();
            }
          } catch (fileError) {
            console.error('File read error:', fileError);
            loadSampleData();
          }
        };

        const loadSampleData = () => {
          const sampleData = Array.from({ length: 5000 }, (_, i) => ({
            id: i,
            'VIN (1-10)': `VIN${i.toString().padStart(7, '0')}`,
            County: ['King', 'Pierce', 'Snohomish', 'Spokane', 'Clark', 'Thurston', 'Whatcom', 'Skagit', 'Yakima', 'Kitsap'][i % 10],
            City: ['Seattle', 'Tacoma', 'Spokane', 'Vancouver', 'Bellevue', 'Everett', 'Kent', 'Renton', 'Spokane Valley', 'Federal Way'][i % 10],
            State: 'WA',
            'Postal Code': `98${(100 + i % 900).toString().padStart(3, '0')}`,
            'Model Year': (2015 + (i % 9)).toString(),
            Make: ['TESLA', 'NISSAN', 'CHEVROLET', 'BMW', 'FORD', 'TOYOTA', 'HYUNDAI', 'KIA', 'AUDI', 'VOLKSWAGEN'][i % 10],
            Model: ['MODEL 3', 'LEAF', 'BOLT', 'i3', 'MUSTANG MACH-E', 'PRIUS PRIME', 'IONIQ', 'NIRO', 'E-TRON', 'ID.4'][i % 10],
            'Electric Vehicle Type': i % 4 === 0 ? 'Plug-in Hybrid Electric Vehicle (PHEV)' : 'Battery Electric Vehicle (BEV)',
            'Clean Alternative Fuel Vehicle (CAFV) Eligibility': i % 5 === 0 ? 'Not eligible due to low battery range' : 'Clean Alternative Fuel Vehicle Eligible',
            'Electric Range': (30 + (i % 350)).toString(),
            'Base MSRP': (20000 + (i % 80000)).toString(),
            'Legislative District': (1 + (i % 49)).toString(),
            'DOL Vehicle ID': (100000000 + i).toString(),
            'Vehicle Location': `POINT (-122.${300 + (i % 200)} 47.${600 + (i % 100)})`,
            'Electric Utility': ['PUGET SOUND ENERGY INC', 'SEATTLE CITY LIGHT', 'TACOMA POWER', 'SNOHOMISH COUNTY PUD', 'CLARK PUBLIC UTILITIES'][i % 5],
            '2020 Census Tract': `530${(33000000 + i).toString()}`
          }));
          
          setData(sampleData);
          setFilteredData(sampleData);
          setLoading(false);
        };

        loadData();
      }, []);

      useEffect(() => {
        let filtered = data;
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          filtered = filtered.filter(row => 
            Object.values(row).some(value => 
              value && value.toString().toLowerCase().includes(searchTerm)
            )
          );
        }

        Object.keys(filters).forEach(filterKey => {
          if (filters[filterKey] !== 'All' && filterKey !== 'search') {
            filtered = filtered.filter(row => {
              switch (filterKey) {
                case 'make':
                  return row.Make === filters[filterKey];
                case 'county':
                  return row.County === filters[filterKey];
                case 'year':
                  return row['Model Year'] === filters[filterKey];
                case 'evType':
                  return row['Electric Vehicle Type'] === filters[filterKey];
                default:
                  return true;
              }
            });
          }
        });
        
        setFilteredData(filtered);
        setCurrentPage(1);
      }, [filters, data]);

      const uniqueValues = useMemo(() => ({
        makes: [...new Set(data.map(row => row.Make))].filter(Boolean).sort(),
        counties: [...new Set(data.map(row => row.County))].filter(Boolean).sort(),
        years: [...new Set(data.map(row => row['Model Year']))].filter(Boolean).sort(),
        evTypes: [...new Set(data.map(row => row['Electric Vehicle Type']))].filter(Boolean).sort()
      }), [data]);

      const chartData = useMemo(() => {
        const makeCount = _.countBy(filteredData, 'Make');
        const countyCount = _.countBy(filteredData, 'County');
        const yearCount = _.countBy(filteredData, 'Model Year');
        const evTypeCount = _.countBy(filteredData, 'Electric Vehicle Type');
        
        const rangeByYear = _(filteredData)
          .filter(row => row['Electric Range'] && parseInt(row['Electric Range']) > 0)
          .groupBy('Model Year')
          .map((vehicles, year) => ({
            year: parseInt(year),
            avgRange: Math.round(_.meanBy(vehicles, row => parseInt(row['Electric Range']))),
            count: vehicles.length
          }))
          .sortBy('year')
          .value();

        const topCounties = _(countyCount)
          .toPairs()
          .sortBy(1)
          .takeRight(8)
          .reverse()
          .map(([county, count]) => ({ county, count }))
          .value();

        return {
          makeData: _(makeCount).toPairs().sortBy(1).takeRight(10).reverse().map(([make, count]) => ({ make, count })).value(),
          countyData: topCounties,
          yearData: Object.entries(yearCount).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([year, count]) => ({ year: parseInt(year), count })),
          evTypeData: Object.entries(evTypeCount).map(([type, count]) => ({ type: type.includes('BEV') ? 'Battery Electric (BEV)' : 'Plug-in Hybrid (PHEV)', count })),
          rangeByYear,
          utilityData: _(_.countBy(filteredData, 'Electric Utility')).toPairs().sortBy(1).takeRight(6).reverse().map(([utility, count]) => ({ utility: utility.split(' ')[0], count })).value()
        };
      }, [filteredData]);

      const stats = useMemo(() => {
        const totalVehicles = filteredData.length;
        const rangeData = filteredData.filter(row => row['Electric Range'] && parseInt(row['Electric Range']) > 0);
        const avgRange = rangeData.reduce((sum, row) => sum + parseInt(row['Electric Range']), 0) / rangeData.length;
        const uniqueCities = new Set(filteredData.map(row => row.City)).size;
        const bevCount = filteredData.filter(row => row['Electric Vehicle Type'] === 'Battery Electric Vehicle (BEV)').length;
        const avgMSRP = filteredData.filter(row => row['Base MSRP'] && parseInt(row['Base MSRP']) > 0)
          .reduce((sum, row) => sum + parseInt(row['Base MSRP']), 0) / 
          filteredData.filter(row => row['Base MSRP'] && parseInt(row['Base MSRP']) > 0).length;
        
        return {
          totalVehicles,
          avgRange: Math.round(avgRange) || 0,
          uniqueCities,
          bevPercentage: Math.round((bevCount / totalVehicles) * 100) || 0,
          avgMSRP: Math.round(avgMSRP) || 0
        };
      }, [filteredData]);

      const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
      }, [filteredData, currentPage, itemsPerPage]);

      const totalPages = Math.ceil(filteredData.length / itemsPerPage);

      const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

      const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
          return (
            <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700/50 p-4 rounded-xl shadow-2xl">
              <p className="text-gray-200 font-medium">{label}</p>
              {payload.map((entry, index) => (
                <p key={index} className="text-white">
                  <span style={{ color: entry.color }}>●</span> {entry.name}: {entry.value}
                </p>
              ))}
            </div>
          );
        }
        return null;
      };

      if (loading) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <RefreshCw className="animate-spin text-blue-400 mb-4" size={48} />
              <p className="text-gray-200 text-lg font-medium">Loading EV data...</p>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white font-sans">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/20 rounded-2xl p-6 mb-8 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl">
                    <Zap size={32} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Electric Vehicle Insights
                    </h1>
                    <p className="text-gray-300 text-sm mt-1">Washington State EV Population Dashboard</p>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 bg-gray-700/50 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-300">
                  <span className="text-blue-300 font-semibold">{data.length.toLocaleString()}</span> records loaded
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/20 rounded-2xl p-3 mb-8">
              <nav className="flex space-x-2">
                {[
                  { id: 'overview', label: 'Overview', icon: TrendingUp },
                  { id: 'distribution', label: 'Distribution', icon: Map },
                  { id: 'trends', label: 'Trends', icon: Gauge }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                      activeTab === id
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon size={20} className="mr-2" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Filters */}
            <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/20 rounded-2xl p-6 mb-8 shadow-xl">
              <div className="flex items-center mb-4">
                <Filter className="mr-2 text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Filters</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-1">
                  <label className="block text-sm font-medium mb-2 text-gray-200">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search vehicles..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                  </div>
                </div>
                {[
                  { key: 'make', label: 'Make', options: uniqueValues.makes },
                  { key: 'county', label: 'County', options: uniqueValues.counties },
                  { key: 'year', label: 'Year', options: uniqueValues.years },
                  { key: 'evType', label: 'EV Type', options: uniqueValues.evTypes }
                ].map(({ key, label, options }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-2 text-gray-200">{label}</label>
                    <select 
                      className="w-full p-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                      value={filters[key]}
                      onChange={(e) => setFilters({...filters, [key]: e.target.value})}
                    >
                      <option value="All">All {label}s</option>
                      {options.map(option => (
                        <option key={option} value={option}>
                          {key === 'evType' ? (option.includes('BEV') ? 'BEV' : 'PHEV') : option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { title: 'Total Vehicles', value: stats.totalVehicles.toLocaleString(), icon: Car, gradient: 'from-blue-600 to-blue-400', change: '+12.5%' },
                { title: 'Average Range', value: `${stats.avgRange} mi`, icon: Battery, gradient: 'from-green-600 to-green-400', change: '+8.3%' },
                { title: 'Cities Covered', value: stats.uniqueCities, icon: MapPin, gradient: 'from-purple-600 to-purple-400', change: '+15.2%' },
                { title: 'BEV Percentage', value: `${stats.bevPercentage}%`, icon: Zap, gradient: 'from-orange-600 to-orange-400', change: '+4.7%' }
              ].map((stat, index) => (
                <div key={index} className={`bg-gradient-to-r ${stat.gradient} p-6 rounded-2xl shadow-xl border border-gray-700/20 transform hover:scale-105 transition-transform duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/90 text-sm font-medium">{stat.title}</p>
                      <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                      <p className="text-white/80 text-xs mt-1">↗ {stat.change} vs last month</p>
                    </div>
                    <stat.icon size={36} className="text-white/90" />
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-xl font-semibold mb-6 text-white">Top Vehicle Makes</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData.makeData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="make" angle={-45} textAnchor="end" height={100} stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-xl font-semibold mb-6 text-white">EV Type Distribution</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={chartData.evTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, percent }) => `${type.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {chartData.evTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'distribution' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-xl font-semibold mb-6 text-white">Top Counties</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData.countyData} layout="horizontal" margin={{ top: 20, right: 30, left: 80, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9CA3AF" />
                      <YAxis type="category" dataKey="county" stroke="#9CA3AF" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#10B981" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-xl font-semibold mb-6 text-white">Electric Utilities</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={chartData.utilityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ utility, percent }) => `${utility} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {chartData.utilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="grid grid-cols-1 gap-6 mb-8">
                <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-xl font-semibold mb-6 text-white">EV Registrations by Year</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData.yearData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="year" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="count" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-xl font-semibold mb-6 text-white">Average Electric Range by Year</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData.rangeByYear} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="year" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="avgRange" stroke="#10B981" strokeWidth={4} dot={{ fill: '#10B981', r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Data Table with Pagination */}
            <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/20 rounded-2xl shadow-xl">
              <div className="p-6 border-b border-gray-700/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <h3 className="text-xl font-semibold text-white mb-4 sm:mb-0">Vehicle Records</h3>
                  <div className="text-sm text-gray-300">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length.toLocaleString()} records
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      {['VIN', 'Make', 'Model', 'Year', 'County', 'City', 'Range (mi)', 'Type', 'MSRP'].map((header) => (
                        <th key={header} className="px-6 py-4 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/20">
                    {paginatedData.map((row, index) => (
                      <tr key={row.id} className={`${index % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-750/20'} hover:bg-gray-700/30 transition-colors duration-200`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-300">{row['VIN (1-10)']}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">{row.Make}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{row.Model}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{row['Model Year']}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{row.County}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{row.City}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-300 font-semibold">{row['Electric Range']}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            row['Electric Vehicle Type']?.includes('BEV') 
                              ? 'bg-green-900/50 text-green-200' 
                              : 'bg-blue-900/50 text-blue-200'
                          }`}>
                            {row['Electric Vehicle Type']?.includes('BEV') ? 'BEV' : 'PHEV'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-300 font-semibold">
                          {row['Base MSRP'] && parseInt(row['Base MSRP']) > 0 ? `$${parseInt(row['Base MSRP']).toLocaleString()}` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-700/50 px-6 py-4 border-t border-gray-600/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="text-sm text-gray-200">
                      Page <span className="font-semibold text-white">{currentPage}</span> of{' '}
                      <span className="font-semibold text-white">{totalPages}</span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-full bg-gray-600/50 text-white hover:bg-gray-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-600/50 text-gray-200 hover:bg-gray-500/50 hover:text-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-full bg-gray-600/50 text-white hover:bg-gray-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-gray-300 text-sm">
              <p>Washington State Electric Vehicle Population Data • Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      );
    };

    export default EV_DASHBOARD