'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore, useIsAuthenticated } from '@/lib/auth/store';
import logoImage from '@/assets/rule-tool-logo.png';
import heroImage from '@/assets/rule-tool-hero.png';

// Tape measure logo component
function TapeMeasureLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Tape measure body */}
      <rect x="2" y="6" width="16" height="12" rx="2" fill="white" stroke="none" />
      {/* Tape coming out */}
      <path d="M18 12 L22 12" stroke="white" strokeWidth="3" />
      {/* Measurement marks */}
      <line x1="5" y1="9" x2="5" y2="11" stroke="#3b82f6" strokeWidth="1.5" />
      <line x1="8" y1="9" x2="8" y2="12" stroke="#3b82f6" strokeWidth="1.5" />
      <line x1="11" y1="9" x2="11" y2="11" stroke="#3b82f6" strokeWidth="1.5" />
      <line x1="14" y1="9" x2="14" y2="12" stroke="#3b82f6" strokeWidth="1.5" />
      {/* Hook at end */}
      <path d="M22 10 L22 14" stroke="white" strokeWidth="2" />
    </svg>
  );
}

// Stats data
const STATS = [
  { value: '5 min', label: 'Average estimate time' },
  { value: 'Multiple', label: 'Trades from one measurement' },
  { value: '90%', label: 'Faster than manual takeoffs' },
];

