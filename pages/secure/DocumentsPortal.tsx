import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Eye, FolderOpen } from 'lucide-react';
import { SecureLayout } from '../../components/Layout';
import { DataService } from '../../services/firebase';
import { Badge, Card } from '../../components/UI';
import { DocumentFolder, DocumentItem, User, UserRole } from '../../types';

const DocumentsPortal: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderSlug, setSelectedFolderSlug] = useState(() => searchParams.get('folder') ?? '');

  useEffect(() => {
    const user = DataService.getCurrentUser();
    setCurrentUser(user);
    if (!user) {
      navigate('/login');
      return;
    }

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
  }, [navigate]);

  useEffect(() => {
    setSelectedFolderSlug(searchParams.get('folder') ?? '');
  }, [searchParams]);

  if (!currentUser) {
    return null;
  }

  const userRole = currentUser.role === 'applicant' ? UserRole.APPLICANT :
    currentUser.role === 'committee' ? UserRole.COMMITTEE :
    currentUser.role === 'admin' ? UserRole.ADMIN :
    currentUser.role === 'community' ? UserRole.COMMUNITY :
    UserRole.PUBLIC;

  const folderById = useMemo(() => new Map(folders.map(folder => [folder.id, folder])), [folders]);
  const folderBySlug = useMemo(
    () => new Map(folders.filter(folder => folder.slug).map(folder => [folder.slug, folder])),
    [folders]
  );
  const selectedFolder = selectedFolderSlug ? folderBySlug.get(selectedFolderSlug) : undefined;
  const filteredDocuments = useMemo(() => {
    if (!selectedFolderSlug) return documents;
    if (!selectedFolder) return [];
    return documents.filter((doc) => doc.folderId === selectedFolder.id);
  }, [documents, selectedFolder, selectedFolderSlug]);

  const handleFolderFilterChange = (slug: string) => {
    setSelectedFolderSlug(slug);
    const nextParams = new URLSearchParams(searchParams);
    if (slug) {
      nextParams.set('folder', slug);
    } else {
      nextParams.delete('folder');
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <SecureLayout userRole={userRole}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-purple-900 mb-2">Committee Documents</h1>
          <p className="text-gray-600">Access committee-only and public resources in one place.</p>
        </div>

        {loading ? (
          <Card className="p-8 text-center text-gray-500">Loading documents...</Card>
        ) : (
          <Card>
            <div className="space-y-4">
              {folders.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 border-b border-gray-200 pb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Filter by folder</label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
                      value={selectedFolderSlug}
                      onChange={(event) => handleFolderFilterChange(event.target.value)}
                    >
                      <option value="">All folders</option>
                      {folders.filter(folder => folder.slug).map(folder => (
                        <option key={folder.id} value={folder.slug}>
                          {folder.name} ({folder.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedFolder?.slug && (
                    <div className="text-xs text-gray-500">
                      Slug: <span className="font-semibold text-gray-700">{selectedFolder.slug}</span>
                    </div>
                  )}
                </div>
              )}
              {filteredDocuments.length === 0 && (
                <div className="text-center text-gray-500 py-8">No documents available yet.</div>
              )}
              {filteredDocuments.map(doc => {
                const folderMeta = doc.folderId ? folderById.get(doc.folderId) : undefined;
                return (
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
                            <Badge variant="amber" title={folderMeta?.slug ? `Slug: ${folderMeta.slug}` : undefined}>
                              <FolderOpen size={12} className="mr-1" />
                              {folderMeta?.name || 'Folder'}
                              {folderMeta?.slug && (
                                <span className="ml-1 text-[10px] font-semibold opacity-70">/{folderMeta.slug}</span>
                              )}
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
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </SecureLayout>
  );
};

export default DocumentsPortal;
