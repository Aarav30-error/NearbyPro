import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import StarRating from '../components/StarRating.jsx';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export const ServiceDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsMeta, setReviewsMeta] = useState({ page: 1, limit: 5, total: 0, totalPages: 1 });
  const [reviewsPage, setReviewsPage] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Request form state
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];

  const [message, setMessage] = useState('');
  const [preferredDate, setPreferredDate] = useState(tomorrowString);
  const [customerAddress, setCustomerAddress] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  // Fetch Service Details
  const fetchService = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/services/${id}`);
      if (res.data?.success) {
        setService(res.data.data);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load service details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch Service Reviews
  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const res = await api.get(`/reviews/service/${id}`, {
        params: { page: reviewsPage, limit: 5 },
      });
      if (res.data?.success) {
        setReviews(res.data.data || []);
        if (res.data.meta) {
          setReviewsMeta(res.data.meta);
        }
      }
    } catch (err) {
      console.warn('Failed to load reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  }, [id, reviewsPage]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle Request Submission
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');

    if (!message || message.trim().length < 5) {
      setRequestError('Message must be at least 5 characters long');
      return;
    }
    if (!customerAddress || customerAddress.trim().length < 5) {
      setRequestError('Please provide your full service address (min 5 characters)');
      return;
    }
    if (!preferredDate) {
      setRequestError('Please select a preferred date');
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await api.post('/requests', {
        serviceId: id,
        message: message.trim(),
        preferredDate,
        customerAddress: customerAddress.trim(),
      });

      if (res.data?.success) {
        setRequestSuccess('Your service request has been sent successfully! The provider will review it.');
        setMessage('');
        setCustomerAddress('');
      }
    } catch (err) {
      setRequestError(err?.response?.data?.message || 'Failed to submit service request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <Loader message="Loading service details..." />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="container">
        <ErrorMessage message={error || 'Service not found'} />
        <Link to="/" className="btn btn-secondary">
          ← Back to Search
        </Link>
      </div>
    );
  }

  const [lng, lat] = service.location?.coordinates || [0, 0];
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const isOwner = user && user._id === service.provider?._id;
  const isCustomer = user && user.role === 'customer';

  return (
    <div className="container">
      <Link to="/" style={{ textDecoration: 'none', color: '#2563eb', marginBottom: '16px', display: 'inline-block' }}>
        ← Back to search results
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left Column: Service Details & Reviews */}
        <div>
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '10px' }}>
              <span className="badge badge-category">{service.category}</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#16a34a' }}>
                ₹{service.price} {service.priceUnit === 'per_hour' ? '/ hour' : 'per job'}
              </span>
            </div>

            <h1 style={{ fontSize: '1.6rem', marginBottom: '10px' }}>{service.title}</h1>

            <div style={{ marginBottom: '14px' }}>
              <StarRating rating={service.avgRating} reviewCount={service.reviewCount} />
            </div>

            <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: '20px', whiteSpace: 'pre-line' }}>
              {service.description}
            </p>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Provider Information</h3>
              <p style={{ fontSize: '0.95rem', color: '#374151' }}>
                <strong>Name:</strong> {service.provider?.name}
              </p>
              {service.provider?.phone ? (
                <p style={{ fontSize: '0.95rem', color: '#374151' }}>
                  <strong>Phone:</strong> <a href={`tel:${service.provider.phone}`}>{service.provider.phone}</a>
                </p>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  (Provider contact details become visible once a request is accepted)
                </p>
              )}
              <p style={{ fontSize: '0.95rem', color: '#374151', marginTop: '6px' }}>
                <strong>Service Area:</strong> {service.address}
              </p>

              <div style={{ marginTop: '12px' }}>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  📍 Open Location in Google Maps
                </a>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="card" style={{ marginTop: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
              Verified Customer Reviews ({service.reviewCount})
            </h2>

            {loadingReviews && <Loader message="Loading reviews..." />}

            {!loadingReviews && reviews.length === 0 && (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                No reviews yet. Be the first to book this service and share your experience!
              </p>
            )}

            {!loadingReviews && reviews.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {reviews.map((rev) => (
                  <div key={rev._id} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                    <div className="flex-between" style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {rev.customer?.name || 'Verified Customer'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <StarRating rating={rev.rating} />

                    {rev.comment && (
                      <p style={{ fontSize: '0.9rem', color: '#4b5563', marginTop: '6px' }}>
                        {rev.comment}
                      </p>
                    )}
                  </div>
                ))}

                {/* Reviews Pagination */}
                {reviewsMeta.totalPages > 1 && (
                  <div className="pagination" style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={reviewsPage <= 1}
                      onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                    >
                      ← Prev
                    </button>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {reviewsMeta.page} / {reviewsMeta.totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={reviewsPage >= reviewsMeta.totalPages}
                      onClick={() => setReviewsPage((p) => Math.min(reviewsMeta.totalPages, p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Service Request Form or Call-to-action */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '14px' }}>Request This Service</h2>

            {requestSuccess && (
              <div className="success-box" style={{ marginBottom: '16px' }}>
                <p>{requestSuccess}</p>
                <Link to="/customer/dashboard" className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
                  View in My Dashboard
                </Link>
              </div>
            )}

            <ErrorMessage message={requestError} />

            {!isAuthenticated ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: '#4b5563', marginBottom: '16px' }}>
                  Please sign in as a customer to submit a booking request for this service.
                </p>
                <Link
                  to="/login"
                  state={{ from: { pathname: `/services/${id}` } }}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Login to Request
                </Link>
              </div>
            ) : isOwner ? (
              <div style={{ padding: '16px 0', color: '#6b7280', textAlign: 'center' }}>
                <p>This is your service listing.</p>
                <Link to={`/provider/services/${id}/edit`} className="btn btn-secondary" style={{ marginTop: '10px' }}>
                  Edit Service Details
                </Link>
              </div>
            ) : !isCustomer ? (
              <div style={{ padding: '16px 0', color: '#6b7280', textAlign: 'center' }}>
                <p>You are logged in with a Provider account.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                  Only customer accounts can hire services.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit}>
                <div className="form-group">
                  <label htmlFor="req-date">Preferred Service Date</label>
                  <input
                    id="req-date"
                    type="date"
                    min={tomorrowString}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="req-address">Your Complete Service Address</label>
                  <textarea
                    id="req-address"
                    rows="2"
                    placeholder="House/Flat number, building name, street, landmark, area"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="req-message">Details of Work / Problem Description</label>
                  <textarea
                    id="req-message"
                    rows="4"
                    placeholder="Describe what needs repair or attention (min 5 chars)..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={submittingRequest}
                >
                  {submittingRequest ? 'Sending Request...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
