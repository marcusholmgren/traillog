import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SavedWaypoints from './saved_waypoints';
import { Waypoint } from '../services/db'; // Import Waypoint interface

// Mock the db service
const mockGetSavedWaypoints = vi.fn();
vi.mock('../services/db', () => ({
  getSavedWaypoints: mockGetSavedWaypoints,
}));

// Helper to render with router context
const renderWithRouter = (ui: React.ReactElement, { route = '/', initialEntries = ['/'] } = {}) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path={route} element={ui} />
        <Route path="/add-waypoint" element={<div>Add Waypoint Page</div>} />
        <Route path="/prev" element={<div>Previous Page Content</div>} /> {/* For back navigation test */}
      </Routes>
    </MemoryRouter>
  );
};

const mockWaypoints: Waypoint[] = [
  { id: 1, name: 'Point Alpha', latitude: 30, longitude: 40, createdAt: Date.now() - 2000 },
  { id: 2, name: 'Point Beta', latitude: 31, longitude: 41, createdAt: Date.now() - 1000 },
];

describe('SavedWaypoints Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading indicator initially', () => {
    mockGetSavedWaypoints.mockReturnValue(new Promise(() => {})); // Keep it pending
    renderWithRouter(<SavedWaypoints />, { route: '/saved', initialEntries: ['/saved'] });
    expect(screen.getByText(/loading waypoints.../i)).toBeInTheDocument();
  });

  it('displays waypoints when data is fetched successfully', async () => {
    mockGetSavedWaypoints.mockResolvedValue(mockWaypoints);
    renderWithRouter(<SavedWaypoints />, { route: '/saved', initialEntries: ['/saved'] });

    await waitFor(() => {
      expect(screen.getByText('Point Alpha')).toBeInTheDocument();
      expect(screen.getByText(/lat: 30.0000, lon: 40.0000/i)).toBeInTheDocument();
      expect(screen.getByText(new Date(mockWaypoints[0].createdAt).toLocaleString())).toBeInTheDocument();

      expect(screen.getByText('Point Beta')).toBeInTheDocument();
      expect(screen.getByText(/lat: 31.0000, lon: 41.0000/i)).toBeInTheDocument();
      expect(screen.getByText(new Date(mockWaypoints[1].createdAt).toLocaleString())).toBeInTheDocument();
    });
    expect(screen.queryByText(/loading waypoints.../i)).not.toBeInTheDocument();
  });

  it('displays "No waypoints saved yet." message when no waypoints exist', async () => {
    mockGetSavedWaypoints.mockResolvedValue([]);
    renderWithRouter(<SavedWaypoints />, { route: '/saved', initialEntries: ['/saved'] });

    await waitFor(() => {
      expect(screen.getByText(/no waypoints saved yet./i)).toBeInTheDocument();
    });
  });

  it('displays an error message if fetching waypoints fails', async () => {
    mockGetSavedWaypoints.mockRejectedValue(new Error('Failed to fetch'));
    renderWithRouter(<SavedWaypoints />, { route: '/saved', initialEntries: ['/saved'] });

    await waitFor(() => {
      expect(screen.getByText(/failed to load saved waypoints. please try again./i)).toBeInTheDocument();
    });
  });

  it('navigates to Add Waypoint page when "Plus" button is clicked', async () => {
    mockGetSavedWaypoints.mockResolvedValue([]); // Initial load doesn't matter for this test
    renderWithRouter(<SavedWaypoints />, { route: '/saved', initialEntries: ['/saved'] });

    // Wait for initial loading to complete if any
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const addButton = screen.getByTestId('add-new-waypoint-button');
    expect(addButton).toBeInTheDocument();

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add Waypoint Page')).toBeInTheDocument();
    });
  });

  it('navigates back when "ArrowLeft" icon is clicked', async () => {
    mockGetSavedWaypoints.mockResolvedValue([]);
    // Place '/saved' on top of '/prev' in history
    renderWithRouter(<SavedWaypoints />, { route: '/saved', initialEntries: ['/prev', '/saved'] });

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const backButton = screen.getByTestId('back-saved-waypoints-button');
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Previous Page Content')).toBeInTheDocument();
    });
  });
});
