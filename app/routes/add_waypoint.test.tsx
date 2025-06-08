import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom'; // For routing context
import AddWaypoint from './add_waypoint';

// Mock the db service
const mockAddWaypoint = vi.fn();
vi.mock('../services/db', () => ({
  addWaypoint: mockAddWaypoint,
}));

// Mock navigator.geolocation
const mockGetCurrentPosition = vi.fn();
global.navigator.geolocation = {
  ...global.navigator.geolocation,
  getCurrentPosition: mockGetCurrentPosition,
};

// Helper to render with router context
const renderWithRouter = (ui: React.ReactElement, { route = '/', initialEntries = ['/'] } = {}) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path={route} element={ui} />
        {/* You can add other routes here if navigation is tested */}
        <Route path="/prev" element={<div>Previous Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};


describe('AddWaypoint Component', ()_ => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test
    // Reset mock implementations if they were changed in a test
    mockAddWaypoint.mockResolvedValue(undefined); // Default success for addWaypoint
    mockGetCurrentPosition.mockImplementation((successCallback) => { // Default success for geolocation
      successCallback({
        coords: {
          latitude: 34.0522,
          longitude: -118.2437,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    });
  });

  it('fetches and displays current GPS location on mount', async () => {
    renderWithRouter(<AddWaypoint />, { route: '/add-waypoint', initialEntries: ['/add-waypoint'] });

    await waitFor(() => {
      const coordsInput = screen.getByLabelText(/coordinates/i) as HTMLInputElement;
      expect(coordsInput.value).toBe('34.052200, -118.243700');
      expect(coordsInput.readOnly).toBe(true);
    });
  });

  it('displays an error message if GPS location fetching fails', async () => {
    mockGetCurrentPosition.mockImplementation((successCallback, errorCallback) => {
      errorCallback(new Error('User denied Geolocation'));
    });

    renderWithRouter(<AddWaypoint />, { route: '/add-waypoint', initialEntries: ['/add-waypoint'] });

    await waitFor(() => {
      expect(screen.getByText(/error getting location: user denied geolocation/i)).toBeInTheDocument();
    });
    const coordsInput = screen.getByLabelText(/coordinates/i) as HTMLInputElement;
    expect(coordsInput.value).toBe('Loading coordinates...'); // Or whatever the initial value is
  });

  it('handles geolocation not being supported', async () => {
    const originalGeolocation = global.navigator.geolocation;
    // @ts-ignore
    delete global.navigator.geolocation; // Simulate geolocation not being supported

    renderWithRouter(<AddWaypoint />, { route: '/add-waypoint', initialEntries: ['/add-waypoint'] });

    await waitFor(() => {
      expect(screen.getByText('Geolocation is not supported by this browser.')).toBeInTheDocument();
    });
    global.navigator.geolocation = originalGeolocation; // Restore
  });


  it('allows typing a name for the waypoint', () => {
    renderWithRouter(<AddWaypoint />, { route: '/add-waypoint', initialEntries: ['/add-waypoint'] });
    const nameInput = screen.getByPlaceholderText(/waypoint name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My Test Waypoint' } });
    expect(nameInput.value).toBe('My Test Waypoint');
  });

  it('submits the form with correct data and shows success message', async () => {
    renderWithRouter(<AddWaypoint />, { route: '/add-waypoint', initialEntries: ['/add-waypoint'] });

    // Wait for GPS
    await waitFor(() => {
      expect((screen.getByLabelText(/coordinates/i) as HTMLInputElement).value).not.toBe('Loading coordinates...');
    });

    const nameInput = screen.getByPlaceholderText(/waypoint name/i);
    fireEvent.change(nameInput, { target: { value: 'Beach View' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAddWaypoint).toHaveBeenCalledTimes(1);
      expect(mockAddWaypoint).toHaveBeenCalledWith({
        name: 'Beach View',
        latitude: 34.0522, // From mocked geolocation
        longitude: -118.2437,
      });
      expect(screen.getByText('Waypoint saved successfully!')).toBeInTheDocument();
    });

    // Check if name input is cleared
    expect((nameInput as HTMLInputElement).value).toBe('');
  });

  it('shows an error message if name is missing on submit', async () => {
    renderWithRouter(<AddWaypoint />, { route: '/add-waypoint', initialEntries: ['/add-waypoint'] });
    await waitFor(() => { // Ensure GPS is loaded first
      expect((screen.getByLabelText(/coordinates/i) as HTMLInputElement).value).not.toBe('Loading coordinates...');
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Waypoint name is required.')).toBeInTheDocument();
    });
    expect(mockAddWaypoint).not.toHaveBeenCalled();
  });

  it('shows an error if coordinates are missing (e.g., GPS failed and user tries to save)', async () => {
    mockGetCurrentPosition.mockImplementation((successCallback, errorCallback) => {
      errorCallback(new Error('GPS unavailable'));
    });
    renderWithRouter(<AddWaypoint />, { route: '/add-waypoint', initialEntries: ['/add-waypoint'] });

    await waitFor(() => {
        expect(screen.getByText(/error getting location: gps unavailable/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/waypoint name/i);
    fireEvent.change(nameInput, { target: { value: 'Test without GPS' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/coordinates are required/i)).toBeInTheDocument();
    });
    expect(mockAddWaypoint).not.toHaveBeenCalled();
  });


  it('shows an error message if saving to DB fails', async () => {
    mockAddWaypoint.mockRejectedValueOnce(new Error('DB save failed'));
    renderWithRouter(<AddWaypoint />, { route: '/add-waypoint', initialEntries: ['/add-waypoint'] });
    await waitFor(() => { // GPS
      expect((screen.getByLabelText(/coordinates/i) as HTMLInputElement).value).not.toBe('Loading coordinates...');
    });

    const nameInput = screen.getByPlaceholderText(/waypoint name/i);
    fireEvent.change(nameInput, { target: { value: 'Another Point' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save waypoint. Please try again.')).toBeInTheDocument();
    });
  });

  it('navigates back when Cancel button is clicked', async () => {
    // For this test, MemoryRouter needs a route it can navigate "back" to.
    // Let's assume initialEntries places '/add-waypoint' on top of '/prev'.
    renderWithRouter(<AddWaypoint />, { route: '/add-waypoint', initialEntries: ['/prev', '/add-waypoint'] });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Check if navigation occurred (e.g., by seeing content from the '/prev' route)
    await waitFor(() => {
      expect(screen.getByText('Previous Page')).toBeInTheDocument(); // Assuming '/prev' shows this
    });
  });

   it('navigates back when X icon is clicked', async () => {
    renderWithRouter(<AddWaypoint />, { route: '/add-waypoint', initialEntries: ['/prev', '/add-waypoint'] });

    // The X icon is an SVG inside a div. Let's find the div by its data-icon attribute or a test-id if available.
    // Assuming the div has `data-icon="X"` and is clickable.
    // A more robust way would be to add a test-id to the clickable element.
    // For now, we assume it's the element with the SVG path.
    const xButton = screen.getByRole('button', { name: /new waypoint/i }) // This is the heading, not the button
                        .parentElement?.querySelector('[data-icon="X"]');
    // This selector is fragile. Better: add aria-label="Close" or test-id to the clickable div.
    // Let's assume the div itself is what we are looking for.
    // If the div containing the SVG is the actual clickable element:
    const xButtonClickable = screen.getByTestId('close-add-waypoint-button'); // if you add a test-id

    // A simpler approach: find the SVG by its path content if it's unique enough or get parent.
    // This is not ideal. The best would be an aria-label or test-id on the clickable div.
    // Let's assume the parent div of the SVG is the clickable element.
    // const svgElement = document.querySelector('svg path[d^="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31"]');
    // expect(svgElement).toBeInTheDocument();
    // const clickableXIcon = svgElement!.closest('div[data-icon="X"]'); // Find closest div with data-icon

    expect(xButtonClickable).toBeInTheDocument();
    fireEvent.click(xButtonClickable!);

    await waitFor(() => {
      expect(screen.getByText('Previous Page')).toBeInTheDocument();
    });
  });

});
