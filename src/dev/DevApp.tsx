import React, { useState } from 'react';
import FloorplanEditor from '../FloorplanEditor';

const DevApp: React.FC = () => {

    return <FloorplanEditor />
};

// Expose for debugging
declare global {
    interface Window {
        floorplanEditor: any;
    }
}

// For debugging in console
if (typeof window !== 'undefined') {
    window.floorplanEditor = {
        // This will be populated by the provider context
    };
}

export default DevApp;