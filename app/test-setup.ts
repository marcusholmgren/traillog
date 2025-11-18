// Extend Vitest's expect method with methods from react-testing-library
import '@testing-library/jest-dom/vitest';
import "fake-indexeddb/auto";

// Mock for navigator.storage.estimate
if (!navigator.storage) {
    Object.defineProperty(navigator, "storage", {
        value: {
            estimate: () => Promise.resolve({usage: 0, quota: 0}),
        },
        writable: true,
    });
}

// Mock for Worker
if (typeof Worker === 'undefined') {
    global.Worker = class {
        constructor(stringUrl: string | URL, options?: WorkerOptions) {}
        postMessage(message: any, transfer?: Transferable[]) {}
        onmessage(event: MessageEvent) {}
        onerror(event: ErrorEvent) {}
        terminate() {}
    } as any;
}

if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => [];
}
