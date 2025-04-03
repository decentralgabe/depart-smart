import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Smart Commute - Find Your Optimal Departure Time",
  description: "Get notified when it's the best time to leave for work based on traffic conditions",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script id="map-style-fixer" strategy="afterInteractive">
          {`
            (function() {
              // Fix for Google Maps components styling
              function injectStyles() {
                const styles = document.createElement('style');
                styles.textContent = \`
                  html body .pac-container *, 
                  html body .pac-item, 
                  html body [role="combobox"], 
                  html body input[type="text"], 
                  html body input:not([type]),
                  html body [data-component="place-autocomplete-element"], 
                  html body [data-component="place-autocomplete-element"] *,
                  html body .address-input-wrapper *,
                  html body [data-component-type="PlaceAutocompleteElement"],
                  html body [data-component-type="PlaceAutocompleteElement"] * {
                    background-color: hsl(var(--background)) !important;
                    color: hsl(var(--foreground)) !important;
                    border-color: hsl(var(--border)) !important;
                  }
                \`;
                document.head.appendChild(styles);
                
                // Try to periodically add styles to any shadow DOM elements
                const observer = new MutationObserver(function(mutations) {
                  mutations.forEach(function(mutation) {
                    if (mutation.addedNodes) {
                      mutation.addedNodes.forEach(function(node) {
                        if (node.shadowRoot) {
                          const shadowStyle = document.createElement('style');
                          shadowStyle.textContent = styles.textContent;
                          node.shadowRoot.appendChild(shadowStyle);
                        }
                      });
                    }
                  });
                });
                
                observer.observe(document.body, { 
                  childList: true, 
                  subtree: true 
                });
              }
              
              // Run immediately and also after load
              injectStyles();
              window.addEventListener('load', injectStyles);
              
              // Also attempt to run periodically
              setInterval(injectStyles, 1000);
            })();
          `}
        </Script>
        
        {/* Pre-load Google Maps API to ensure it's available */}
        <Script
          id="google-maps-script"
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&callback=initGoogleCallback`}
          strategy="beforeInteractive"
        />
        
        <Script id="init-google-callback" strategy="beforeInteractive">
          {`
            window.initGoogleCallback = function() {
              window.googleLoaded = true;
              if (window.initAutocomplete) {
                window.initAutocomplete();
              }
            };
          `}
        </Script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}