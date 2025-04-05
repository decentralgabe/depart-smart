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
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  
  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
      return;
    }
    
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      // If script is already added but not loaded yet, wait for it
      const checkGoogleExists = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsScriptLoaded(true);
          clearInterval(checkGoogleExists);
        }
      }, 100);
      
      return () => clearInterval(checkGoogleExists);
    }

    // Create and add script tag
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => setIsScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || isInitialized || autocompleteRef.current) return;

    try {
      // Generate a unique ID for this instance
      const inputId = `google-address-${name || Math.random().toString(36).substring(2, 9)}`;
      inputRef.current.id = inputId;
      
      // Set initial value if exists
      if (value && inputRef.current) {
        inputRef.current.value = value;
      }
      
      // Create autocomplete instance with specific options to ensure it works
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'address_components', 'geometry', 'name'],
        componentRestrictions: { country: [] }, // No country restriction
      });
      
      // Store the autocomplete instance in a ref
      autocompleteRef.current = autocomplete;

      // Add event listener for place selection
      google.maps.event.addListener(autocomplete, 'place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place && place.formatted_address) {
          // Use the full formatted address for better geocoding
          onChange(place.formatted_address);
          setIsAddressSelected(true);
          
          if (onBlur) {
            setTimeout(onBlur, 100);
          }
        } else if (place && place.name) {
          // Fallback to place name if formatted address not available
          onChange(place.name);
          setIsAddressSelected(true);
          
          if (onBlur) {
            setTimeout(onBlur, 100);
          }
        }
      });

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Google Places Autocomplete:', error);
    }
    
    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isScriptLoaded, onChange, onBlur, isInitialized, name, value]);

  // Handle manual address input without selection from dropdown
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setIsAddressSelected(false); // Reset selection state on manual changes
    onChange(newValue);
  };

  // Handle blur event - validate address if needed
  const handleBlur = () => {
    // If address was not selected from dropdown but manually typed, 
    // and it's a non-empty string, still consider it valid for submission
    if (!isAddressSelected && inputRef.current?.value) {
      // We still allow manual address entry
      onChange(inputRef.current.value);
    }
    
    if (onBlur) {
      onBlur();
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {icon && (
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
          {icon}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${icon ? 'pl-10' : ''}`}
        placeholder={placeholder}
        disabled={disabled}
        defaultValue={value || ''}
        onChange={handleAddressChange}
        onBlur={handleBlur}
        name={name}
        autoComplete="off" // Prevent browser autocomplete from interfering
      />
    </div>
  );
};

export default AddressInput; 