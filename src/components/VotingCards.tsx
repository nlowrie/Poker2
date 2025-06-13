import React from 'react';
import { FIBONACCI_SEQUENCE, TSHIRT_SIZES, CARD_LABELS } from '../utils/planningPoker';

interface VotingCardsProps {
  onVote: (points: number | string) => void;
  selectedVote: number | string | null;
  disabled: boolean;
  estimationType: 'fibonacci' | 'tshirt';
}

export default function VotingCards({ onVote, selectedVote, disabled, estimationType }: VotingCardsProps) {
  const renderFibonacciCards = () => (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {FIBONACCI_SEQUENCE.map((points) => (
        <button
          key={points}
          onClick={() => !disabled && onVote(points)}
          disabled={disabled}
          className={`
            relative aspect-[3/4] rounded-xl border-2 transition-all duration-200 font-bold text-lg
            ${disabled 
              ? 'cursor-not-allowed opacity-50' 
              : 'cursor-pointer hover:scale-105 hover:shadow-lg'
            }
            ${selectedVote === points
              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg scale-105'
              : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
            }
          `}
        >
          <div className="absolute inset-2 rounded-lg flex items-center justify-center">
            {CARD_LABELS[points]}
          </div>
          {selectedVote === points && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          )}
        </button>
      ))}
    </div>
  );

  const renderTShirtCards = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {TSHIRT_SIZES.map((size) => (
        <button
          key={size}
          onClick={() => !disabled && onVote(size)}
          disabled={disabled}
          className={`
            relative aspect-[3/4] rounded-xl border-2 transition-all duration-200 font-bold text-lg
            ${disabled 
              ? 'cursor-not-allowed opacity-50' 
              : 'cursor-pointer hover:scale-105 hover:shadow-lg'
            }
            ${selectedVote === size
              ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg scale-105'
              : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
            }
          `}
        >
          <div className="absolute inset-2 rounded-lg flex items-center justify-center">
            {size}
          </div>
          {selectedVote === size && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Select Your Estimate</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          estimationType === 'fibonacci' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-purple-100 text-purple-800'
        }`}>
          {estimationType === 'fibonacci' ? 'Fibonacci' : 'T-Shirt Sizes'}
        </div>
      </div>
      
      {estimationType === 'fibonacci' ? renderFibonacciCards() : renderTShirtCards()}
      
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-500 mb-2">Special Cards</div>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => !disabled && onVote(-1)}
            disabled={disabled}
            className={`
              px-4 py-2 rounded-lg border-2 transition-all duration-200 font-medium text-sm
              ${disabled 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer hover:scale-105'
              }
              ${selectedVote === -1
                ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-yellow-300'
              }
            `}
          >
            ? (Need Info)
          </button>
          <button
            onClick={() => !disabled && onVote(-2)}
            disabled={disabled}
            className={`
              px-4 py-2 rounded-lg border-2 transition-all duration-200 font-medium text-sm
              ${disabled 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer hover:scale-105'
              }
              ${selectedVote === -2
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
              }
            `}
          >
            ∞ (Too Big)
          </button>
        </div>
      </div>
    </div>
  );
}