import React from 'react';

export const StarRating = ({ rating = 0, reviewCount, editable = false, onChange }) => {
  const rounded = Math.round(Number(rating) * 10) / 10;

  if (editable) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= rating ? 'active' : ''}`}
            onClick={() => onChange && onChange(star)}
            aria-label={`${star} star`}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  return (
    <span className="stars" title={`Rating: ${rounded} / 5`}>
      {'★'.repeat(Math.round(rounded))}
      {'☆'.repeat(Math.max(0, 5 - Math.round(rounded)))}
      <span style={{ color: '#4b5563', fontSize: '0.85rem', marginLeft: '6px' }}>
        {rounded > 0 ? rounded.toFixed(1) : 'New'}
        {reviewCount !== undefined && ` (${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})`}
      </span>
    </span>
  );
};

export default StarRating;
