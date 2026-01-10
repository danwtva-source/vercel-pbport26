import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Eye, FolderOpen, AlertCircle } from 'lucide-react';
import { SecureLayout } from '../../components/Layout';
import { DataService } from '../../services/firebase';
import { Badge, Card } from '../../components/UI';
import { DocumentFolder, DocumentItem, User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ROUTES, toUserRole } from '../../utils';
import { COMMITTEE_DOCS } from '../../constants';

const DocumentsPortal: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      try {
        const userRole = toUserRole(userProfile.role);
        const isAdminUser = userRole === UserRole.ADMIN;

        // Admins can see all documents, committee can see public + committee
        if (isAdminUser) {
          // For admins, fetch all documents without visibility filter
          const [allDocs, allFolders] = await Promise.all([
            DataService.getDocuments(),
            DataService.getDocumentFolders()
          ]);
          setDocuments(allDocs);
          setFolders(allFolders);
        } else {
          // For committee members, fetch public and committee documents separately
          const [publicDocs, committeeDocs, publicFolders, committeeFolders] = await Promise.all([
            DataService.getDocuments({ visibility: 'public' }),
            DataService.getDocuments({ visibility: 'committee' }),
            DataService.getDocumentFolders('public'),
            DataService.getDocumentFolders('committee')
          ]);

          // Combine results and deduplicate by id
          const allDocs = [...publicDocs, ...committeeDocs];
          const uniqueDocs = Array.from(new Map(allDocs.map(doc => [doc.id, doc])).values());

          const allFolders = [...publicFolders, ...committeeFolders];
          const uniqueFolders = Array.from(new Map(allFolders.map(folder => [folder.id, folder])).values());

          setDocuments(uniqueDocs);
          setFolders(uniqueFolders);
        }
      } catch (error) {
        console.error('Error loading documents:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load documents';
        setError(errorMessage);
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
  const isAdmin = userRole === UserRole.ADMIN;
  const usingFallback = documents.length === 0 && !error;
  const hasDocuments = documents.length > 0;

  const folderLookup = useMemo(() => new Map(folders.map(folder => [folder.id, folder.name])), [folders]);

  // Use fallback documents if no documents are loaded from Firestore
  const displayDocs = useMemo(() => {
    if (hasDocuments) {
      return documents;
    }
    // Return empty array - fallback documents will be shown separately
    return [];
  }, [documents, hasDocuments]);

  return (
    <SecureLayout userRole={userRole}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-900 mb-2">Committee Documents</h1>
          <p className="text-gray-600">Access committee-only and public resources in one place.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <p className="font-semibold">Error loading documents</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
            >
              Reload Page
            </button>
          </div>
        )}

        {usingFallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="w-5 h-5" />
              <p className="font-semibold">No documents uploaded yet</p>
            </div>
            <p className="text-amber-700 text-sm mt-1">
              {isAdmin
                ? 'Upload committee documents and public guidance in the Admin Console to make them available here.'
                : 'No documents have been uploaded yet. Check back later or contact an administrator.'}
            </p>
            {isAdmin && (
              <Link
                to={ROUTES.PORTAL.ADMIN}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition"
              >
                Go to Admin Console
              </Link>
            )}
          </div>
        )}

        <Card>
          <div className="space-y-4">
            {displayDocs.length === 0 && !error && !usingFallback && (
              <div className="text-center text-gray-500 py-8">Loading documents...</div>
            )}
            {displayDocs.map(doc => (
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