// How it works steps
const STEPS = [
  {
    number: '1',
    title: 'Enter Address',
    description: 'Type any commercial property address to load satellite imagery',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    number: '2',
    title: 'Draw Once',
    description: 'Trace areas on the satellite map or upload blueprints for AI analysis',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    number: '3',
    title: 'Get Multi-Trade Estimates',
    description: 'Instantly see pricing across all your trades from a single measurement',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
];

// Features
const FEATURES = [
  {
    title: 'AI-Powered Detection',
    description: 'Automatically detect surfaces and features from satellite imagery',
    icon: '🤖',
  },
  {
    title: 'Blueprint Analysis',
    description: 'Upload PDFs and let AI extract measurements and materials',
    icon: '📐',
  },
  {
    title: 'Multi-Trade Pricing',
    description: 'One measurement gives you estimates across all your trades',
    icon: '💰',
  },
  {
    title: 'Bid Pipeline',
    description: 'Track all your bids from lead to won with a visual Kanban board',
    icon: '📊',
  },
];

// FAQ data
const FAQS = [
  {
    question: 'How accurate are the measurements?',
    answer: 'Measurements are based on satellite imagery and are typically within 2-5% of field measurements. For critical bids, we recommend verifying with on-site measurements.',
  },
  {
    question: 'What trades are supported?',
    answer: 'We support a growing list of trades including paving, coating, striping, concrete, landscaping, fencing, and more. New trades are added regularly based on customer needs.',
  },
  {
    question: 'Can I upload my own blueprints?',
    answer: 'Yes! You can upload PDF blueprints and our AI will analyze them to extract measurements, materials, and area calculations automatically.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. All data is encrypted in transit and at rest. We never share your customer information or bid data with third parties.',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const isAuthenticated = useIsAuthenticated();
  const { user, signOut, profile } = useAuthStore();

  // Override body overflow to allow scrolling on landing page
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.documentElement.style.overflow = 'auto';

    return () => {
      // Restore for other pages that need overflow hidden
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsSubmitting(true);
    const params = new URLSearchParams({ address: address.trim() });
    router.push(`/site?${params.toString()}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0b0b0b 0%, #151515 100%)',
      overflowX: 'hidden',
    }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image
            src={logoImage}
            alt="Rule Tool"
            width={180}
            height={50}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                style={{
                  padding: '10px 20px',
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Dashboard
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                  {profile?.full_name || user?.email?.split('@')[0]}
                </span>
                <button
                  onClick={() => signOut()}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  padding: '10px 20px',
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Sign Up Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '60px 20px 80px',
        maxWidth: '800px',
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Background image */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120%',
          height: '600px',
          backgroundImage: `url(${heroImage.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.28,
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'brightness(0.75) contrast(1.05)',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }} />
        <div style={{
          display: 'inline-block',
          padding: '6px 16px',
          background: 'rgba(59, 130, 246, 0.2)',
          borderRadius: '20px',
          fontSize: '13px',
          color: '#60a5fa',
          fontWeight: 500,
          marginBottom: '24px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          position: 'relative',
          zIndex: 1,
        }}>
          SITE-FIRST ESTIMATING
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 800,
          color: 'white',
          lineHeight: 1.1,
          margin: '0 0 20px',
          position: 'relative',
          zIndex: 1,
        }}>
          Draw once, estimate across<br />
          <span style={{ color: '#60a5fa' }}>multiple trades</span> automatically
        </h1>

        <p style={{
          fontSize: '18px',
          color: '#94a3b8',
          maxWidth: '600px',
          margin: '0 auto 40px',
          lineHeight: 1.6,
          position: 'relative',
          zIndex: 1,
        }}>
          Stop measuring the same property multiple times. Enter an address, trace your areas,
          and get instant estimates across all your trades.
        </p>

        {/* Main CTA Form */}
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          gap: '12px',
          maxWidth: '500px',
          margin: '0 auto 24px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          <input
            type="text"
            placeholder="Enter site address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSubmitting}
            style={{
              flex: '1 1 300px',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '16px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting || !address.trim()}
            style={{
              padding: '16px 32px',
              background: !address.trim() ? '#475569' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: !address.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isSubmitting ? 'Loading...' : 'Start Estimating'}
          </button>
        </form>

        <p style={{ fontSize: '14px', color: '#64748b', position: 'relative', zIndex: 1 }}>
          No signup required. Start estimating in seconds.
        </p>
      </section>

      {/* Stats Section */}
      <section style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '48px',
        padding: '40px 20px',
        flexWrap: 'wrap',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        {STATS.map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#60a5fa' }}>{stat.value}</div>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section style={{
        padding: '80px 20px',
        maxWidth: '1000px',
        margin: '0 auto',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '32px',
          fontWeight: 700,
          color: 'white',
          marginBottom: '16px',
        }}>
          How It Works
        </h2>
        <p style={{
          textAlign: 'center',
          fontSize: '16px',
          color: '#94a3b8',
          marginBottom: '48px',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Get from address to multi-trade estimate in under 5 minutes
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px',
        }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                marginBottom: '20px',
              }}>
                {step.icon}
              </div>
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '24px',
                fontSize: '48px',
                fontWeight: 800,
                color: 'rgba(255,255,255,0.05)',
              }}>
                {step.number}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6 }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        padding: '80px 20px',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: '32px',
            fontWeight: 700,
            color: 'white',
            marginBottom: '48px',
          }}>
            Built for Contractors
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
          }}>
            {FEATURES.map((feature, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section style={{
        padding: '80px 20px',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          borderRadius: '20px',
          padding: '48px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '24px', color: '#60a5fa' }}>&ldquo;</div>
          <p style={{
            fontSize: '20px',
            color: 'white',
            lineHeight: 1.6,
            marginBottom: '24px',
            fontStyle: 'italic',
          }}>
            We used to spend an hour measuring each property for different trades.
            Now I draw it once and have all my estimates in minutes. Game changer for our bid volume.
          </p>
          <div>
            <div style={{ fontWeight: 600, color: 'white' }}>Mike R.</div>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>Contractor, Texas</div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{
        padding: '80px 20px',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: '32px',
            fontWeight: 700,
            color: 'white',
            marginBottom: '48px',
          }}>
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {FAQS.map((faq, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>
                    {faq.question}
                  </span>
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#94a3b8"
                    viewBox="0 0 24 24"
                    style={{
                      transform: expandedFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                      marginLeft: '16px',
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedFaq === i && (
                  <div style={{
                    padding: '0 24px 20px',
                    fontSize: '15px',
                    color: '#94a3b8',
                    lineHeight: 1.6,
                  }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        padding: '80px 20px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: 'white',
          marginBottom: '16px',
        }}>
          Ready to estimate faster?
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#94a3b8',
          marginBottom: '32px',
        }}>
          No signup required. Enter an address and start estimating in seconds.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start Estimating Free
          </button>
          <a
            href="mailto:hello@ruletool.com?subject=Demo Request"
            style={{
              padding: '16px 32px',
              background: 'transparent',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'inline-block',
            }}
          >
            Book a Demo
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
            Dashboard
          </Link>
          <Link href="/blueprint" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
            Blueprints
          </Link>
          <a href="mailto:hello@ruletool.com" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
            Contact
          </a>
        </div>
        <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
          &copy; {new Date().getFullYear()} Rule Tool. Built for contractors.
        </p>
      </footer>
    </div>
  );
}
