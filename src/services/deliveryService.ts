import { db, collection, addDoc } from '../firebase';
import { UserProfile } from '../types';

export const coordinateExpressDelivery = async (user: UserProfile | null) => {
  return new Promise<{ coords: string, address: string, mapsUrl: string }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    const options = {
      enableHighAccuracy: true, // Prioritize exact location over speed
      timeout: 10000, // Allow more time for GPS pinpointing
      maximumAge: 0 // Do not use cached location for 2-hour coordination
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const coordsStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`; // Higher precision
        const gMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        console.log(`Pinpointed location with ${accuracy}m accuracy`);
        // Save coords immediately as fallback
        localStorage.setItem('user_location', coordsStr);
        localStorage.setItem('user_location_coords', coordsStr);
        localStorage.setItem('user_location_link', gMapsUrl);

        // Coordination to Admin (fire and forget for speed)
        addDoc(collection(db, 'delivery_requests'), {
          userId: user?.uid || 'guest',
          userName: user?.name || 'Guest',
          userPhone: user?.phone || 'N/A',
          location: coordsStr,
          coordinates: coordsStr,
          mapsUrl: gMapsUrl,
          type: 'express_interest',
          createdAt: Date.now()
        }).catch(console.error);

        // Resolve with coords first if geocoding is slow? 
        // No, let's try to get address but with a very short timeout
        const getAddress = async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s max for address
            
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (data && data.display_name) {
              const parts = data.display_name.split(',');
              // Increase specificity to get house/street info if available
              const specificAddress = parts.slice(0, 4).join(',').trim();
              localStorage.setItem('user_location', specificAddress);
              return specificAddress;
            }
          } catch (e) {
            console.error("Address fetch failed or timed out:", e);
          }
          return coordsStr;
        };

        const finalAddress = await getAddress();
        resolve({ coords: coordsStr, address: finalAddress, mapsUrl: gMapsUrl });
      },
      (error) => reject(error),
      options
    );
  });
};
