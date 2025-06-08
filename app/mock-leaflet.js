// app/mock-leaflet.js
// A minimal mock for Leaflet to satisfy imports during Vite/plugin processing.
// Vitest's vi.mock will still override this for the actual test execution.
const L = {
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: function() {},
    }
  },
  map: function() {},
  tileLayer: function() {},
  marker: function() {},
  // Add other exports if the plugin's static analysis complains further
};
export default L;
