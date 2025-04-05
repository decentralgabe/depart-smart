/// <reference types="@types/google.maps" />
'use client';

import { useEffect, useRef, useState, ReactNode, Suspense } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'none'>('text');

  // Detect touch device for better input mode
  useEffect(() => {
    // Check if touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setInputMode(isTouchDevice ? 'text' : 'text'); // Always use text, but keep the detection for future use
  }, []);

  useEffect(() => {
    // Defer script loading with requestIdleCallback for better mobile performance
    const loadScript = () => {
      // Already loaded
      if (window.google?.maps?.places) {
        setIsScriptLoaded(true);
        return;
      }
      
      // Already loading
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        return;
      }

      // Create and add script tag
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap&loading=async`;
      script.async = true;
      script.defer = true;
      
      window.initMap = () => setIsScriptLoaded(true);
      script.onerror = () => delete window.initMap;
      document.body.appendChild(script);
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadScript);
    } else {
      setTimeout(loadScript, 100);
    }

    return () => {
      if (window.initMap?.toString() === (() => setIsScriptLoaded(true)).toString()) {
        delete window.initMap;
      }
    };
  }, []);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    const initializeAutocomplete = async () => {
      const targetContainer = containerRef.current;

      // Check prerequisites
      if (!targetContainer || !window.google?.maps?.places || targetContainer.hasChildNodes()) {
        return;
      }

      try {
        await window.google.maps.importLibrary("places"); 

        // Create autocomplete element
        const autocompleteElement = new google.maps.places.PlaceAutocompleteElement({});
        autocompleteElement.setAttribute('placeholder', placeholder);
        autocompleteElement.setAttribute('inputmode', inputMode);
        autocompleteElement.className = "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
        
        if (disabled) {
          autocompleteElement.setAttribute('disabled', 'true');
        }

        // Add to DOM
        targetContainer.appendChild(autocompleteElement);
        autocompleteRef.current = autocompleteElement;

        // Handle place selection - using passive event listener for better touch performance
        autocompleteElement.addEventListener('gmp-placeselect', async (event: Event) => {
          const placeSelectEvent = event as CustomEvent<{ place: google.maps.places.Place }>;
          const place = placeSelectEvent.detail.place;
          if (!place || !place.id) return;
          
          try {
            await place.fetchFields({ fields: ['formattedAddress'] });
            if (place.formattedAddress) {
              onChange(place.formattedAddress);
            }
          } catch {
            // Silent fail
          }
        }, { passive: true });

        // Set initial value if provided
        if (value) {
          autocompleteElement.setAttribute('value', value);
        }
      } catch {
        // Silent fail
      }
    };

    if (isScriptLoaded && containerRef.current && !initializationAttempted) {
      setInitializationAttempted(true);
      initializeAutocomplete();
    }
  }, [isScriptLoaded, initializationAttempted, placeholder, disabled, value, onChange, inputMode]);

  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {icon}
        </div>
      )}
      <div 
        ref={containerRef} 
        id={`address-input-${name || 'default'}`} 
        className={`${icon ? 'pl-10' : ''}`}
      >
        {!isScriptLoaded && !initializationAttempted && (
          <input
            type="text"
            inputMode={inputMode}
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