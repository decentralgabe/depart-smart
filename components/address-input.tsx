/// <reference types="@types/google.maps" />
'use client';

import { useEffect, useRef, useState } from 'react';

// Extend the Window interface to include google maps objects
declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

const AddressInput = () => {
  // Ref for the container div where the autocomplete element will be placed
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [initializationAttempted, setInitializationAttempted] = useState(false);

  useEffect(() => {
    // --- Script Loading Logic --- 
    const loadGoogleMapsScript = () => {
      // Check if already loaded or script tag exists
      if (window.google?.maps?.places) {
        if (!isScriptLoaded) setIsScriptLoaded(true);
        return true; // Indicate script is ready or already loading
      }
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        console.log("Script tag exists, waiting for load...");
        // Assume callback is already set or will be handled by the existing script instance
        // If it might be stuck, potentially add a timeout or re-attach callback
        return true; // Indicate script is already loading
      }

      console.log("Creating Google Maps script tag...");
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap&loading=async`;
      script.async = true;
      script.defer = true;
      window.initMap = () => {
        console.log("Google Maps script loaded via callback.");
        setIsScriptLoaded(true);
      };
      script.onerror = () => {
        console.error("Google Maps script failed to load.");
        delete window.initMap; // Clean up callback on error
        // Optionally set an error state here
      };
      document.body.appendChild(script);
      return false; // Indicate script was just initiated
    };

    // --- Autocomplete Initialization Logic --- 
    const initializeAutocomplete = async () => {
      // Guard clauses moved to the check below before calling this function
      console.log("Attempting to initialize autocomplete...");
      const targetContainer = containerRef.current;

      // Redundant checks (already performed before calling), but safe to keep
       if (!targetContainer || !window.google?.maps?.places) {
          console.error("Initialization prerequisites not met.");
          return;
       }
      // Check if already initialized in this container
      if (targetContainer.hasChildNodes()) {
          console.log("Autocomplete container already has children, assuming initialized.");
          return;
      }

      try {
        // Ensure library is imported (redundant if places lib loaded via script tag, but safe)
        await window.google.maps.importLibrary("places"); 
        console.log("Places library confirmed available.");

        console.log("Creating PlaceAutocompleteElement...");
        const autocompleteElement = new google.maps.places.PlaceAutocompleteElement({
          // Configuration options
        });
        autocompleteElement.setAttribute('placeholder', 'Start typing your address...');
        autocompleteElement.className = "block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 sm:text-sm p-2";

        targetContainer.appendChild(autocompleteElement);
        autocompleteRef.current = autocompleteElement;
        console.log("PlaceAutocompleteElement created and appended.");

        // Add event listeners
        autocompleteElement.addEventListener('gmp-placeselect', async (event: Event) => {
           const placeSelectEvent = event as CustomEvent<{ place: google.maps.places.Place }>;
           const place = placeSelectEvent.detail.place;
           if (!place || !place.id) { /* ... */ return; }
           console.log('Place selected (ID):', place.id);
           try {
             await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
             console.log('Place details fetched:', place);
             // --- TODO: Handle selected place --- 
           } catch (error) {
             console.error("Error fetching place details:", error);
           }
        });
        autocompleteElement.addEventListener('gmp-error', (event: Event) => {
          const errorEvent = event as CustomEvent<{ error: Error }>;
          console.error('Autocomplete Error:', errorEvent.detail.error);
        });
        console.log("Event listeners added.");

      } catch (error) {
        console.error('Error initializing Google Maps Autocomplete:', error);
      }
    };

    // --- Effect Execution Logic --- 

    // 1. Attempt to load the script if it hasn't been initiated
    const scriptAlreadyLoadingOrLoaded = loadGoogleMapsScript();

    // 2. Check conditions for initialization
    if (isScriptLoaded && containerRef.current && !initializationAttempted) {
      setInitializationAttempted(true); // Mark as attempted immediately
      initializeAutocomplete();
    }

    // --- Cleanup Logic --- 
    return () => {
      console.log("AddressInput unmounting - cleaning up initMap callback...");
      // Clean up the global callback function to prevent memory leaks
      // Only delete if it's the function *we* assigned
      if (window.initMap?.toString() === (() => { setIsScriptLoaded(true); }).toString()) {
         delete window.initMap;
         console.log("initMap callback removed.");
      }
      // Note: Autocomplete element itself is removed when containerRef unmounts
    };

  // Dependencies: 
  // - isScriptLoaded: Re-run when the script finishes loading.
  // - initializationAttempted: Prevent re-running initialization if already attempted.
  }, [isScriptLoaded, initializationAttempted]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Enter Address:
      </label>
      <div ref={containerRef} id="address-autocomplete-container">
        {/* Show loading indicator only if script isn't loaded AND initialization hasn't been attempted */} 
        {!isScriptLoaded && !initializationAttempted && 
          <p className="text-sm text-gray-500 p-2">Loading address input...</p>
        }
        {/* Optionally add error state UI based on script load errors or init errors */}
      </div>
    </div>
  );
};

export default AddressInput; 