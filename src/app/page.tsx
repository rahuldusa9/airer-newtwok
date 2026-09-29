'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user exists in localStorage
    const userId = localStorage.getItem('airer_userId');
    if (userId) {
      // Verify user exists in DB
      fetch(`/api/setup?userId=${userId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.exists) {
            router.replace('/chat');
          } else {
            localStorage.removeItem('airer_userId');
            router.replace('/setup');
          }
        })
        .catch(() => {
          router.replace('/setup');
        });
    } else {
      router.replace('/setup');
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  );
}
