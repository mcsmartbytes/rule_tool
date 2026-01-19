'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useDashboardStore, PIPELINE_STAGES, formatCurrency, getStageInfo } from '@/lib/dashboard/store';
import type { Bid, BidStage } from '@/lib/supabase/types';

// Quick stats card component - Professional design
function StatCard({ label, value, subtext, color, icon }: { label: string; value: string | number; subtext?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {color && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          background: color,
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: color || '#111827', margin: '8px 0 0 0', lineHeight: 1 }}>{value}</p>
          {subtext && <p style={{ fontSize: '13px', color: '#4b5563', margin: '6px 0 0 0' }}>{subtext}</p>}
        </div>
        {icon && (
          <div style={{ color: color || '#9ca3af', opacity: 0.6 }}>{icon}</div>
        )}
      </div>
    </div>
  );
}

// Bid card for pipeline view - Professional SiteSense design
function BidCard({ bid, onClick }: { bid: Bid; onClick: () => void }) {
  const dueDate = bid.bid_due_date ? new Date(bid.bid_due_date) : null;
  const now = new Date();
  const isOverdue = dueDate && dueDate < now && !['won', 'lost', 'archived'].includes(bid.stage);
  const isDueSoon = dueDate && !isOverdue && dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000; // 3 days
  const stageInfo = getStageInfo(bid.stage);

  // Calculate days until due
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
        padding: '0',
        cursor: 'pointer',
        marginBottom: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        background: stageInfo.color,
      }} />

      <div style={{ padding: '14px 14px 14px 18px' }}>
        {/* Header row with value */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h4 style={{
            fontWeight: 600,
            color: '#111827',
            margin: 0,
            fontSize: '15px',
            lineHeight: 1.3,
            flex: 1,
            paddingRight: '8px',
          }}>
            {bid.name}
          </h4>
          {bid.estimated_value && (
            <span style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#1d4ed8',
              whiteSpace: 'nowrap',
            }}>
              {formatCurrency(bid.estimated_value)}
            </span>
          )}
        </div>

        {/* Customer name */}
        {bid.customer_name && (
          <p style={{
            fontSize: '13px',
            color: '#374151',
            margin: '0 0 10px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <svg style={{ width: '14px', height: '14px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bid.customer_name}</span>
          </p>
        )}

        {/* Due date and priority row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {dueDate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: isOverdue ? '#dc2626' : isDueSoon ? '#d97706' : '#374151',
              fontWeight: isOverdue || isDueSoon ? 600 : 400,
            }}>
              <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isOverdue ? (
                <span>Overdue by {Math.abs(daysUntilDue || 0)} day{Math.abs(daysUntilDue || 0) !== 1 ? 's' : ''}</span>
              ) : daysUntilDue !== null && daysUntilDue <= 0 ? (
                <span>Due today</span>
              ) : daysUntilDue !== null && daysUntilDue === 1 ? (
                <span>Due tomorrow</span>
              ) : (
                <span>Due {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              )}
            </div>
          )}

          {/* Priority badge */}
          {bid.priority && bid.priority !== 'medium' && (
            <span style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              backgroundColor: bid.priority === 'urgent' ? '#fef2f2' : bid.priority === 'high' ? '#fffbeb' : '#f9fafb',
              color: bid.priority === 'urgent' ? '#dc2626' : bid.priority === 'high' ? '#d97706' : '#4b5563',
            }}>
              {bid.priority}
            </span>
          )}
        </div>

        {/* Tags */}
        {bid.tags && bid.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            {bid.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{
                padding: '3px 8px',
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                fontSize: '11px',
                borderRadius: '4px',
                fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
            {bid.tags.length > 3 && (
              <span style={{ fontSize: '11px', color: '#6b7280' }}>+{bid.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Pipeline column - Professional SiteSense design
function PipelineColumn({ stage, bids, onBidClick }: {
  stage: typeof PIPELINE_STAGES[0];
  bids: Bid[];
  onBidClick: (bid: Bid) => void;
}) {
  const totalValue = bids.reduce((sum, b) => sum + (b.estimated_value || 0), 0);

  return (
    <div style={{
      flexShrink: 0,
      width: '300px',
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      minHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Column header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        background: `linear-gradient(135deg, ${stage.color}08 0%, ${stage.color}03 100%)`,
        borderRadius: '12px 12px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: stage.color,
              boxShadow: `0 0 0 3px ${stage.color}30`,
            }} />
            <h3 style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '15px' }}>{stage.label}</h3>
          </div>
          <span style={{
            backgroundColor: '#f3f4f6',
            color: '#4b5563',
            padding: '2px 10px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {bids.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p style={{
            fontSize: '13px',
            color: '#374151',
            margin: '8px 0 0 20px',
            fontWeight: 500,
          }}>
            {formatCurrency(totalValue)} pipeline
          </p>
        )}
      </div>

      {/* Cards container */}
      <div style={{
        flex: 1,
        padding: '12px',
        overflowY: 'auto',
        background: '#fafafa',
      }}>
        {bids.map((bid) => (
          <BidCard key={bid.id} bid={bid} onClick={() => onBidClick(bid)} />
        ))}
        {bids.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
            color: '#6b7280',
          }}>
            <svg style={{ width: '40px', height: '40px', margin: '0 auto 12px', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ fontSize: '14px', margin: 0 }}>No bids in {stage.label.toLowerCase()}</p>
          </div>
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
              <label style={{ fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>Customer</label>
              <p style={{ fontWeight: '500', margin: '4px 0 0 0' }}>{bid.customer_name}</p>
            </div>
          )}

          {bid.estimated_value && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>Estimated Value</label>
              <p style={{ fontWeight: '500', color: '#059669', margin: '4px 0 0 0' }}>{formatCurrency(bid.estimated_value)}</p>
            </div>
          )}

          {bid.bid_due_date && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>Due Date</label>
              <p style={{ fontWeight: '500', margin: '4px 0 0 0' }}>{new Date(bid.bid_due_date).toLocaleDateString()}</p>
            </div>
          )}

          {bid.description && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>Description</label>
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
    <div style={{
      height: '100vh',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header - Professional SiteSense design */}
      <header style={{
        background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
        padding: '0',
        flexShrink: 0,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      }}>
        {/* Top bar with branding */}
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg style={{ width: '24px', height: '24px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: 0 }}>Bid Pipeline</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '2px 0 0 0' }}>Track and manage your construction bids</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link
              href="/blueprint"
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Blueprints
            </Link>
            <Link
              href="/site"
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Site Estimator
            </Link>
            <Link
              href="/estimate"
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Estimates
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '10px 18px',
                background: '#eab308',
                color: '#1e293b',
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

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {/* Stats Row */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <StatCard label="Total Bids" value={stats.totalBids} color="#1d4ed8" />
            <StatCard label="Pipeline Value" value={formatCurrency(stats.totalValue)} color="#059669" />
            <StatCard label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 30 ? '#059669' : '#f97316'} />
            <StatCard label="Due This Week" value={stats.dueThisWeek} color={stats.dueThisWeek > 0 ? '#1d4ed8' : undefined} />
            <StatCard label="Overdue" value={stats.overdueCount} color={stats.overdueCount > 0 ? '#ef4444' : undefined} />
            <StatCard label="Won" value={stats.byStage.won?.count || 0} subtext={formatCurrency(stats.byStage.won?.value || 0)} color="#059669" />
          </div>
        </div>

        {/* Pipeline View */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: '0 0 16px 0' }}>Active Pipeline</h2>
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
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
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: '0 0 16px 0' }}>Results</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#10b981' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg style={{ width: '20px', height: '20px', color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, color: '#065f46', margin: 0, fontSize: '15px' }}>Won Bids</h3>
                  <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0 0' }}>{stats.byStage.won?.count || 0} projects</p>
                </div>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#059669', margin: 0 }}>{formatCurrency(stats.byStage.won?.value || 0)}</p>
            </div>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#ef4444' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg style={{ width: '20px', height: '20px', color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, color: '#991b1b', margin: 0, fontSize: '15px' }}>Lost Bids</h3>
                  <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0 0' }}>{stats.byStage.lost?.count || 0} projects</p>
                </div>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626', margin: 0 }}>{formatCurrency(stats.byStage.lost?.value || 0)}</p>
            </div>
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
