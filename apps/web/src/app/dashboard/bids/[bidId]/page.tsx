'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboardStore, PIPELINE_STAGES, formatCurrency, formatRelativeTime, getStageInfo } from '@/lib/dashboard/store';
import type { Bid, BidActivity, BidRFI, BidAddendum, BidStage } from '@/lib/supabase/types';

// Tab component
function Tabs({ tabs, activeTab, onTabChange }: {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '12px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === tab.id ? '#2563eb' : '#6b7280',
            fontWeight: activeTab === tab.id ? '500' : 'normal',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              backgroundColor: activeTab === tab.id ? '#dbeafe' : '#f3f4f6',
              color: activeTab === tab.id ? '#2563eb' : '#6b7280',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '12px',
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Activity timeline item
function ActivityItem({ activity }: { activity: BidActivity }) {
  const getIcon = () => {
    switch (activity.activity_type) {
      case 'stage_change':
        return '🔄';
      case 'note':
        return '📝';
      case 'call':
        return '📞';
      case 'email':
        return '✉️';
      case 'meeting':
        return '👥';
      case 'rfi':
        return '❓';
      case 'addendum':
        return '📎';
      case 'file_upload':
        return '📄';
      case 'created':
        return '✨';
      default:
        return '•';
    }
  };

  return (
    <div style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: '20px' }}>{getIcon()}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: '500', color: '#111827', margin: 0 }}>{activity.title}</p>
        {activity.description && (
          <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>{activity.description}</p>
        )}
        <p style={{ color: '#9ca3af', fontSize: '12px', margin: '8px 0 0 0' }}>
          {formatRelativeTime(activity.created_at)}
        </p>
      </div>
    </div>
  );
}

// Stage selector
function StageSelector({ currentStage, onStageChange }: {
  currentStage: BidStage;
  onStageChange: (stage: BidStage) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentInfo = getStageInfo(currentStage);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          backgroundColor: 'white',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: currentInfo.color }} />
        {currentInfo.label}
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            zIndex: 20,
            minWidth: '200px',
          }}>
            {PIPELINE_STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => {
                  onStageChange(stage.id);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: currentStage === stage.id ? '#f3f4f6' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: stage.color }} />
                <div>
                  <div style={{ fontWeight: currentStage === stage.id ? '500' : 'normal' }}>{stage.label}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{stage.description}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Add note modal
function AddNoteModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  if (!isOpen) return null;

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
        width: '500px',
        maxWidth: '90%',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Add Note</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter your note..."
          style={{
            width: '100%',
            height: '120px',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (note.trim()) {
                onAdd(note.trim());
                setNote('');
                onClose();
              }
            }}
            disabled={!note.trim()}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: note.trim() ? '#2563eb' : '#93c5fd',
              color: 'white',
              cursor: note.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BidDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bidId = params.bidId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [bid, setBid] = useState<Bid | null>(null);
  const [activities, setActivities] = useState<BidActivity[]>([]);
  const [rfis, setRfis] = useState<BidRFI[]>([]);
  const [addenda, setAddenda] = useState<BidAddendum[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNoteModal, setShowNoteModal] = useState(false);

  const updateBid = useDashboardStore((s) => s.updateBid);

  // Fetch bid data
  useEffect(() => {
    async function fetchBid() {
      try {
        const response = await fetch(`/api/bids/${bidId}`);
        const data = await response.json();
        if (data.success) {
          setBid(data.bid);
          setActivities(data.activities || []);
          setRfis(data.rfis || []);
          setAddenda(data.addenda || []);
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Failed to fetch bid:', error);
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    }
    fetchBid();
  }, [bidId, router]);

  const handleStageChange = useCallback(async (newStage: BidStage) => {
    if (!bid) return;

    try {
      const response = await fetch(`/api/bids/${bidId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      const data = await response.json();
      if (data.success) {
        setBid(data.bid);
        updateBid(bidId, { stage: newStage });
        // Refresh activities
        const actResponse = await fetch(`/api/bids/${bidId}`);
        const actData = await actResponse.json();
        if (actData.success) {
          setActivities(actData.activities || []);
        }
      }
    } catch (error) {
      console.error('Failed to update stage:', error);
    }
  }, [bid, bidId, updateBid]);

  const handleAddNote = useCallback(async (note: string) => {
    try {
      const response = await fetch(`/api/bids/${bidId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityType: 'note',
          title: 'Note added',
          description: note,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setActivities((prev) => [data.activity, ...prev]);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  }, [bidId]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280' }}>Loading bid...</div>
      </div>
    );
  }

  if (!bid) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>Bid not found</p>
          <Link href="/dashboard" style={{ color: '#2563eb' }}>Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const stageInfo = getStageInfo(bid.stage);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'activities', label: 'Activities', count: activities.length },
    { id: 'rfis', label: 'RFIs', count: rfis.length },
    { id: 'addenda', label: 'Addenda', count: addenda.length },
  ];

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
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Top bar with navigation */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#1d4ed8',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Pipeline
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: '6px 12px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={() => setShowNoteModal(true)}
              style={{
                padding: '6px 12px',
                background: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Add Note
            </button>
          </div>
        </div>

        {/* Bid header info */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{bid.name}</h1>
                <span style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  backgroundColor: stageInfo.color + '15',
                  color: stageInfo.color,
                }}>
                  {stageInfo.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#6b7280', fontSize: '14px' }}>
                {bid.customer_name && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {bid.customer_name}
                  </span>
                )}
                {bid.bid_number && (
                  <span style={{ color: '#9ca3af' }}>#{bid.bid_number}</span>
                )}
                {bid.bid_due_date && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Due {new Date(bid.bid_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {bid.estimated_value && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estimated Value</p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#1d4ed8', margin: 0 }}>{formatCurrency(bid.estimated_value)}</p>
                </div>
              )}
              <StageSelector currentStage={bid.stage} onStageChange={handleStageChange} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content - scrollable */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Left column - Details */}
            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0' }}>Bid Details</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Stage</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: stageInfo.color }} />
                    <span style={{ fontWeight: '500' }}>{stageInfo.label}</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Priority</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '500', textTransform: 'capitalize' }}>{bid.priority}</p>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Estimated Value</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '500', color: '#059669' }}>
                    {bid.estimated_value ? formatCurrency(bid.estimated_value) : '-'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Probability</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>{bid.probability}%</p>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Due Date</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>
                    {bid.bid_due_date ? new Date(bid.bid_due_date).toLocaleDateString() : '-'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Created</label>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>
                    {new Date(bid.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {bid.description && (
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Description</label>
                  <p style={{ margin: '8px 0 0 0', color: '#374151' }}>{bid.description}</p>
                </div>
              )}
            </div>

            {/* Right column - Customer */}
            <div>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0' }}>Customer</h3>

                {bid.customer_name ? (
                  <div>
                    <p style={{ fontWeight: '500', margin: 0 }}>{bid.customer_name}</p>
                    {bid.customer_company && (
                      <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>{bid.customer_company}</p>
                    )}
                    {bid.customer_email && (
                      <p style={{ color: '#2563eb', margin: '8px 0 0 0', fontSize: '14px' }}>
                        <a href={`mailto:${bid.customer_email}`} style={{ color: 'inherit' }}>{bid.customer_email}</a>
                      </p>
                    )}
                    {bid.customer_phone && (
                      <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>{bid.customer_phone}</p>
                    )}
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', fontSize: '14px' }}>No customer information</p>
                )}
              </div>

              {/* Quick actions */}
              <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => setShowNoteModal(true)}
                    style={{
                      padding: '10px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                    }}
                  >
                    📝 Add Note
                  </button>
                  <button
                    style={{
                      padding: '10px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                    }}
                  >
                    ❓ Create RFI
                  </button>
                  <Link
                    href="/site"
                    style={{
                      padding: '10px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      textDecoration: 'none',
                      color: '#111827',
                      display: 'block',
                    }}
                  >
                    🗺️ Open Site Estimator
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Activity Timeline</h3>
              <button
                onClick={() => setShowNoteModal(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Add Note
              </button>
            </div>

            {activities.length > 0 ? (
              <div>
                {activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '32px 0' }}>No activities yet</p>
            )}
          </div>
        )}

        {/* RFIs Tab */}
        {activeTab === 'rfis' && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>RFIs</h3>
              <button
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                New RFI
              </button>
            </div>

            {rfis.length > 0 ? (
              <div>
                {rfis.map((rfi) => (
                  <div key={rfi.id} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>RFI #{rfi.number}</span>
                        <h4 style={{ margin: '4px 0', fontWeight: '500' }}>{rfi.subject}</h4>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        backgroundColor: rfi.status === 'open' ? '#fef3c7' : '#d1fae5',
                        color: rfi.status === 'open' ? '#92400e' : '#065f46',
                      }}>
                        {rfi.status}
                      </span>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0 0 0' }}>{rfi.question}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '32px 0' }}>No RFIs yet</p>
            )}
          </div>
        )}

        {/* Addenda Tab */}
        {activeTab === 'addenda' && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Addenda</h3>
            </div>

            {addenda.length > 0 ? (
              <div>
                {addenda.map((add) => (
                  <div key={add.id} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Addendum #{add.number}</span>
                        <h4 style={{ margin: '4px 0', fontWeight: '500' }}>{add.title}</h4>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        backgroundColor: add.acknowledged ? '#d1fae5' : '#fee2e2',
                        color: add.acknowledged ? '#065f46' : '#991b1b',
                      }}>
                        {add.acknowledged ? 'Acknowledged' : 'Pending'}
                      </span>
                    </div>
                    {add.description && (
                      <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0 0 0' }}>{add.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '32px 0' }}>No addenda yet</p>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onAdd={handleAddNote}
      />
    </div>
  );
}
