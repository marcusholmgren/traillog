import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddWaypoint from './add_waypoint'; // Adjust path if necessary
import { vi } from 'vitest';

// --- Mocks ---
// Mock react-router
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock db services
const mockAddWaypoint = vi.fn();
vi.mock('../services/db', () => ({
  addWaypoint: mockAddWaypoint,
}));

// Mock Geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(), // Required by type, though not used in component
  clearWatch: vi.fn(),   // Required by type
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock MediaDevices and ImageCapture
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    ...global.navigator.mediaDevices,
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

const mockStream = { getTracks: () => [{ stop: vi.fn() }], getVideoTracks: () => [{}] } as unknown as MediaStream;
const mockTakePhoto = vi.fn();
const mockImageCapture = vi.fn(() => ({
  takePhoto: mockTakePhoto,
}));
global.ImageCapture = mockImageCapture;

// Mock FileReader
let fileReaderInstance: { onloadend: () => void; result: string | ArrayBuffer | null; readAsDataURL: (blob: Blob) => void; onerror: () => void };
global.FileReader = vi.fn(() => {
  fileReaderInstance = {
    onloadend: vi.fn(),
    result: 'data:image/png;base64,mocked_file_reader_data',
    readAsDataURL: vi.fn().mockImplementation(function(this: any, blob: Blob) {
      // 'this' refers to the FileReader instance
      if (this.onloadend) {
        act(() => { // Ensure state updates tied to onloadend are wrapped in act
             this.onloadend();
        });
      }
    }),
    onerror: vi.fn(),
  };
  return fileReaderInstance;
}) as any;


