import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import StatusBadge from '../components/StatusBadge.jsx';
import StarRating from '../components/StarRating.jsx';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

const STATUS_TABS = ['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'EXPIRED'];

export const ProviderDashboard = () => {
  // Services section state
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [deactivatingId, setDeactivatingId] = useState(null);

  // Incoming Requests section state
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [inFlightActionId, setInFlightActionId] = useState(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Provider's Own Services
  const fetchMyServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const res = await api.get('/services/mine');
      if (res.data?.success) {
        setServices(res.data.data || []);
      }
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Failed to load your services');
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // Fetch Incoming Requests
  const fetchIncomingRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const params = activeTab !== 'ALL' ? { status: activeTab } : {};
      const res = await api.get('/requests/incoming', { params });
      if (res.data?.success) {
        setRequests(res.data.data || []);
      }
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Failed to load incoming requests');
    } finally {
      setLoadingRequests(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchMyServices();
  }, [fetchMyServices]);

  useEffect(() => {
    fetchIncomingRequests();
  }, [fetchIncomingRequests]);

  // Handle Request Status Actions (Accept, Decline, Complete, Cancel)
  const handleAction = async (requestId, action, confirmPrompt = null) => {
    if (confirmPrompt) {
      const ok = window.confirm(confirmPrompt);
      if (!ok) return;
    }

    setInFlightActionId(requestId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.patch(`/requests/${requestId}/status`, { action });
      if (res.data?.success) {
        setSuccessMessage(`Successfully updated request status (${action.toUpperCase()}).`);
        await fetchIncomingRequests();
      }
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || `Failed to execute action ${action}`);
    } finally {
      setInFlightActionId(null);
    }
  };

  // Handle Service Deactivation (Soft delete)
  const handleDeactivateService = async (serviceId) => {
    const ok = window.confirm(
      'Are you sure you want to deactivate this service? It will no longer appear in search results.'
    );
    if (!ok) return;

    setDeactivatingId(serviceId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.delete(`/services/${serviceId}`);
      if (res.data?.success) {
        setSuccessMessage('Service deactivated successfully.');
        await fetchMyServices();
      }
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Cannot deactivate service with active requests');
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '24px' }}>
        <h2>Provider Management Dashboard</h2>
        <p className="meta-text">Manage your published skill listings and respond to client requests</p>
      </div>

      {successMessage && <div className="success-box">{successMessage}</div>}
      <ErrorMessage message={errorMessage} />

      {/* SECTION 1: MY SERVICES */}
      <section style={{ marginBottom: '40px' }}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h3>My Service Listings ({services.length})</h3>
          <Link to="/provider/services/new" className="btn btn-primary btn-sm">
            + Create New Service
          </Link>
        </div>

        {loadingServices && <Loader message="Loading your service listings..." />}

        {!loadingServices && services.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ color: '#4b5563', marginBottom: '12px' }}>
              You haven&apos;t listed any services yet.
            </p>
            <Link to="/provider/services/new" className="btn btn-primary btn-sm">
              Publish Your First Service
            </Link>
          </div>
        )}

        {!loadingServices && services.length > 0 && (
          <div className="grid">
            {services.map((s) => {
              const isDeactivating = deactivatingId === s._id;

              return (
                <div key={s._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div className="flex-between" style={{ marginBottom: '6px' }}>
                      <span className="badge badge-category">{s.category}</span>
                      <span className={`badge ${s.isActive ? 'badge-completed' : 'badge-declined'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', margin: '6px 0' }}>
                      <Link to={`/services/${s._id}`} style={{ textDecoration: 'none', color: '#111827' }}>
                        {s.title}
                      </Link>
                    </h4>

                    <p className="meta-text" style={{ marginBottom: '8px' }}>
                      {s.address}
                    </p>

                    <div style={{ marginBottom: '10px' }}>
                      <StarRating rating={s.avgRating} reviewCount={s.reviewCount} />
                    </div>

                    <p style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1f2937' }}>
                      ₹{s.price} <span className="meta-text">{s.priceUnit === 'per_hour' ? '/ hr' : 'per job'}</span>
                    </p>
                  </div>

                  <div className="flex-row" style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', marginTop: '12px' }}>
                    <Link to={`/provider/services/${s._id}/edit`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                      Edit
                    </Link>

                    {s.isActive && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={isDeactivating}
                        onClick={() => handleDeactivateService(s._id)}
                      >
                        {isDeactivating ? 'Deactivating...' : 'Deactivate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: INCOMING REQUESTS */}
      <section>
        <div style={{ marginBottom: '16px' }}>
          <h3>Incoming Client Requests</h3>
          <p className="meta-text">Review job details, accept bookings, and mark work completed</p>
        </div>

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

        {loadingRequests && <Loader message="Loading incoming client requests..." />}

        {!loadingRequests && requests.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ color: '#6b7280' }}>
              No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} requests at this time.
            </p>
          </div>
        )}

        {!loadingRequests && requests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {requests.map((req) => {
              const inFlight = inFlightActionId === req._id;

              return (
                <div key={req._id} className="card">
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <div>
                      <span className="badge badge-category" style={{ marginRight: '8px' }}>
                        {req.serviceSnapshot?.category}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                    <span className="meta-text">
                      Received {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>
                    {req.serviceSnapshot?.title}
                  </h4>

                  <p style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
                    <strong>Client:</strong> {req.customer?.name}
                    {req.customer?.phone && (
                      <span style={{ marginLeft: '12px', color: '#166534', fontWeight: 600 }}>
                        📞 {req.customer.phone}
                      </span>
                    )}
                  </p>

                  <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
                      <strong>Client Address:</strong> {req.customerAddress}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
                      <strong>Requested Date:</strong> {new Date(req.preferredDate).toLocaleDateString()}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                      <strong>Client Requirement:</strong> &ldquo;{req.message}&rdquo;
                    </p>
                  </div>

                  {/* Actions Bar - buttons appear ONLY when valid for current status */}
                  <div className="flex-between" style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      ₹{req.serviceSnapshot?.price}{' '}
                      <span className="meta-text">
                        ({req.serviceSnapshot?.priceUnit === 'per_hour' ? '/ hr' : 'per job'})
                      </span>
                    </span>

                    <div className="flex-row">
                      {/* PENDING ACTIONS */}
                      {req.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            disabled={inFlight}
                            onClick={() => handleAction(req._id, 'accept')}
                          >
                            {inFlight ? 'Processing...' : '✓ Accept Request'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={inFlight}
                            onClick={() =>
                              handleAction(req._id, 'decline', 'Decline this customer request?')
                            }
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {/* ACCEPTED ACTIONS */}
                      {req.status === 'ACCEPTED' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={inFlight}
                            onClick={() =>
                              handleAction(
                                req._id,
                                'complete',
                                'Confirm that this job has been completed?'
                              )
                            }
                          >
                            {inFlight ? 'Updating...' : '★ Mark Completed'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={inFlight}
                            onClick={() =>
                              handleAction(
                                req._id,
                                'cancel',
                                'Are you sure you want to cancel this accepted job?'
                              )
                            }
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {/* TERMINAL STATUSES */}
                      {['COMPLETED', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(req.status) && (
                        <span className="meta-text" style={{ fontStyle: 'italic' }}>
                          No further actions available ({req.status})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProviderDashboard;
