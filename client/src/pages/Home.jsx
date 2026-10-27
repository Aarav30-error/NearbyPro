import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios.js';
import ServiceCard from '../components/ServiceCard.jsx';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

const PRESET_CITIES = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
];

const CATEGORIES = [
  'electrician',
  'plumber',
  'tutor',
  'tailor',
  'carpenter',
  'painter',
  'cleaner',
  'mechanic',
  'other',
];

export const Home = () => {
  // Location state (default to Bengaluru center)
  const [lat, setLat] = useState('12.9716');
  const [lng, setLng] = useState('77.5946');
  const [locationName, setLocationName] = useState('Bengaluru');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Filters state
  const [qInput, setQInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [category, setCategory] = useState('');
  const [radiusKm, setRadiusKm] = useState('10');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sort, setSort] = useState('distance');
  const [page, setPage] = useState(1);

  // Results state
  const [services, setServices] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // AbortController ref to cancel stale requests
  const abortControllerRef = useRef(null);

  // Debounce the keyword input (400 ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(qInput);
      setPage(1); // Reset page on query change
    }, 400);

    return () => clearTimeout(handler);
  }, [qInput]);

  // Handle preset city change
  const handleCityChange = (e) => {
    const cityName = e.target.value;
    const city = PRESET_CITIES.find((c) => c.name === cityName);
    if (city) {
      setLat(city.lat.toString());
      setLng(city.lng.toString());
      setLocationName(city.name);
      setLocationError('');
      setPage(1);
    }
  };

  // Browser Geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setLocationName('Current Location');
        setLocating(false);
        setPage(1);
      },
      (geoErr) => {
        setLocating(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Please select a city or enter coordinates.');
        } else if (geoErr.code === geoErr.TIMEOUT) {
          setLocationError('Location request timed out. Please try again or enter manually.');
        } else {
          setLocationError('Unable to retrieve location. Please choose a preset city.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Fetch Services from API
  const fetchServices = useCallback(async () => {
    const numericLat = parseFloat(lat);
    const numericLng = parseFloat(lng);

    if (isNaN(numericLat) || isNaN(numericLng)) {
      setError('Please provide valid latitude and longitude coordinates.');
      return;
    }

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const params = {
        lat: numericLat,
        lng: numericLng,
        radiusKm: Number(radiusKm) || 10,
        sort,
        page,
        limit: 10,
      };

      if (category) params.category = category;
      if (debouncedQ) params.q = debouncedQ;
      if (maxPrice) params.maxPrice = Number(maxPrice);
      if (minRating) params.minRating = Number(minRating);

      const res = await api.get('/services/nearby', {
        params,
        signal: controller.signal,
      });

      if (res.data?.success) {
        setServices(res.data.data || []);
        if (res.data.meta) {
          setMeta(res.data.meta);
        }
      }
    } catch (err) {
      // Ignore aborted errors
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      setError(err?.response?.data?.message || 'Failed to load nearby services');
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radiusKm, category, debouncedQ, maxPrice, minRating, sort, page]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return (
    <div className="container">
      {/* Search Header & Geolocation Controls */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '12px' }}>Find Trusted Local Services Near You</h2>

        {/* Location selector */}
        <div className="flex-row" style={{ alignItems: 'flex-end', marginBottom: '14px' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label htmlFor="city-select">Select City Preset</label>
            <select id="city-select" value={locationName} onChange={handleCityChange}>
              {PRESET_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value="Custom" disabled>
                Custom Coordinates
              </option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleUseMyLocation}
            disabled={locating}
            style={{ height: '38px', whiteSpace: 'nowrap' }}
          >
            {locating ? 'Detecting GPS...' : '📍 Use My Location'}
          </button>

          <div style={{ flex: '1 1 120px' }}>
            <label htmlFor="home-lat">Latitude</label>
            <input
              id="home-lat"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => {
                setLat(e.target.value);
                setLocationName('Custom');
              }}
            />
          </div>

          <div style={{ flex: '1 1 120px' }}>
            <label htmlFor="home-lng">Longitude</label>
            <input
              id="home-lng"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => {
                setLng(e.target.value);
                setLocationName('Custom');
              }}
            />
          </div>
        </div>

        {locationError && <ErrorMessage message={locationError} />}

        {/* Filters Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '12px',
          }}
        >
          <div>
            <label htmlFor="search-keyword">Keyword Search</label>
            <input
              id="search-keyword"
              type="text"
              placeholder="e.g. electrical, leak, tutor..."
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="search-category">Category</label>
            <select
              id="search-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="search-radius">Radius (km)</label>
            <select
              id="search-radius"
              value={radiusKm}
              onChange={(e) => {
                setRadiusKm(e.target.value);
                setPage(1);
              }}
            >
              <option value="1">Within 1 km</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km (Default)</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km (Max)</option>
            </select>
          </div>

          <div>
            <label htmlFor="search-max-price">Max Price (₹)</label>
            <input
              id="search-max-price"
              type="number"
              min="0"
              placeholder="Any price"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label htmlFor="search-min-rating">Min Rating</label>
            <select
              id="search-min-rating"
              value={minRating}
              onChange={(e) => {
                setMinRating(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Any Rating</option>
              <option value="4">4.0+ Stars</option>
              <option value="3">3.0+ Stars</option>
              <option value="2">2.0+ Stars</option>
            </select>
          </div>

          <div>
            <label htmlFor="search-sort">Sort By</label>
            <select
              id="search-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="distance">Distance (Nearest First)</option>
              <option value="rating">Top Rated</option>
              <option value="price">Lowest Price</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h3>
          Available Services {meta.total > 0 && <span className="meta-text">({meta.total} found)</span>}
        </h3>
      </div>

      <ErrorMessage message={error} />

      {/* Loading state */}
      {loading && <Loader message="Searching nearby verified professionals..." />}

      {/* Empty State */}
      {!loading && !error && services.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 16px' }}>
          <p style={{ fontSize: '1.1rem', color: '#4b5563', marginBottom: '8px' }}>
            No providers found within {radiusKm} km.
          </p>
          <p className="meta-text" style={{ marginBottom: '16px' }}>
            Try increasing the search radius, switching categories, or clearing keyword filters.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setRadiusKm('25');
              setCategory('');
              setQInput('');
              setMaxPrice('');
              setMinRating('');
            }}
          >
            Reset Filters to 25 km
          </button>
        </div>
      )}

      {/* Results Grid */}
      {!loading && services.length > 0 && (
        <div className="grid">
          {services.map((service) => (
            <ServiceCard key={service._id} service={service} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && meta.totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
