import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditWaypoint from './edit_waypoint'; // Adjust path if necessary
import { vi } from 'vitest';

// --- Mocks ---
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

const mockGetWaypointById = vi.fn();
const mockUpdateWaypoint = vi.fn();
vi.mock('../services/db', () => ({
  getWaypointById: mockGetWaypointById,
  updateWaypoint: mockUpdateWaypoint,
}));

// Browser API Mocks
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { ...global.navigator.mediaDevices, getUserMedia: mockGetUserMedia },
  writable: true,
});

const mockStreamTracks = [{ stop: vi.fn() }];
const mockStream = { getTracks: () => mockStreamTracks, getVideoTracks: () => [{}] } as unknown as MediaStream;
const mockTakePhoto = vi.fn();
const mockImageCaptureInstance = { takePhoto: mockTakePhoto };
const mockImageCapture = vi.fn(() => mockImageCaptureInstance);
global.ImageCapture = mockImageCapture;


let fileReaderResult: string | ArrayBuffer | null = 'data:image/png;base64,mocked_new_file_data';
let frInstance: any;
global.FileReader = vi.fn(() => {
  frInstance = {
    onloadend: () => {},
    result: fileReaderResult,
    readAsDataURL: vi.fn().mockImplementation(function(this: any) {
        act(() => { // Wrap state update in act
            if (this.onloadend) {
                this.onloadend();
            }
        });
    }),
    onerror: () => {},
  };
  return frInstance;
}) as any;


// --- Test Suite ---
const baseWaypointData = {
  id: 1,
  name: 'Initial Waypoint',
  latitude: 10.123456,
  longitude: 20.654321,
  notes: 'Initial notes',
  createdAt: Date.now(),
};

