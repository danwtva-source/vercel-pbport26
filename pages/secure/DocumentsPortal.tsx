import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, FolderOpen } from 'lucide-react';
import { SecureLayout } from '../../components/Layout';
import { DataService } from '../../services/firebase';
import { Badge, Card } from '../../components/UI';
import { DocumentFolder, DocumentItem, User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ROUTES, toUserRole } from '../../utils';

const DocumentsPortal: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!userProfile) {
      navigate(ROUTES.PUBLIC.LOGIN);
      return;
    }

    setCurrentUser(userProfile);

    const loadDocuments = async () => {
      setLoading(true);
      try {
        const [docsData, folderData] = await Promise.all([
          DataService.getDocuments({ visibility: ['public', 'committee'] }),
          DataService.getDocumentFolders(['public', 'committee'])
        ]);
        setDocuments(docsData);
        setFolders(folderData);
      } catch (error) {
        console.error('Error loading committee documents:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadDocuments();
  }, [authLoading, userProfile, navigate]);

  // Show loading state while auth is resolving or data is loading
  if (authLoading || !currentUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold">Loading documents...</p>
        </div>
      </div>
    );
  }

  const userRole = toUserRole(currentUser.role);

  const folderLookup = useMemo(() => new Map(folders.map(folder => [folder.id, folder.name])), [folders]);

  return (
    <SecureLayout userRole={userRole}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-900 mb-2">Committee Documents</h1>
          <p className="text-gray-600">Access committee-only and public resources in one place.</p>
        </div>

        <Card>
          <div className="space-y-4">
            {documents.length === 0 && (
              <div className="text-center text-gray-500 py-8">No documents available yet.</div>
            )}
              {documents.map(doc => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                      <FileText className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{doc.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="gray">{doc.visibility}</Badge>
                        {doc.folderId && doc.folderId !== 'root' && (
                          <Badge variant="amber">
                            <FolderOpen size={12} className="mr-1" />
                            {folderLookup.get(doc.folderId) || 'Folder'}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold transition"
                    >
                      <Eye size={16} />
                      View
                    </a>
                  )}
                </div>
              ))}
          </div>
        </Card>
      </div>
    </SecureLayout>
  );
};

export default DocumentsPortal;
