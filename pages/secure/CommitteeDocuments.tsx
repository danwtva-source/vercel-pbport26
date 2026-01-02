import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecureLayout } from '../../components/Layout';
import { Badge, Card } from '../../components/UI';
import { DataService } from '../../services/firebase';
import { AdminDocument, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FileText, FolderOpen } from 'lucide-react';

const roleToUserRole = (role: string | undefined): UserRole => {
  const normalized = (role || '').toUpperCase();
  switch (normalized) {
    case 'ADMIN':
      return UserRole.ADMIN;
    case 'COMMITTEE':
      return UserRole.COMMITTEE;
    case 'APPLICANT':
      return UserRole.APPLICANT;
    default:
      return UserRole.PUBLIC;
  }
};

const CommitteeDocuments: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, loading } = useAuth();
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    if (!loading && !userProfile) {
      navigate('/login');
    }
  }, [loading, navigate, userProfile]);

  useEffect(() => {
    let isMounted = true;
    const loadDocuments = async () => {
      try {
        const docs = await DataService.getDocuments();
        if (isMounted) {
          setDocuments(docs);
        }
      } catch (error) {
        console.error('Failed to load documents', error);
      } finally {
        if (isMounted) {
          setLoadingDocs(false);
        }
      }
    };
    loadDocuments();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenDocument = (doc: AdminDocument) => {
    if (!doc.url) {
      alert('No file is attached to this document yet.');
      return;
    }
    window.open(doc.url, '_blank', 'noopener,noreferrer');
  };

  const folders = useMemo(() => documents.filter(doc => doc.type === 'folder'), [documents]);
  const files = useMemo(() => documents.filter(doc => doc.type === 'file'), [documents]);
  const folderMap = useMemo(() => new Map(folders.map(folder => [folder.id, folder])), [folders]);

  const visibleFolders = folders.filter(folder => folder.parentId === currentFolderId);
  const visibleFiles = files.filter(file => file.parentId === currentFolderId);

  const folderPath: AdminDocument[] = [];
  let cursor = currentFolderId;
  while (cursor !== 'root') {
    const folder = folderMap.get(cursor);
    if (!folder) break;
    folderPath.unshift(folder);
    cursor = folder.parentId as string;
  }

  if (loading || loadingDocs) {
    return (
      <SecureLayout userRole={roleToUserRole(userProfile?.role)}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </SecureLayout>
    );
  }

  return (
    <SecureLayout userRole={roleToUserRole(userProfile?.role)}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-900 mb-2">Committee Documents</h1>
          <p className="text-gray-600">Access committee-only resources and shared portal documents.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <button
            onClick={() => setCurrentFolderId('root')}
            className={`font-semibold ${currentFolderId === 'root' ? 'text-purple-700' : 'text-gray-600 hover:text-purple-700'}`}
          >
            All Documents
          </button>
          {folderPath.map((folder) => (
            <React.Fragment key={folder.id}>
              <span className="text-gray-400">/</span>
              <button
                onClick={() => setCurrentFolderId(folder.id)}
                className="font-semibold text-gray-600 hover:text-purple-700"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {visibleFolders.length > 0 && (
          <Card>
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
              <FolderOpen size={20} />
              Folders
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {visibleFolders.map(folder => (
                <button
                  key={folder.id}
                  className="p-4 text-left bg-amber-50 rounded-lg border border-amber-200 hover:border-amber-400 transition"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <FolderOpen className="text-amber-600" size={24} />
                    <span className="font-bold text-gray-800 truncate">{folder.name}</span>
                  </div>
                  <Badge variant="amber">{folder.category}</Badge>
                </button>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Documents ({visibleFiles.length})
          </h3>
          <div className="space-y-3">
            {visibleFiles.map(doc => (
              <div
                key={doc.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between hover:border-purple-300 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                    <FileText className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{doc.name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="gray">{doc.category}</Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenDocument(doc)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition"
                >
                  Download
                </button>
              </div>
            ))}
            {visibleFiles.length === 0 && (
              <p className="text-gray-500 text-center py-8">No documents in this folder</p>
            )}
          </div>
        </Card>
      </div>
    </SecureLayout>
  );
};

export default CommitteeDocuments;
