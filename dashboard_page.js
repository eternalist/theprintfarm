// frontend/src/pages/DashboardPage.jsx

import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { modelsAPI, printRequestsAPI } from '../utils/api';
import { 
  SearchIcon, 
  FilterIcon, 
  HeartIcon, 
  ExternalLinkIcon,
  PrinterIcon,
  ClockIcon,
  UserIcon,
  TrendingUpIcon
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ModelCard from '../components/ModelCard';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch models with search and filters
  const { data: modelsData, isLoading: modelsLoading, error: modelsError } = useQuery(
    ['models', searchTerm, selectedComplexity, selectedTags, sortBy, sortOrder],
    () => modelsAPI.getModels({
      search: searchTerm,
      complexity: selectedComplexity,
      tags: selectedTags.join(','),
      sortBy,
      sortOrder,
      limit: 12
    }),
    {
      keepPreviousData: true
    }
  );

  // Fetch popular models
  const { data: popularData } = useQuery(
    'popularModels',
    () => modelsAPI.getPopular({ limit: 6 })
  );

  // Fetch recent models
  const { data: recentData } = useQuery(
    'recentModels',
    () => modelsAPI.getRecent({ limit: 6 })
  );

  // Fetch user's print requests
  const { data: printRequestsData } = useQuery(
    'printRequests',
    () => printRequestsAPI.getRequests({ limit: 5 })
  );

  // Fetch print request stats
  const { data: statsData } = useQuery(
    'printStats',
    () => printRequestsAPI.getStats()
  );

  // Fetch available tags
  const { data: tagsData } = useQuery(
    'tags',
    () => modelsAPI.getTags()
  );

  const models = modelsData?.data?.models || [];
  const popularModels = popularData?.data || [];
  const recentModels = recentData?.data || [];
  const printRequests = printRequestsData?.data?.requests || [];
  const stats = statsData?.data || {};
  const availableTags = tagsData?.data || [];

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedComplexity('');
    setSelectedTags([]);
  };

  if (modelsError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading models. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
        <p className="mt-2 text-primary-100">
          Discover amazing 3D models and connect with talented makers
        </p>
      </div>

      {/* Stats Overview */}
      {Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PrinterIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {(stats.accepted || 0) + (stats.printing || 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-success-100 rounded-full flex items-center justify-center">
                  <span className="text-success-600 font-bold">✓</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completed || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HeartIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Favorites</p>
                <p className="text-2xl font-semibold text-gray-900">
                  <Link to="/favorites" className="hover:text-primary-600">
                    View All →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Print Requests */}
      {printRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Print Requests</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {printRequests.map((request) => (
              <div key={request.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={request.model.imageUrl}
                    alt={request.model.title}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{request.model.title}</h4>
                    <p className="text-sm text-gray-500">
                      Maker: {request.maker.name} • {request.material} • Qty: {request.quantity}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    request.status === 'COMPLETED' ? 'bg-success-100 text-success-800' :
                    request.status === 'PRINTING' ? 'bg-primary-100 text-primary-800' :
                    request.status === 'ACCEPTED' ? 'bg-warning-100 text-warning-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Access - Popular & Recent Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Popular Models */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUpIcon className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-medium text-gray-900">Popular Models</h3>
            </div>
            <Link to="/dashboard" className="text-sm text-primary-600 hover:text-primary-500">
              View all
            </Link>
          </div>
          <div className="p-6">
            {popularModels.length > 0 ? (
              <div className="space-y-4">
                {popularModels.slice(0, 3).map((model) => (
                  <Link
                    key={model.id}
                    to={`/models/${model.id}`}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <img
                      src={model.imageUrl}
                      alt={model.title}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {model.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {model.likeCount} likes • {model.downloadCount} downloads
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No popular models available</p>
            )}
          </div>
        </div>

        {/* Recent Models */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-success-600" />
              <h3 className="text-lg font-medium text-gray-900">Recently Added</h3>
            </div>
            <Link to="/dashboard" className="text-sm text-primary-600 hover:text-primary-500">
              View all
            </Link>
          </div>
          <div className="p-6">
            {recentModels.length > 0 ? (
              <div className="space-y-4">
                {recentModels.slice(0, 3).map((model) => (
                  <Link
                    key={model.id}
                    to={`/models/${model.id}`}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <img
                      src={model.imageUrl}
                      alt={model.title}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {model.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        Added {new Date(model.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No recent models available</p>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedComplexity}
              onChange={(e) => setSelectedComplexity(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Complexities</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="title-asc">Name A-Z</option>
              <option value="title-desc">Name Z-A</option>
              <option value="likeCount-desc">Most Liked</option>
              <option value="downloadCount-desc">Most Downloaded</option>
            </select>
            
            {(searchTerm || selectedComplexity || selectedTags.length > 0) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Tag filters */}
        {availableTags.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {availableTags.slice(0, 12).map((tagData) => (
                <button
                  key={tagData.tag}
                  onClick={() => handleTagToggle(tagData.tag)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    selectedTags.includes(tagData.tag)
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tagData.tag} ({tagData.count})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Models Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse Models</h2>
        
        {modelsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : models.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {models.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <PrinterIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No models found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;