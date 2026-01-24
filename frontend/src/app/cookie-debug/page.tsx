'use client';

import { useState, useEffect } from 'react';
import { UserProfile } from '@/contexts/AuthContext';

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  port: number;
  localai: {
    base_url: string;
    webhook_enabled: boolean;
    webhook_path: string;
    public_base_url: string;
    long_term_memory: boolean;
  };
  message: string;
}

type AuthSuccessResponse = {
  success: true;
  user: UserProfile;
  tokens?: {
    access_token: string;
    refresh_token: string;
  };
};

type AuthErrorResponse = {
  success: false;
  error: string;
};

type TestResult = {
  status: number;
  success: boolean;
  data: AuthSuccessResponse | AuthErrorResponse | HealthResponse;
  timestamp: string;
  action?: string;
  register_error?: AuthSuccessResponse | AuthErrorResponse;
} | {
  error: string;
  timestamp: string;
  action?: string;
};

export default function CookieDebug() {
  const [debugInfo, setDebugInfo] = useState<{all_cookies: string; has_access_token: boolean; has_refresh_token: boolean; timestamp: string} | null>(null);
  const [testResults, setTestResults] = useState<TestResult | null>(null);

  useEffect(() => {
    // Check cookies in browser
    const cookies = document.cookie;
    setDebugInfo({
      all_cookies: cookies,
      has_access_token: cookies.includes('accessToken'),
      has_refresh_token: cookies.includes('refreshToken'),
      timestamp: new Date().toISOString()
    });
  }, []);

  const testProfileEndpoint = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/auth/profile', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setTestResults({
        status: response.status,
        success: response.ok,
        data: data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setTestResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };

  const testBackendHealth = async () => {
    try {
      const response = await fetch('http://localhost:4000/health', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      setTestResults({
        action: 'health_check',
        status: response.status,
        success: response.ok,
        data: data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setTestResults({
        action: 'health_check',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };

  const testLoginEndpoint = async () => {
    try {
      // First, let's try registering a new user to ensure we have valid credentials
      const registerResponse = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        })
      });

      const registerData = await registerResponse.json();

      if (registerResponse.ok) {
        setTestResults({
          action: 'register',
          status: registerResponse.status,
          success: true,
          data: registerData,
          timestamp: new Date().toISOString()
        });
      } else {
        // If registration fails (user might already exist), try login
        const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          })
        });

        const loginData = await loginResponse.json();
        setTestResults({
          action: 'login',
          status: loginResponse.status,
          success: loginResponse.ok,
          data: loginData,
          register_error: registerData,
          timestamp: new Date().toISOString()
        });
      }

      // Refresh debug info after login/register
      setTimeout(() => {
        const cookies = document.cookie;
        setDebugInfo({
          all_cookies: cookies,
          has_access_token: cookies.includes('accessToken'),
          has_refresh_token: cookies.includes('refreshToken'),
          timestamp: new Date().toISOString()
        });
      }, 100);
    } catch (error) {
      setTestResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Cookie & Authentication Debug</h1>

      <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Browser Cookies</h2>
          <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          <button
            onClick={() => {
              const cookies = document.cookie;
              setDebugInfo({
                all_cookies: cookies,
                has_access_token: cookies.includes('accessToken'),
                has_refresh_token: cookies.includes('refreshToken'),
                timestamp: new Date().toISOString()
              });
            }}
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Refresh Cookie Info
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test Endpoints</h2>
          <div className="space-x-4 mb-4">
            <button
              onClick={testBackendHealth}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Test Backend Health
            </button>
            <button
              onClick={testLoginEndpoint}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            >
              Test Register/Login
            </button>
            <button
              onClick={testProfileEndpoint}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
            >
              Test Profile
            </button>
          </div>

          {testResults && (
            <div className="bg-gray-900 p-4 rounded">
              <h3 className="text-lg font-semibold mb-2">Test Results</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Click "Test Backend Health" to verify backend connectivity</li>
            <li>Click "Test Register/Login" to create a user or log in and set cookies</li>
            <li>Click "Refresh Cookie Info" to see if cookies were set</li>
            <li>Click "Test Profile" to see if authentication works</li>
            <li>Refresh the page (F5) and repeat steps 3-4 to test persistence</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
