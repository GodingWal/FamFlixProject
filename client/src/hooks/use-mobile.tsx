import { useState, useEffect } from "react";

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if the screen is mobile-sized
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Run on first render
    checkIfMobile();
    
    // Set up event listener for window resize
    window.addEventListener("resize", checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);
  
  return isMobile;
}
