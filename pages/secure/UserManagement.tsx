import React, { useState } from 'react';
import { useUsers, updateUserProfile } from '../../services/firebase';
import { UserProfile, UserRole } from '../../types';

const UserManagement: React.FC = () => {
  const { users, loading, error, refresh } = useUsers();
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = async (userId: string, data: Partial<UserProfile>) => {
    try {
      await updateUserProfile(userId, data);
      setEditingUser(null);
      refresh(); 
    } catch (err) { alert('Failed to update user'); }
  };

  const filtered = users?.filter(u => u.email.includes(searchTerm) || u.displayName?.includes(searchTerm)) || [];

  if (loading) return <div className="p-8 text-center">Loading users...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700">Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded shadow-sm border"><input type="text" placeholder="Search..." className="w-full p-2 border rounded" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
      <div className="bg-white shadow rounded overflow-hidden border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Role</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Area</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map(user => (
              <tr key={user.uid} className="hover:bg-gray-50">
                <td className="px-6 py-4"><div className="font-medium text-gray-900">{user.displayName||'No Name'}</div><div className="text-sm text-gray-500">{user.email}</div></td>
                {editingUser?.uid === user.uid ? (
                  <>
                    <td className="px-6 py-4"><select id={`role-${user.uid}`} defaultValue={user.role} className="border rounded p-1"><option value="applicant">Applicant</option><option value="committee">Committee</option><option value="admin">Admin</option></select></td>
                    <td className="px-6 py-4"><select id={`area-${user.uid}`} defaultValue={user.areaId||''} className="border rounded p-1"><option value="">-- None --</option><option value="TUC">TUC</option><option value="TPS">TPS</option><option value="BLN">BLN</option></select></td>
                    <td className="px-6 py-4 text-right"><button onClick={()=>{
                        const role = (document.getElementById(`role-${user.uid}`) as any).value;
                        const areaId = (document.getElementById(`area-${user.uid}`) as any).value;
                        handleSave(user.uid, { role, areaId });
                    }} className="text-green-600 font-bold mr-2">Save</button><button onClick={()=>setEditingUser(null)} className="text-gray-500">Cancel</button></td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded bg-gray-100 font-bold">{user.role.toUpperCase()}</span></td>
                    <td className="px-6 py-4 text-sm">{user.areaId || '-'}</td>
                    <td className="px-6 py-4 text-right"><button onClick={()=>setEditingUser(user)} className="text-indigo-600 font-medium">Edit</button></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default UserManagement;
