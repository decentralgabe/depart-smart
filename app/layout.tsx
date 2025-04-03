import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "When Should I Leave - Find Your Optimal Departure Time",
  description: "Get optimal departure times based on real-time traffic data.",
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
        
        {/* Google Maps Dynamic Library Import bootstrap loader */}
        <Script id="google-maps-bootstrap" strategy="beforeInteractive">
          {`
            (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
              key: "${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}",
              v: "weekly"
            });
          `}
        </Script>
      </head>
      <body suppressHydrationWarning className={inter.className}>{children}</body>
    </html>
  )
}