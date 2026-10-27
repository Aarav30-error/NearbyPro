import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating.jsx';

export const ServiceCard = ({ service }) => {
  const providerName = service.provider?.name || 'Local Professional';
  const unitText = service.priceUnit === 'per_hour' ? '/ hr' : 'per job';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div className="flex-between" style={{ marginBottom: '8px' }}>
          <span className="badge badge-category">{service.category}</span>
          {service.distanceKm !== undefined && (
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563eb' }}>
              📍 {service.distanceKm} km away
            </span>
          )}
        </div>

        <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', lineHeight: 1.3 }}>
          <Link to={`/services/${service._id}`} style={{ color: '#111827', textDecoration: 'none' }}>
            {service.title}
          </Link>
        </h3>

        <p className="meta-text" style={{ marginBottom: '10px' }}>
          By <strong>{providerName}</strong> • {service.address}
        </p>

        <div style={{ marginBottom: '12px' }}>
          <StarRating rating={service.avgRating} reviewCount={service.reviewCount} />
        </div>
      </div>

      <div>
        <div className="flex-between" style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', marginTop: '10px' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827' }}>
            ₹{service.price}{' '}
            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#6b7280' }}>{unitText}</span>
          </div>

          <Link to={`/services/${service._id}`} className="btn btn-secondary btn-sm">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