// --- Test Suite ---
describe('AddWaypoint Component', () => {
  const mockLatitude = 34.0522;
  const mockLongitude = -118.2437;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((successCallback) => {
      successCallback({
        coords: {
          latitude: mockLatitude,
          longitude: mockLongitude,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    });
    // Default successful addWaypoint
    mockAddWaypoint.mockResolvedValue(123); // Simulate successful save returning a new ID
  });

  test('renders initial state correctly and displays coordinates', async () => {
    render(<AddWaypoint />);
    expect(screen.getByPlaceholderText('Waypoint Name')).toBeInTheDocument();
    expect(screen.getByText('Open Camera')).toBeInTheDocument();
    expect(screen.getByText('Choose from File')).toBeInTheDocument();
    expect(screen.getByText('Image preview will appear here.')).toBeInTheDocument();

    // Check for coordinates (might need waitFor due to async nature of geolocation)
    await waitFor(() => {
      expect(screen.getByDisplayValue(`${mockLatitude.toFixed(6)}, ${mockLongitude.toFixed(6)}`)).toBeInTheDocument();
    });
  });

  describe('Image Capture via "Open Camera" (MediaStream API)', () => {
    test('successfully captures image, updates preview, and closes modal', async () => {
      mockGetUserMedia.mockResolvedValue(mockStream); // Camera access granted
      const mockBlob = new Blob(['mockImageData'], { type: 'image/png' });
      mockTakePhoto.mockResolvedValue(mockBlob);

      render(<AddWaypoint />);
      await userEvent.click(screen.getByText('Open Camera'));

      await waitFor(() => expect(screen.getByText('Take Photo')).toBeInTheDocument()); // Modal open

      await userEvent.click(screen.getByText('Take Photo'));

      await waitFor(() => {
        expect(mockImageCapture).toHaveBeenCalledWith(mockStream.getVideoTracks()[0]);
        expect(mockTakePhoto).toHaveBeenCalled();
        // FileReader's readAsDataURL is called internally by the component after takePhoto
        // The mock FileReader will then call its own onloadend.
        // We need to ensure the image preview is updated.
        const imgElement = screen.getByAltText('Captured waypoint') as HTMLImageElement;
        expect(imgElement.src).toBe(fileReaderInstance.result); // Check if FileReader result is used
      });
      expect(screen.queryByText('Take Photo')).not.toBeInTheDocument(); // Modal closed
      expect(screen.queryByText(/Image captured!/)).toBeInTheDocument();
    });

    test('handles camera access denied', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
      render(<AddWaypoint />);
      await userEvent.click(screen.getByText('Open Camera'));

      await waitFor(() => {
        expect(screen.getByText(/Camera access denied or not available: Permission denied/)).toBeInTheDocument();
      });
      expect(screen.queryByAltText('Captured waypoint')).not.toBeInTheDocument();
    });
  });

  describe('Image Selection via "Choose from File"', () => {
    test('successfully selects image and updates preview', async () => {
      render(<AddWaypoint />);
      const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });

      // Mock the input creation and click, then simulate file selection
      const fileInput = screen.getByText('Choose from File'); // Button that triggers input.click()

      // The actual input is created dynamically, so we need to listen for it.
      // This is tricky to test perfectly without exposing the input.
      // We rely on the fact that clicking the button calls input.click(),
      // and then we can simulate the 'change' event on a conceptual input.
      // For a more robust test, the input could be less dynamic or use a ref.

      // Simulate user choosing a file after clicking "Choose from File"
      // This part assumes the dynamic input is created and 'change' event is handled.
      // We directly call the file reading logic part that is inside the input's onchange
      // by triggering the FileReader mock.

      await userEvent.click(fileInput);
      // At this point, an <input type="file"> was programmatically clicked.
      // We can't directly interact with it via testing-library if it's not in the DOM permanently.
      // However, our FileReader mock will be used by the component's logic.
      // We simulate the file being read by directly invoking the mocked `readAsDataURL`
      // which in turn will call `onloadend`.

      // To simulate the file being selected and read:
      act(() => {
        fileReaderInstance.readAsDataURL(file); // This will trigger the mocked onloadend
      });

      await waitFor(() => {
        const imgElement = screen.getByAltText('Captured waypoint') as HTMLImageElement;
        expect(imgElement.src).toBe(fileReaderInstance.result);
      });
      expect(screen.queryByText(/Image selected./)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('submits with image data', async () => {
      render(<AddWaypoint />);
      // Capture an image first (simplified version of above test)
      mockGetUserMedia.mockResolvedValue(mockStream);
      mockTakePhoto.mockResolvedValue(new Blob(['mock'], { type: 'image/png' }));
      await userEvent.click(screen.getByText('Open Camera'));
      await waitFor(() => screen.getByText('Take Photo'));
      await userEvent.click(screen.getByText('Take Photo'));
      await waitFor(() => expect(screen.getByAltText('Captured waypoint')).toBeInTheDocument());

      await userEvent.type(screen.getByPlaceholderText('Waypoint Name'), 'Test WP with Image');
      await userEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockAddWaypoint).toHaveBeenCalledWith({
          name: 'Test WP with Image',
          latitude: mockLatitude,
          longitude: mockLongitude,
          notes: "", // Assuming notes is empty if not filled
          imageDataUrl: fileReaderInstance.result, // mocked_file_reader_data
        });
      });
      expect(screen.getByText('Waypoint saved successfully!')).toBeInTheDocument();
      // Check form reset (image preview should be gone)
      expect(screen.queryByAltText('Captured waypoint')).not.toBeInTheDocument();
      expect(screen.getByText('Image preview will appear here.')).toBeInTheDocument();
    });

    test('submits without image data', async () => {
      render(<AddWaypoint />);
      await userEvent.type(screen.getByPlaceholderText('Waypoint Name'), 'Test WP No Image');
      await userEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockAddWaypoint).toHaveBeenCalledWith({
          name: 'Test WP No Image',
          latitude: mockLatitude,
          longitude: mockLongitude,
          notes: "",
          imageDataUrl: null, // Or undefined, depending on implementation
        });
      });
      expect(screen.getByText('Waypoint saved successfully!')).toBeInTheDocument();
    });

    test('handles save error from addWaypoint', async () => {
      mockAddWaypoint.mockRejectedValue(new Error('DB save failed'));
      render(<AddWaypoint />);
      await userEvent.type(screen.getByPlaceholderText('Waypoint Name'), 'Error Case WP');
      await userEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByText('Failed to save waypoint. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Input Validations', () => {
    test('shows error if name is missing on submit', async () => {
      render(<AddWaypoint />);
      await userEvent.click(screen.getByText('Save'));

      expect(screen.getByText('Waypoint name is required.')).toBeInTheDocument();
      expect(mockAddWaypoint).not.toHaveBeenCalled();
    });

    test('shows error if coordinates are missing (geolocation failed)', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, errorCallback) => {
         if (errorCallback) {
            errorCallback(new GeolocationPositionError());
         }
      });
      render(<AddWaypoint />);
       await userEvent.type(screen.getByPlaceholderText('Waypoint Name'), 'Test WP');
      await userEvent.click(screen.getByText('Save'));

      await waitFor(() => {
          expect(screen.getByText(/Coordinates are required./i)).toBeInTheDocument();
      });
      expect(mockAddWaypoint).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Button', () => {
    test('navigates back when cancel (X) icon is clicked', async () => {
      render(<AddWaypoint />);
      await userEvent.click(screen.getByTestId('close-add-waypoint-button'));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    test('stops camera and navigates back if camera is active', async () => {
      mockGetUserMedia.mockResolvedValue(mockStream);
      render(<AddWaypoint />);
      await userEvent.click(screen.getByText('Open Camera'));
      await waitFor(() => screen.getByText('Take Photo')); // Wait for camera modal

      // Click the main cancel button (X icon) while camera is active
      await userEvent.click(screen.getByTestId('close-add-waypoint-button'));

      // Check if stream track stop was called
      const trackMock = mockStream.getTracks()[0];
      expect(trackMock.stop).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
      expect(screen.queryByText('Take Photo')).not.toBeInTheDocument(); // Modal should be closed
    });

     test('Cancel button in camera modal closes modal and stops stream', async () => {
        mockGetUserMedia.mockResolvedValue(mockStream);
        render(<AddWaypoint />);
        await userEvent.click(screen.getByText('Open Camera'));
        await waitFor(() => expect(screen.getByText('Take Photo')).toBeInTheDocument()); // Modal open

        await userEvent.click(screen.getByText('Cancel')); // The cancel button in the camera modal

        expect(screen.queryByText('Take Photo')).not.toBeInTheDocument(); // Modal closed
        const trackMock = mockStream.getTracks()[0];
        expect(trackMock.stop).toHaveBeenCalled();
        // Ensure no navigation happened for this cancel
        expect(mockNavigate).not.toHaveBeenCalledWith(-1);
    });
  });
});

// Helper for GeolocationPositionError if not available in test env
class GeolocationPositionError extends Error {
  static PERMISSION_DENIED = 1;
  static POSITION_UNAVAILABLE = 2;
  static TIMEOUT = 3;
  code: number;
  constructor(message = "Geolocation error", code = GeolocationPositionError.PERMISSION_DENIED) {
    super(message);
    this.name = "GeolocationPositionError";
    this.code = code;
  }
}
