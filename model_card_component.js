// frontend/src/components/ModelCard.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { modelsAPI } from '../utils/api';
import { 
  HeartIcon, 
  ExternalLinkIcon, 
  PrinterIcon, 
  DownloadIcon,
  ClockIcon,
  UserIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

const ModelCard = ({ model }) => {
  const [isLiking, setIsLiking] = useState(false);
  const queryClient = useQueryClient();

  const toggleFavoriteMutation = useMutation(
    () => modelsAPI.toggleFavorite(model.id),
    {
      onMutate: async () => {
        setIsLiking(true);
        
        // Optimistic update
        await queryClient.cancelQueries(['models']);
        
        const previousData = queryClient.getQueryData(['models']);
        
        if (previousData) {
          queryClient.setQueryData(['models'], {
            ...previousData,
            data: {
              ...previousData.data,
              models: previousData.data.models.map(m => 
                m.id === model.id 
                  ? { 
                      ...m, 
                      isFavorited: !m.isFavorited,
                      favoritesCount: m.isFavorited 
                        ? m.favoritesCount - 1 
                        : m.favoritesCount + 1
                    }
                  : m
              )
            }
          });
        }
        
        return { previousData };
      },
      onSuccess: (response) => {
        toast.success(response.data.message);
      },
      onError: (error, variables, context) => {
        // Revert optimistic update
        if (context?.previousData) {
          queryClient.setQueryData(['models'], context.previousData);
        }
        toast.error(error.response?.data?.error || 'Failed to update favorite');
      },
      onSettled: () => {
        setIsLiking(false);
        queryClient.invalidateQueries(['models']);
        queryClient.invalidateQueries(['favorites']);
      }
    }
  );

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteMutation.mutate();
  };

  const handleExternalLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(model.sourceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <Link to={`/models/${model.id}`} className="block">
        {/* Image */}
        <div className="aspect-w-16 aspect-h-12 bg-gray-200">
          <img
            src={model.imageUrl}
            alt={model.title}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {model.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {model.description}
          </p>

          {/* Author */}
          {model.authorName && (
            <div className="flex items-center mb-3">
              <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-500">by {model.authorName}</span>
            </div>
          )}

          {/* Tags */}
          {model.tags && model.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {model.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
              {model.tags.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  +{model.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <div className="flex items-center space-x-3">
              {model.complexity && (
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1 ${
                    model.complexity === 'Beginner' ? 'bg-green-400' :
                    model.complexity === 'Intermediate' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`} />
                  <span>{model.complexity}</span>
                </div>
              )}
              
              {model.printTime && (
                <div className="flex items-center">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  <span>{model.printTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <HeartIcon className="h-4 w-4 mr-1" />
                <span>{model.favoritesCount || 0}</span>
              </div>
              
              <div className="flex items-center">
                <PrinterIcon className="h-4 w-4 mr-1" />
                <span>{model.printRequestsCount || 0}</span>
              </div>
              
              <div className="flex items-center">
                <DownloadIcon className="h-4 w-4 mr-1" />
                <span>{model.downloadCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <button
          onClick={handleToggleFavorite}
          disabled={isLiking}
          className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            model.isFavorited
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <HeartIcon className={`h-4 w-4 ${model.isFavorited ? 'fill-current' : ''}`} />
          <span>{model.isFavorited ? 'Favorited' : 'Favorite'}</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExternalLink}
            className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="View on Thingiverse"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            <span>Source</span>
          </button>

          <Link
            to={`/models/${model.id}`}
            className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <PrinterIcon className="h-4 w-4" />
            <span>Print</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ModelCard;