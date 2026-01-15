'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsSubmitting(true);
    const params = new URLSearchParams({ address: address.trim() });
    router.push(`/site?${params.toString()}`);
  };

  return (
    <div className="quote-entry">
      <div className="quote-entry-card">
        <div className="quote-entry-label">Site-First Estimating</div>
        <h1>Rule Tool</h1>
        <p>Draw once, estimate across multiple trades automatically.</p>

        <form className="quote-entry-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="site-address">Site address</label>
          <input
            id="site-address"
            type="text"
            placeholder="Enter site address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !address.trim()}
          >
            {isSubmitting ? 'Loading...' : 'Start Estimating'}
          </button>
        </form>

        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)' }}>
          <strong>Trades included:</strong> Asphalt, Sealcoating, Concrete, Striping
        </div>
      </div>
    </div>
  );
}
