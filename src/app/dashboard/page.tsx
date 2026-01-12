'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useDashboardStore, PIPELINE_STAGES, formatCurrency, getStageInfo } from '@/lib/dashboard/store';
import type { Bid, BidStage } from '@/lib/supabase/types';

// Quick stats card component
function StatCard({ label, value, subtext, color }: { label: string; value: string | number; subtext?: string; color?: string }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      padding: '16px',
    }}>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 'bold', color: color || '#111827', margin: '4px 0 0 0' }}>{value}</p>
      {subtext && <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>{subtext}</p>}
    </div>
  );
}

// Bid card for pipeline view
function BidCard({ bid, onClick }: { bid: Bid; onClick: () => void }) {
  const dueDate = bid.bid_due_date ? new Date(bid.bid_due_date) : null;
  const isOverdue = dueDate && dueDate < new Date() && !['won', 'lost', 'archived'].includes(bid.stage);

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '12px',
        cursor: 'pointer',
        marginBottom: '8px',
      }}
    >
      <h4 style={{ fontWeight: '500', color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {bid.name}
      </h4>
      {bid.customer_name && (
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {bid.customer_name}
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        {bid.estimated_value && (
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#059669' }}>
            {formatCurrency(bid.estimated_value)}
          </span>
        )}
        {dueDate && (
          <span style={{ fontSize: '12px', color: isOverdue ? '#ef4444' : '#9ca3af', fontWeight: isOverdue ? '500' : 'normal' }}>
            {isOverdue ? 'Overdue' : dueDate.toLocaleDateString()}
          </span>
        )}
      </div>
      {bid.tags && bid.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
          {bid.tags.slice(0, 2).map((tag) => (
            <span key={tag} style={{ padding: '2px 6px', backgroundColor: '#f3f4f6', color: '#4b5563', fontSize: '12px', borderRadius: '4px' }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Pipeline column
function PipelineColumn({ stage, bids, onBidClick }: {
  stage: typeof PIPELINE_STAGES[0];
  bids: Bid[];
  onBidClick: (bid: Bid) => void;
}) {
  const totalValue = bids.reduce((sum, b) => sum + (b.estimated_value || 0), 0);

  return (
    <div style={{
      flexShrink: 0,
      width: '280px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      padding: '12px',
      minHeight: '300px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: stage.color,
        }} />
        <h3 style={{ fontWeight: '500', color: '#374151', margin: 0 }}>{stage.label}</h3>
        <span style={{ fontSize: '14px', color: '#9ca3af' }}>({bids.length})</span>
      </div>
      {totalValue > 0 && (
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px 0' }}>{formatCurrency(totalValue)}</p>
      )}
      <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
        {bids.map((bid) => (
          <BidCard key={bid.id} bid={bid} onClick={() => onBidClick(bid)} />
        ))}
        {bids.length === 0 && (
          <p style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>No bids</p>
        )}
      </div>
    </div>
  );
}

// Create bid modal
function CreateBidModal({ isOpen, onClose, onCreate }: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: Partial<Bid>) => void;
}) {
  const [name, setName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    await onCreate({
      name: name.trim(),
      customer_name: customerName.trim() || null,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      bid_due_date: dueDate || null,
    });

    // Reset form
    setName('');
    setCustomerName('');
    setEstimatedValue('');
    setDueDate('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        width: '450px',
        maxWidth: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#111' }}>New Bid</h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
            Bid Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., ABC Corp Parking Lot"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
            Customer Name
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g., ABC Corporation"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
            Estimated Value
          </label>
          <input
            type="number"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="0"
            min="0"
            step="100"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: !name.trim() || isSubmitting ? '#93c5fd' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !name.trim() || isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Bid'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Bid detail slide-over
function BidDetailPanel({ bid, onClose }: { bid: Bid; onClose: () => void }) {
  const stageInfo = getStageInfo(bid.stage);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '500px',
          backgroundColor: 'white',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{bid.name}</h2>
            <button
              onClick={onClose}
              style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <span style={{
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: '500',
              borderRadius: '4px',
              backgroundColor: stageInfo.color + '20',
              color: stageInfo.color,
            }}>
              {stageInfo.label}
            </span>
            {bid.priority !== 'medium' && (
              <span style={{
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: '500',
                borderRadius: '4px',
                backgroundColor: bid.priority === 'urgent' ? '#fee2e2' : bid.priority === 'high' ? '#ffedd5' : '#f3f4f6',
                color: bid.priority === 'urgent' ? '#dc2626' : bid.priority === 'high' ? '#ea580c' : '#4b5563',
              }}>
                {bid.priority}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {bid.customer_name && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: '#6b7280' }}>Customer</label>
              <p style={{ fontWeight: '500', margin: '4px 0 0 0' }}>{bid.customer_name}</p>
            </div>
          )}

          {bid.estimated_value && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: '#6b7280' }}>Estimated Value</label>
              <p style={{ fontWeight: '500', color: '#059669', margin: '4px 0 0 0' }}>{formatCurrency(bid.estimated_value)}</p>
            </div>
          )}

          {bid.bid_due_date && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: '#6b7280' }}>Due Date</label>
              <p style={{ fontWeight: '500', margin: '4px 0 0 0' }}>{new Date(bid.bid_due_date).toLocaleDateString()}</p>
            </div>
          )}

          {bid.description && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: '#6b7280' }}>Description</label>
              <p style={{ color: '#374151', margin: '4px 0 0 0' }}>{bid.description}</p>
            </div>
          )}

          <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb', marginTop: '24px' }}>
            <Link
              href={`/dashboard/bids/${bid.id}`}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                padding: '12px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500',
                boxSizing: 'border-box',
              }}
            >
              View Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);

  const bids = useDashboardStore((s) => s.bids);
  const setBids = useDashboardStore((s) => s.setBids);
  const addBid = useDashboardStore((s) => s.addBid);
  const getBidsByStage = useDashboardStore((s) => s.getBidsByStage);
  const getPipelineStats = useDashboardStore((s) => s.getPipelineStats);

  // Fetch bids on mount
  useEffect(() => {
    async function fetchBids() {
      try {
        const response = await fetch('/api/bids');
        const data = await response.json();
        if (data.success) {
          setBids(data.bids);
        }
      } catch (error) {
        console.error('Failed to fetch bids:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBids();
  }, [setBids]);

  const handleCreateBid = useCallback(async (bidData: Partial<Bid>) => {
    try {
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bidData.name,
          customerName: bidData.customer_name,
          estimatedValue: bidData.estimated_value,
          bidDueDate: bidData.bid_due_date,
        }),
      });
      const data = await response.json();
      if (data.success) {
        addBid(data.bid);
      }
    } catch (error) {
      console.error('Failed to create bid:', error);
    }
  }, [addBid]);

  const bidsByStage = getBidsByStage();
  const stats = getPipelineStats();

  // Active pipeline stages (exclude won/lost/archived for main view)
  const activePipelineStages = PIPELINE_STAGES.filter(
    (s) => !['won', 'lost', 'archived'].includes(s.id)
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Bid Dashboard</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>Track and manage your bids</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              href="/blueprint"
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                color: '#374151',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Blueprints
            </Link>
            <Link
              href="/site"
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                color: '#374151',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Site Estimator
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Bid
            </button>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <StatCard label="Total Bids" value={stats.totalBids} />
          <StatCard label="Pipeline Value" value={formatCurrency(stats.totalValue)} color="#059669" />
          <StatCard label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 30 ? '#059669' : '#f97316'} />
          <StatCard label="Due This Week" value={stats.dueThisWeek} color={stats.dueThisWeek > 0 ? '#2563eb' : undefined} />
          <StatCard label="Overdue" value={stats.overdueCount} color={stats.overdueCount > 0 ? '#ef4444' : undefined} />
          <StatCard label="Won" value={stats.byStage.won?.count || 0} subtext={formatCurrency(stats.byStage.won?.value || 0)} color="#059669" />
        </div>
      </div>

      {/* Pipeline View */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
          {activePipelineStages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              bids={bidsByStage.get(stage.id) || []}
              onBidClick={setSelectedBid}
            />
          ))}
        </div>
      </div>

      {/* Won/Lost Summary */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <h3 style={{ fontWeight: '500', color: '#065f46', margin: 0 }}>Won ({stats.byStage.won?.count || 0})</h3>
            </div>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: 0 }}>{formatCurrency(stats.byStage.won?.value || 0)}</p>
          </div>
          <div style={{ flex: 1, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <h3 style={{ fontWeight: '500', color: '#991b1b', margin: 0 }}>Lost ({stats.byStage.lost?.count || 0})</h3>
            </div>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatCurrency(stats.byStage.lost?.value || 0)}</p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <CreateBidModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateBid}
      />

      {/* Bid Detail Slide-over */}
      {selectedBid && (
        <BidDetailPanel bid={selectedBid} onClose={() => setSelectedBid(null)} />
      )}
    </div>
  );
}
