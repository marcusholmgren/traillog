// traillog/app/test-setup-mocks.ts
/**
 * This file provides centralized mocks for commonly used modules in tests
 * It's designed to be imported at the top of test files before any other imports
 */

import { vi } from 'vitest';
import { beforeEach } from 'vitest';

// Mock Leaflet and related dependencies
vi.mock('leaflet', () => {
  return {
    __esModule: true,
    default: {
      map: vi.fn().mockReturnValue({ setView: vi.fn(), on: vi.fn(), remove: vi.fn() }),
      tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      marker: vi.fn().mockReturnValue({
        addTo: vi.fn(),
        bindPopup: vi.fn().mockReturnThis(),
        openPopup: vi.fn(),
      }),
      popup: vi.fn(),
      icon: vi.fn(),
      Icon: {
        Default: {
          prototype: {
            options: {},
            _getIconUrl: undefined,
          },
          mergeOptions: vi.fn(),
        }
      }
    }
  };
});

// Mock react-leaflet components
vi.mock('react-leaflet', () => {
  return {
    __esModule: true,
    MapContainer: ({ children }: { children: React.ReactNode }) => {
      return { type: 'div', props: { 'data-testid': 'map-container', children } };
    },
    TileLayer: () => ({ type: 'div', props: { 'data-testid': 'tile-layer' } }),
    Marker: ({ children }: { children?: React.ReactNode }) => {
      return { type: 'div', props: { 'data-testid': 'marker', children } };
    },
    Popup: ({ children }: { children: React.ReactNode }) => {
      return { type: 'div', props: { 'data-testid': 'popup', children } };
    },
    useMap: vi.fn(),
  };
});

// Mock CSS imports
vi.mock('../leaflet-styles.css', () => ({}));
vi.mock('../app.css', () => ({}));

// Setup mock functions that can be imported and used in individual test files
export const mockGetSavedWaypoints = vi.fn();
export const mockAddWaypoint = vi.fn();

// Mock database service
vi.mock('../services/db', () => {
  return {
    getSavedWaypoints: mockGetSavedWaypoints,
    addWaypoint: mockAddWaypoint,
    // Export any types that might be imported directly
    type: {
      Waypoint: {}
    }
  };
});

// Setup global browser APIs for tests
beforeEach(() => {
  // Setup navigator
  if (typeof global.navigator === 'undefined') {
    global.navigator = {} as any;
  }

  // Setup window
  if (typeof global.window === 'undefined') {
    global.window = { 
      document: {} 
    } as any;
  }
  
  // Reset mock implementations
  mockGetSavedWaypoints.mockReset();
  mockAddWaypoint.mockReset();
});

// Export mock geolocation APIs that tests can customize
export const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn()
};

// Setup geolocation API
export const setupMockGeolocation = () => {
  const originalGeolocation = global.navigator.geolocation;
  
  global.navigator.geolocation = {
    ...mockGeolocation
  } as any;
  
  return originalGeolocation;
};