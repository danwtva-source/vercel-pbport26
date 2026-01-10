// UserManagement.tsx - Legacy stub
// User management is now handled through AdminConsole.tsx
// This file is kept for backwards compatibility

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils';

const UserManagement: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to AdminConsole where user management is implemented
    navigate(ROUTES.PORTAL.ADMIN);
  }, [navigate]);

  return (
    <div className="p-8 text-center text-gray-500">
      Redirecting to Admin Console...
    </div>
  );
};

export default UserManagement;
