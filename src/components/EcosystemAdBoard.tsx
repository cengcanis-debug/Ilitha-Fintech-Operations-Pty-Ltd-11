// File: src/components/EcosystemAdBoard.tsx

import React from 'react';

interface AdResource {
  id: string;
  title: string;
  description: string;
  targetUrl: string;
  buttonText: string;
  badgeText: 'EMS RESOURCE' | 'CAREER BOOSTER' | 'FICA SECURE';
}

export const EcosystemAdBoard: React.FC = () => {
  // Configured with non-intrusive internal resources to protect pilot integrity
  const activeResources: AdResource[] = [
    {
      id: 'res-zatax',
      title: 'ZAtax Business Compliance Monitor',
      description: 'Is your family’s small business fully SARS-compliant? Run a free, real-time Tax PIN check in 10 seconds.',
      targetUrl: 'https://zatax.ilithafintech.co.za', // Mapped subdomain
      buttonText: 'Run Free Tax Check',
      badgeText: 'EMS RESOURCE',
    },
    {
      id: 'res-ispan',
      title: 'Sifuna Ispan Mzantsi Job Matching',
      description: 'Match your verified qualifications and certificates directly with active corporate and municipal SBD tenders.',
      targetUrl: 'https://ispan.ilithafintech.co.za',
      buttonText: 'Upload CV / Find Work',
      badgeText: 'CAREER BOOSTER',
    }
  ];

  return (
    <div style={{ padding: '16px', backgroundColor: '#022c22', borderRadius: '8px', border: '1px solid #10b981' }}>
      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#a7f3d0', fontWeight: 'bold', letterSpacing: '1px' }}>
        📢 INTERNAL ACADEMIC & CAREER RESOURCES
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {activeResources.map((res) => (
          <div key={res.id} style={{ backgroundColor: '#064e3b', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'inline-block', backgroundColor: '#10b981', color: '#022c22', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', marginBottom: '8px' }}>
                {res.badgeText}
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#ffffff' }}>{res.title}</h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#d1fae5', lineHeight: '1.4' }}>{res.description}</p>
            </div>
            <a 
              href={res.targetUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'inline-block', textAlign: 'center', backgroundColor: '#34d399', color: '#022c22', textDecoration: 'none', padding: '8px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}
            >
              {res.buttonText}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
