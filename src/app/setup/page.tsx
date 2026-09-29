'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !apiKey.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), groqApiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      // Store user info in localStorage
      localStorage.setItem('airer_userId', data.userId);
      localStorage.setItem('airer_userName', data.userName);

      router.push('/chat');
    } catch {
      setError('Failed to connect. Check your internet.');
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-logo">
          <h1>AIRER</h1>
          <p>Reconnect with your childhood friends</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="setup-field">
            <label htmlFor="setup-name">Your Name</label>
            <input
              id="setup-name"
              type="text"
              placeholder="What should your friends call you?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="setup-field">
            <label htmlFor="setup-api-key">Groq API Key</label>
            <input
              id="setup-api-key"
              type="password"
              placeholder="gsk_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <p className="field-hint">
              Get your free API key from{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
                console.groq.com/keys
              </a>
            </p>
          </div>

          {error && <p className="setup-error">{error}</p>}

          <button
            type="submit"
            className="setup-btn"
            disabled={loading || !name.trim() || !apiKey.trim()}
          >
            {loading ? 'Setting up your world...' : 'Enter the Gully ➜'}
          </button>
        </form>
      </div>
    </div>
  );
}
