import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecureLayout } from '../../components/Layout';
import { Card, Button, Input, Badge } from '../../components/UI';
import { DataService, uploadProfileImage, deleteProfileImage } from '../../services/firebase';
import { User, UserRole } from '../../types';
import {
  User as UserIcon,
  Camera,
  Save,
  Mail,
  Phone,
  MapPin,
  Shield,
  FileText,
  Key,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// Helper to convert lowercase role string to UserRole enum
const roleToUserRole = (role: string | undefined): UserRole => {
  const normalized = (role || '').toUpperCase();
  switch (normalized) {
    case 'ADMIN': return UserRole.ADMIN;
    case 'COMMITTEE': return UserRole.COMMITTEE;
    case 'APPLICANT': return UserRole.APPLICANT;
    default: return UserRole.PUBLIC;
  }
};

const UserSettings: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    phone: '',
    address: '',
    photoUrl: ''
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const user = DataService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    setProfile({
      displayName: user.displayName || user.username || '',
      bio: user.bio || '',
      phone: user.phone || '',
      address: user.address || '',
      photoUrl: user.photoUrl || ''
    });
    setLoading(false);
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    setSaving(true);
    setMessage(null);

    try {
      await DataService.updateUser({
        ...currentUser,
        displayName: profile.displayName,
        bio: profile.bio,
        phone: profile.phone,
        address: profile.address,
        photoUrl: profile.photoUrl
      });

      // Update local state
      const updatedUser = { ...currentUser, ...profile };
      setCurrentUser(updatedUser);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file.' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Delete old profile image if exists
      if (profile.photoUrl && profile.photoUrl.includes('firebasestorage')) {
        await deleteProfileImage(profile.photoUrl);
      }

      // Upload new image to Firebase Storage
      const imageUrl = await uploadProfileImage(currentUser.uid, file);

      // Update local profile state
      setProfile({ ...profile, photoUrl: imageUrl });

      // Save to Firestore immediately
      await DataService.updateUser({
        ...currentUser,
        photoUrl: imageUrl
      });

      // Update local user state
      setCurrentUser({ ...currentUser, photoUrl: imageUrl });

      setMessage({ type: 'success', text: 'Profile photo updated successfully!' });
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setChangingPassword(true);
    setMessage(null);

    try {
      await DataService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Failed to change password. Check your current password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || !currentUser) {
    return (
      <SecureLayout userRole={UserRole.PUBLIC}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </SecureLayout>
    );
  }

  const userRole = roleToUserRole(currentUser.role);

  return (
    <SecureLayout userRole={userRole}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-3 rounded-xl">
            <UserIcon className="text-purple-700" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-purple-900">Account Settings</h1>
            <p className="text-gray-600">Manage your profile and preferences</p>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Profile Card */}
        <Card>
          <h2 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-2">
            <UserIcon size={24} />
            Profile Information
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Profile Photo */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {(profile.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition"
                >
                  <Camera size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              <p className="mt-3 text-sm text-gray-500">Click to upload photo</p>
              <Badge className="mt-2" variant={userRole === UserRole.ADMIN ? 'red' : userRole === UserRole.COMMITTEE ? 'purple' : 'blue'}>
                {currentUser.role}
              </Badge>
            </div>

            {/* Profile Fields */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Display Name"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  placeholder="Your display name"
                />
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <Mail size={14} className="inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <Phone size={14} className="inline mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="Your phone number"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                  />
                </div>
                {currentUser.area && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <MapPin size={14} className="inline mr-1" />
                      Assigned Area
                    </label>
                    <input
                      type="text"
                      value={currentUser.area}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <MapPin size={14} className="inline mr-1" />
                  Address
                </label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Your address"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <FileText size={14} className="inline mr-1" />
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us a bit about yourself..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Security Card */}
        <Card>
          <h2 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-2">
            <Shield size={24} />
            Security
          </h2>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Key size={18} />
                Change Password
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={handleChangePassword}
                  disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Account Info Card */}
        <Card>
          <h2 className="text-xl font-bold text-purple-900 mb-4">Account Information</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">User ID</p>
              <p className="font-mono font-bold text-gray-800">{currentUser.uid}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Role</p>
              <p className="font-bold text-gray-800 capitalize">{currentUser.role}</p>
            </div>
            {currentUser.createdAt && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Member Since</p>
                <p className="font-bold text-gray-800">{new Date(currentUser.createdAt).toLocaleDateString()}</p>
              </div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Status</p>
              <p className="font-bold text-green-600">Active</p>
            </div>
          </div>
        </Card>
      </div>
    </SecureLayout>
  );
};

export default UserSettings;
