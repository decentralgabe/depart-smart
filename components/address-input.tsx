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
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
      return;
    }
    
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      return;
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
    if (!isScriptLoaded || !inputRef.current || isInitialized) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'geometry'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place && place.formatted_address) {
          onChange(place.formatted_address);
          if (onBlur) {
            setTimeout(onBlur, 100);
          }
        }
      });

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Google Places Autocomplete:', error);
    }
  }, [isScriptLoaded, onChange, onBlur, isInitialized]);

  // Update input value when value prop changes
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

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
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        name={name}
      />
    </div>
  );
};

export default AddressInput; 