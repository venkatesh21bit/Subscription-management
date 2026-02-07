// filepath: frontend/app/manufacturer/profile/page.tsx
"use client";
import { apiClient } from '@/utils/api';
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Clock, Building2 } from 'lucide-react';

interface UserDetails {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface CompanyInfo {
  id: string;
  name: string;
  code: string;
}

const ProfileTab = () => {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch user details from correct endpoint
        const userResponse = await apiClient.get<UserDetails>("/users/me/");
        if (userResponse.data) {
          setUserDetails(userResponse.data);
        } else if (userResponse.error) {
          setError(userResponse.error);
        }

        // Get company info from localStorage
        const companyId = localStorage.getItem('company_id');
        const companyName = localStorage.getItem('company_name');
        const companyCode = localStorage.getItem('company_code');
        if (companyId) {
          setCompany({
            id: companyId,
            name: companyName || '',
            code: companyCode || '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3">Loading profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="max-w-2xl mx-auto bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="p-6 border-b border-neutral-800">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-neutral-400 mt-1">Manage your account details</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {/* User Info Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center mb-6">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold">
              {userDetails?.full_name?.charAt(0)?.toUpperCase() || userDetails?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-semibold">{userDetails?.full_name || 'User'}</h2>
              <p className="text-neutral-400">{userDetails?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-neutral-400 mt-0.5" />
              <div>
                <p className="text-sm text-neutral-400">Full Name</p>
                <p className="text-white font-medium">{userDetails?.full_name || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-neutral-400 mt-0.5" />
              <div>
                <p className="text-sm text-neutral-400">Email</p>
                <p className="text-white font-medium">{userDetails?.email || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-neutral-400 mt-0.5" />
              <div>
                <p className="text-sm text-neutral-400">Phone</p>
                <p className="text-white font-medium">{userDetails?.phone || '—'}</p>
                {userDetails?.phone_verified && (
                  <span className="inline-block bg-green-900/30 text-green-400 text-xs px-2 py-0.5 rounded mt-1">
                    Verified
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-neutral-400 mt-0.5" />
              <div>
                <p className="text-sm text-neutral-400">Member Since</p>
                <p className="text-white font-medium">
                  {userDetails?.created_at ? formatDate(userDetails.created_at) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Card */}
        {company && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-400" />
              Company Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-neutral-400">Company Name</p>
                <p className="text-white font-medium">{company.name}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Company Code</p>
                <p className="text-white font-medium">{company.code || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Account Security */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            Account Security
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-neutral-400">Phone Verification</p>
              <p className={`font-medium ${userDetails?.phone_verified ? 'text-green-400' : 'text-yellow-400'}`}>
                {userDetails?.phone_verified ? 'Verified' : 'Not Verified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Last Updated</p>
              <p className="text-white font-medium">
                {userDetails?.updated_at ? formatDate(userDetails.updated_at) : '—'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileTab;