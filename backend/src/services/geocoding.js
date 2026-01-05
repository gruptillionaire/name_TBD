const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const getNearbyPlaces = async (lat, lng, radius = 50) => {
  if (!GOOGLE_API_KEY) {
    console.warn('Google Places API key not configured');
    return [];
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status);
      return [];
    }

    return data.results.map(place => ({
      placeId: place.place_id,
      name: place.name,
      types: place.types,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      }
    }));
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
};

const reverseGeocode = async (lat, lng) => {
  if (!GOOGLE_API_KEY) {
    console.warn('Google Places API key not configured');
    return { city: null, country: null };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Geocoding API error:', data.status);
      return { city: null, country: null };
    }

    let city = null;
    let country = null;

    for (const result of data.results) {
      for (const component of result.address_components) {
        if (component.types.includes('locality') && !city) {
          city = component.long_name;
        }
        if (component.types.includes('country') && !country) {
          country = component.long_name;
        }
      }
      if (city && country) break;
    }

    return { city, country };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return { city: null, country: null };
  }
};

module.exports = { getNearbyPlaces, reverseGeocode };
