'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="max-w-md w-full bg-gray-800 shadow-lg rounded-lg p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">!</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Something went wrong!
            </h2>
            <p className="text-gray-300 mb-6">
              An unexpected error occurred. We&apos;ve been notified.
            </p>
            <button
              onClick={() => reset()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
