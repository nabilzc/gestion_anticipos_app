"use client";

import React, { useEffect, useState } from 'react';
import { runDatabaseFix } from '@/app/actions/fixDatabase';

export default function FixDbPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    runDatabaseFix()
      .then((res) => {
        if (res.success) {
          setStatus('success');
          setMessage(res.message || 'Database fix applied.');
        } else {
          setStatus('error');
          setMessage('Failed to apply database fix.');
          setDetails(res.error);
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage('Unexpected error occurred.');
        setDetails(err.message || String(err));
      });
  }, []);

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '50px auto', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
        Supabase Database Fix Console
      </h1>
      
      {status === 'loading' && (
        <div style={{ color: '#2563eb', fontWeight: '600' }}>
          Connecting to Supabase and applying fix... Please wait.
        </div>
      )}

      {status === 'success' && (
        <div>
          <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '8px', fontWeight: '600', marginBottom: '16px' }}>
            ✓ Success: {message}
          </div>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            The missing column has been added to the database and the cache has been reloaded. You can now go back and submit your form.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontWeight: '600', marginBottom: '16px' }}>
            ✗ Error: {message}
          </div>
          <div style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details)}
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '16px' }}>
            Please make sure your Supabase connection settings are correct and your database is online.
          </p>
        </div>
      )}
    </div>
  );
}