describe('EditWaypoint Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ wpId: String(baseWaypointData.id) });
    mockGetWaypointById.mockResolvedValue({ ...baseWaypointData, imageDataUrl: 'data:image/jpeg;base64,initial_image_data' });
    mockUpdateWaypoint.mockResolvedValue({ ...baseWaypointData, name: 'Updated Waypoint' });
    mockGetUserMedia.mockReset();
    mockTakePhoto.mockReset();
    fileReaderResult = 'data:image/png;base64,mocked_new_file_data'; // Reset file reader result
    mockStreamTracks[0].stop.mockClear();
  });

  describe('Loading Existing Waypoint', () => {
    test('loads and displays waypoint with an image', async () => {
      render(<EditWaypoint />);
      await waitFor(() => expect(screen.getByDisplayValue(baseWaypointData.name)).toBeInTheDocument());
      expect(screen.getByDisplayValue(baseWaypointData.notes)).toBeInTheDocument();
      expect(screen.getByAltText('Waypoint') as HTMLImageElement).toHaveAttribute('src', baseWaypointData.imageDataUrl);
      expect(screen.getByText('Remove Image')).toBeInTheDocument();
    });

    test('loads and displays waypoint without an image', async () => {
      mockGetWaypointById.mockResolvedValue({ ...baseWaypointData, imageDataUrl: null });
      render(<EditWaypoint />);
      await waitFor(() => expect(screen.getByDisplayValue(baseWaypointData.name)).toBeInTheDocument());
      expect(screen.getByText('No image provided.')).toBeInTheDocument();
      expect(screen.queryByText('Remove Image')).not.toBeInTheDocument();
    });

    test('displays error if waypoint not found', async () => {
      mockGetWaypointById.mockResolvedValue(undefined);
      render(<EditWaypoint />);
      await waitFor(() => expect(screen.getByText('Error: Waypoint not found.')).toBeInTheDocument());
    });
     test('displays error if wpId is invalid', async () => {
      mockUseParams.mockReturnValue({ wpId: "invalid-id" });
      render(<EditWaypoint />);
      await waitFor(() => expect(screen.getByText('Error: Invalid Waypoint ID.')).toBeInTheDocument());
    });
  });

  describe('Image Capture via "Open Camera"', () => {
    test('successfully captures and updates image', async () => {
      mockGetUserMedia.mockResolvedValue(mockStream);
      mockTakePhoto.mockResolvedValue(new Blob(['newMockImageData'], { type: 'image/png' }));
      fileReaderResult = 'data:image/png;base64,new_camera_image_data'; // Set specific result for this test

      render(<EditWaypoint />);
      await waitFor(() => expect(screen.getByDisplayValue(baseWaypointData.name)).toBeInTheDocument()); // Ensure loaded

      await userEvent.click(screen.getByText('Open Camera'));
      await waitFor(() => expect(screen.getByText('Take Photo')).toBeInTheDocument()); // Modal appears
      await userEvent.click(screen.getByText('Take Photo'));

      await waitFor(() => {
        const img = screen.getByAltText('Waypoint') as HTMLImageElement;
        expect(img.src).toBe(fileReaderResult);
      });
      expect(screen.getByText('Remove Image')).toBeInTheDocument();
      expect(screen.queryByText('Take Photo')).not.toBeInTheDocument(); // Modal closed
    });

    test('handles camera access denied', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission Denied'));
      render(<EditWaypoint />);
      await waitFor(() => expect(screen.getByDisplayValue(baseWaypointData.name)).toBeInTheDocument());

      await userEvent.click(screen.getByText('Open Camera'));
      await waitFor(() => expect(screen.getByText(/Camera access denied or not available: Permission Denied/i)).toBeInTheDocument());

      // Ensure original image (if any) or placeholder is still shown
      expect(screen.getByAltText('Waypoint') as HTMLImageElement).toHaveAttribute('src', baseWaypointData.imageDataUrl);
    });
  });

  describe('Image Selection via "Choose from File"', () => {
    test('successfully selects and updates image', async () => {
      fileReaderResult = 'data:image/gif;base64,chosen_file_image_data';
      render(<EditWaypoint />);
      await waitFor(() => expect(screen.getByDisplayValue(baseWaypointData.name)).toBeInTheDocument());

      await userEvent.click(screen.getByText('Choose from File'));
      // Simulate file reading (FileReader mock handles the rest)
      act(() => {
        frInstance.readAsDataURL(new Blob(['chosenFile'], {type: 'image/gif'}));
      });

      await waitFor(() => {
        const img = screen.getByAltText('Waypoint') as HTMLImageElement;
        expect(img.src).toBe(fileReaderResult);
      });
      expect(screen.getByText('Remove Image')).toBeInTheDocument();
    });
  });

  describe('Removing an Image', () => {
    test('removes the image and updates preview', async () => {
      render(<EditWaypoint />);
      await waitFor(() => expect(screen.getByAltText('Waypoint')).toBeInTheDocument()); // Wait for image to load
      expect(screen.getByText('Remove Image')).toBeInTheDocument();

      await userEvent.click(screen.getByText('Remove Image'));

      await waitFor(() => expect(screen.getByText('No image provided.')).toBeInTheDocument());
      expect(screen.queryByAltText('Waypoint')).not.toBeInTheDocument();
      expect(screen.queryByText('Remove Image')).not.toBeInTheDocument(); // Button should hide
      expect(screen.getByText(/Image marked for removal/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission (Saving Changes)', () => {
    test('updates name/notes, image unchanged', async () => {
      render(<EditWaypoint />);
      await waitFor(() => expect(screen.getByDisplayValue(baseWaypointData.name)).toBeInTheDocument());

      await userEvent.clear(screen.getByDisplayValue(baseWaypointData.name));
      await userEvent.type(screen.getByDisplayValue(''), 'New Name'); // Input is now empty
      await userEvent.click(screen.getByText('Save Waypoint'));

      await waitFor(() => {
        expect(mockUpdateWaypoint).toHaveBeenCalledWith(baseWaypointData.id, {
          name: 'New Name',
          notes: baseWaypointData.notes,
          imageDataUrl: baseWaypointData.imageDataUrl, // Original image
        });
      });
      expect(screen.getByText(/Waypoint updated successfully!/i)).toBeInTheDocument();
    });

    test('updates with a new image', async () => {
      mockGetUserMedia.mockResolvedValue(mockStream);
      mockTakePhoto.mockResolvedValue(new Blob(['newMock'], {type: 'image/png'}));
      const newImageData = 'data:image/png;base64,camera_captured_for_save';
      fileReaderResult = newImageData; // Set FileReader to return this for the capture

      render(<EditWaypoint />);
      await waitFor(() => screen.getByDisplayValue(baseWaypointData.name));

      await userEvent.click(screen.getByText('Open Camera'));
      await waitFor(() => screen.getByText('Take Photo'));
      await userEvent.click(screen.getByText('Take Photo'));
      await waitFor(() => expect((screen.getByAltText('Waypoint') as HTMLImageElement).src).toBe(newImageData));

      await userEvent.click(screen.getByText('Save Waypoint'));

      await waitFor(() => {
        expect(mockUpdateWaypoint).toHaveBeenCalledWith(baseWaypointData.id, {
          name: baseWaypointData.name,
          notes: baseWaypointData.notes,
          imageDataUrl: newImageData, // New image
        });
      });
    });

    test('updates after removing an image', async () => {
      render(<EditWaypoint />);
      await waitFor(() => screen.getByText('Remove Image'));
      await userEvent.click(screen.getByText('Remove Image'));
      await waitFor(() => screen.getByText('No image provided.'));

      await userEvent.click(screen.getByText('Save Waypoint'));
      await waitFor(() => {
        expect(mockUpdateWaypoint).toHaveBeenCalledWith(baseWaypointData.id, {
          name: baseWaypointData.name,
          notes: baseWaypointData.notes,
          imageDataUrl: null, // Image removed
        });
      });
    });

    test('handles save error from updateWaypoint', async () => {
      mockUpdateWaypoint.mockRejectedValue(new Error('DB update failed'));
      render(<EditWaypoint />);
      await waitFor(() => screen.getByDisplayValue(baseWaypointData.name));
      await userEvent.click(screen.getByText('Save Waypoint'));

      await waitFor(() => expect(screen.getByText(/Failed to update waypoint./i)).toBeInTheDocument());
    });
  });

  describe('Cancel Button', () => {
    test('navigates back when cancel button is clicked', async () => {
      render(<EditWaypoint />);
      await waitFor(() => screen.getByDisplayValue(baseWaypointData.name));
      // The cancel button in EditWaypoint is the X icon at the top by default from the template
      // Or a full button if specifically designed. Let's assume the X icon is used for "Close" or general cancel.
      // If there's a specific "Cancel" text button, use that. The current template has a "Close" X icon.
      // The provided component code uses a button with aria-label="Close"
      await userEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    test('stops camera and navigates back if camera is active', async () => {
      mockGetUserMedia.mockResolvedValue(mockStream);
      render(<EditWaypoint />);
      await waitFor(() => screen.getByDisplayValue(baseWaypointData.name));
      await userEvent.click(screen.getByText('Open Camera'));
      await waitFor(() => screen.getByText('Take Photo')); // Wait for camera modal

      await userEvent.click(screen.getByRole('button', { name: /close/i })); // Main page cancel

      expect(mockStreamTracks[0].stop).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
      expect(screen.queryByText('Take Photo')).not.toBeInTheDocument(); // Modal should be closed
    });
  });
});
