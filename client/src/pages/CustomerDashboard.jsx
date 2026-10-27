import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import StatusBadge from '../components/StatusBadge.jsx';
import StarRating from '../components/StarRating.jsx';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

const STATUS_TABS = ['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'EXPIRED'];

export const CustomerDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Review modal/inline form state
  const [reviewingRequestId, setReviewingRequestId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = activeTab !== 'ALL' ? { status: activeTab } : {};
      const res = await api.get('/requests/mine', { params });
      if (res.data?.success) {
        setRequests(res.data.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch your service requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle Cancel Action
  const handleCancel = async (requestId) => {
    const confirmed = window.confirm('Are you sure you want to cancel this service request?');
    if (!confirmed) return;

    setProcessingId(requestId);
    setActionMessage('');
    setError('');

    try {
      const res = await api.patch(`/requests/${requestId}/status`, {
        action: 'cancel',
        note: 'Cancelled by customer',
      });
      if (res.data?.success) {
        setActionMessage('Service request cancelled.');
        await fetchRequests();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to cancel request');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Review Submission
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    setSubmittingReview(true);

    try {
      const res = await api.post('/reviews', {
        requestId: reviewingRequestId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      if (res.data?.success) {
        setActionMessage('Thank you! Your review has been published and the rating updated.');
        setReviewingRequestId(null);
        setReviewComment('');
        setReviewRating(5);
        await fetchRequests();
      }
    } catch (err) {
      setReviewError(err?.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="container">
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div>
          <h2>My Service Bookings</h2>
          <p className="meta-text">Track all your requested services, provider updates, and completed jobs</p>
        </div>
        <Link to="/" className="btn btn-primary btn-sm">
          + Book New Service
        </Link>
      </div>

      {actionMessage && <div className="success-box">{actionMessage}</div>}
      <ErrorMessage message={error} />

      {/* Status Filter Tabs */}
      <div className="tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && <Loader message="Loading your bookings..." />}

      {!loading && requests.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 16px' }}>
          <p style={{ color: '#4b5563', fontSize: '1.05rem', marginBottom: '8px' }}>
            No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} requests found.
          </p>
          <p className="meta-text" style={{ marginBottom: '16px' }}>
            Find trusted electricians, plumbers, tutors, and tailors in your neighborhood.
          </p>
          <Link to="/" className="btn btn-secondary btn-sm">
            Explore Services
          </Link>
        </div>
      )}

      {/* Requests List */}
      {!loading && requests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map((req) => {
            const isProcessing = processingId === req._id;
            const canCancel = req.status === 'PENDING' || req.status === 'ACCEPTED';
            const canReview = req.status === 'COMPLETED' && !req.hasReview;

            return (
              <div key={req._id} className="card">
                <div className="flex-between" style={{ marginBottom: '10px' }}>
                  <div>
                    <span className="badge badge-category" style={{ marginRight: '8px' }}>
                      {req.serviceSnapshot?.category}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <span className="meta-text">
                    Requested on {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>
                  <Link to={`/services/${req.service}`} style={{ textDecoration: 'none', color: '#111827' }}>
                    {req.serviceSnapshot?.title}
                  </Link>
                </h3>

                <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '8px' }}>
                  <strong>Provider:</strong> {req.provider?.name || 'Assigned Professional'}
                  {req.provider?.phone && (
                    <span style={{ marginLeft: '12px', color: '#166534', fontWeight: 600 }}>
                      📞 {req.provider.phone}
                    </span>
                  )}
                </p>

                <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
                    <strong>Scheduled Date:</strong> {new Date(req.preferredDate).toLocaleDateString()}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
                    <strong>Your Service Address:</strong> {req.customerAddress}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                    <strong>Note to Provider:</strong> &ldquo;{req.message}&rdquo;
                  </p>
                </div>

                {/* Status history note if any */}
                {req.statusHistory?.length > 1 && (
                  <p className="meta-text" style={{ marginBottom: '12px', fontStyle: 'italic' }}>
                    Latest update: {req.statusHistory[req.statusHistory.length - 1].note || req.status}
                  </p>
                )}

                {/* Actions row */}
                <div className="flex-between" style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                      ₹{req.serviceSnapshot?.price}{' '}
                      <span className="meta-text">
                        ({req.serviceSnapshot?.priceUnit === 'per_hour' ? '/ hr' : 'per job'})
                      </span>
                    </span>
                  </div>

                  <div className="flex-row">
                    {canCancel && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={isProcessing}
                        onClick={() => handleCancel(req._id)}
                      >
                        {isProcessing ? 'Cancelling...' : 'Cancel Request'}
                      </button>
                    )}

                    {canReview && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setReviewingRequestId(req._id);
                          setReviewError('');
                        }}
                      >
                        ★ Leave a Review
                      </button>
                    )}

                    {req.status === 'COMPLETED' && req.hasReview && (
                      <span className="badge badge-completed" style={{ padding: '4px 10px' }}>
                        ✓ Reviewed
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline Review Form */}
                {reviewingRequestId === req._id && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '16px',
                      background: '#fffbeb',
                      borderRadius: '8px',
                      border: '1px solid #fef3c7',
                    }}
                  >
                    <h4 style={{ marginBottom: '10px' }}>Write a Review for {req.provider?.name}</h4>
                    <ErrorMessage message={reviewError} />

                    <form onSubmit={handleReviewSubmit}>
                      <div className="form-group">
                        <label>Your Rating (1 to 5 Stars):</label>
                        <StarRating rating={reviewRating} editable onChange={(val) => setReviewRating(val)} />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`comment-${req._id}`}>Your Feedback (Optional):</label>
                        <textarea
                          id={`comment-${req._id}`}
                          rows="3"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="How was the quality of work, punctuality, and professionalism?"
                        />
                      </div>

                      <div className="flex-row">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={submittingReview}>
                          {submittingReview ? 'Submitting...' : 'Post Review'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setReviewingRequestId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
