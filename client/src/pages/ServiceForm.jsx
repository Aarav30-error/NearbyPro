import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

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

export const ServiceForm = () => {
  const { id } = useParams(); // If present, edit mode; otherwise, create mode
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: 'electrician',
    description: '',
    price: '',
    priceUnit: 'per_hour',
    address: '',
    latitude: '12.9716',
    longitude: '77.5946',
  });

  const [loadingInitial, setLoadingInitial] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  // If in edit mode, fetch existing service details
  useEffect(() => {
    if (!isEditMode) return;

    const fetchService = async () => {
      try {
        const res = await api.get(`/services/${id}`);
        if (res.data?.success) {
          const s = res.data.data;
          const [lng, lat] = s.location?.coordinates || [77.5946, 12.9716];
          setFormData({
            title: s.title || '',
            category: s.category || 'electrician',
            description: s.description || '',
            price: s.price?.toString() || '',
            priceUnit: s.priceUnit || 'per_hour',
            address: s.address || '',
            latitude: lat.toString(),
            longitude: lng.toString(),
          });
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load service for editing');
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchService();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        alert(`Location detection failed: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (formData.title.trim().length < 3 || formData.title.trim().length > 80) {
      setError('Title must be between 3 and 80 characters');
      return;
    }
    if (formData.description.trim().length < 10 || formData.description.trim().length > 1000) {
      setError('Description must be between 10 and 1000 characters');
      return;
    }
    const numPrice = parseFloat(formData.price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Price must be a valid number equal to or greater than 0');
      return;
    }
    const numLat = parseFloat(formData.latitude);
    const numLng = parseFloat(formData.longitude);
    if (isNaN(numLat) || numLat < -90 || numLat > 90) {
      setError('Latitude must be a number between -90 and 90');
      return;
    }
    if (isNaN(numLng) || numLng < -180 || numLng > 180) {
      setError('Longitude must be a number between -180 and 180');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        price: numPrice,
        priceUnit: formData.priceUnit,
        address: formData.address.trim(),
        latitude: numLat,
        longitude: numLng,
      };

      if (isEditMode) {
        await api.patch(`/services/${id}`, payload);
      } else {
        await api.post('/services', payload);
      }

      navigate('/provider/dashboard');
    } catch (err) {
      const resp = err?.response?.data;
      if (resp?.errors && resp.errors.length > 0) {
        setError(resp.errors.map((e) => e.message).join(', '));
      } else {
        setError(resp?.message || 'Failed to save service');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="container">
        <Loader message="Loading service details..." />
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '640px' }}>
      <Link to="/provider/dashboard" style={{ textDecoration: 'none', color: '#2563eb', marginBottom: '14px', display: 'inline-block' }}>
        ← Back to Provider Dashboard
      </Link>

      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>
          {isEditMode ? 'Edit Service Listing' : 'Publish a New Service Listing'}
        </h2>

        <ErrorMessage message={error} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="service-title">Service Title (3-80 characters)</label>
            <input
              id="service-title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Expert Home Electrical Repair & Wiring"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="service-category">Category</label>
              <select id="service-category" name="category" value={formData.category} onChange={handleChange} required>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="service-unit">Price Unit</label>
              <select id="service-unit" name="priceUnit" value={formData.priceUnit} onChange={handleChange} required>
                <option value="per_hour">Per Hour</option>
                <option value="per_job">Per Job</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="service-price">Price (₹)</label>
            <input
              id="service-price"
              type="number"
              min="0"
              step="any"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="e.g. 350"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="service-description">Detailed Description (10-1000 characters)</label>
            <textarea
              id="service-description"
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleChange}
              placeholder="Explain what is included, your years of experience, tools provided, warranty, etc."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="service-address">Human-Readable Service Address / Area (Max 200 chars)</label>
            <input
              id="service-address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. Indiranagar 100 Feet Road, Bengaluru"
              required
            />
          </div>

          {/* Location coordinates with geolocation button */}
          <div className="card" style={{ background: '#f9fafb', margin: '16px 0', padding: '16px' }}>
            <div className="flex-between" style={{ marginBottom: '10px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Service GPS Coordinates</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleUseMyLocation}
                disabled={locating}
              >
                {locating ? 'Detecting GPS...' : '📍 Use My Current Location'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="service-lat">Latitude</label>
                <input
                  id="service-lat"
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="service-lng">Longitude</label>
                <input
                  id="service-lng"
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <p className="meta-text" style={{ marginTop: '8px' }}>
              Accurate coordinates power the geospatial search allowing clients in your neighborhood to find you.
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={submitting}
          >
            {submitting ? 'Saving Service...' : isEditMode ? 'Update Service' : 'Publish Service'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ServiceForm;
