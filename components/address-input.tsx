/// <reference types="@types/google.maps" />
'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

// Extend the Window interface to include google maps objects
declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  icon?: ReactNode;
  name?: string;
}

const AddressInput = ({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = 'Start typing your address...',
  icon,
  name
}: AddressInputProps) => {
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
        return true; // Indicate script is already loading
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap&loading=async`;
      script.async = true;
      script.defer = true;
      window.initMap = () => {
        setIsScriptLoaded(true);
      };
      script.onerror = () => {
        delete window.initMap; // Clean up callback on error
      };
      document.body.appendChild(script);
      return false; // Indicate script was just initiated
    };

    // --- Autocomplete Initialization Logic --- 
    const initializeAutocomplete = async () => {
      const targetContainer = containerRef.current;

      if (!targetContainer || !window.google?.maps?.places) {
        return;
      }
      
      // Check if already initialized in this container
      if (targetContainer.hasChildNodes()) {
        return;
      }

      try {
        // Ensure library is imported
        await window.google.maps.importLibrary("places"); 

        const autocompleteElement = new google.maps.places.PlaceAutocompleteElement({
          // Configuration options
        });
        autocompleteElement.setAttribute('placeholder', placeholder);
        autocompleteElement.className = "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
        
        if (disabled) {
          autocompleteElement.setAttribute('disabled', 'true');
        }

        targetContainer.appendChild(autocompleteElement);
        autocompleteRef.current = autocompleteElement;

        // Add event listeners
        autocompleteElement.addEventListener('gmp-placeselect', async (event: Event) => {
          const placeSelectEvent = event as CustomEvent<{ place: google.maps.places.Place }>;
          const place = placeSelectEvent.detail.place;
          if (!place || !place.id) return;
          
          try {
            await place.fetchFields({ fields: ['formattedAddress'] });
            if (place.formattedAddress) {
              onChange(place.formattedAddress);
            }
          } catch (error) {
            // Silent fail on error
          }
        });

        // Set initial value if provided
        if (value) {
          autocompleteElement.setAttribute('value', value);
        }

      } catch (error) {
        // Silent fail on error
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
      // Clean up the global callback function to prevent memory leaks
      if (window.initMap?.toString() === (() => { setIsScriptLoaded(true); }).toString()) {
         delete window.initMap;
      }
    };
  }, [isScriptLoaded, initializationAttempted, placeholder, disabled, value, onChange]);

  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {icon}
        </div>
      )}
      <div 
        ref={containerRef} 
        id={`address-input-${name}`} 
        className={`${icon ? 'pl-10' : ''}`}
      >
        {!isScriptLoaded && !initializationAttempted && (
          <input
            type="text"
            placeholder={placeholder}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={true}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
        )}
      </div>
    </div>
  );
};

export default AddressInput; 