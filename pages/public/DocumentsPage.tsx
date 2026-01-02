import React, { useEffect, useMemo, useState } from 'react';
import { PublicLayout } from '../../components/Layout';
import { Badge, Card } from '../../components/UI';
import { FileText, BookOpen, Info, FolderOpen, Download } from 'lucide-react';
import { DataService } from '../../services/firebase';
import { AdminDocument } from '../../types';

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadDocuments = async () => {
      try {
        const docs = await DataService.getPublicDocuments();
        if (isMounted) {
          setDocuments(docs);
        }
      } catch (error) {
        console.error('Failed to load documents', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadDocuments();
    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleDownload = (doc: AdminDocument) => {
    if (!doc.url) {
      alert('No file is attached to this document yet.');
      return;
    }
    window.open(doc.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 rounded-full px-4 py-2 mb-4">
            <BookOpen size={18} className="text-purple-600" />
            <span className="text-sm font-bold text-purple-800">Application Resources</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-purple-900 mb-4 font-display">
            Documents & Guidance
          </h1>

          <p className="text-lg text-purple-700 max-w-3xl mx-auto leading-relaxed">
            Everything you need to submit a successful application. Download forms, guidance documents, and resources for the Communities' Choice process.
          </p>
        </div>

        {/* Process Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl p-6">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">1</span>
            </div>
            <h3 className="text-xl font-bold text-purple-900 mb-2 font-display">Part 1: Expression of Interest</h3>
            <p className="text-purple-700 text-sm leading-relaxed mb-4">
              Submit a brief EOI form outlining your project idea. All groups start here. The committee will review and shortlist projects to proceed to Part 2.
            </p>
            <div className="inline-flex items-center gap-2 bg-purple-100 rounded-lg px-3 py-1 text-xs font-bold text-purple-700">
              <Info size={14} />
              Initial screening stage
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-white border-2 border-teal-200 rounded-xl p-6">
            <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">2</span>
            </div>
            <h3 className="text-xl font-bold text-purple-900 mb-2 font-display">Part 2: Full Application</h3>
            <p className="text-purple-700 text-sm leading-relaxed mb-4">
              Shortlisted projects complete a detailed application with budget, delivery plan, and evidence of need. These are scored by committees and go to public vote.
            </p>
            <div className="inline-flex items-center gap-2 bg-teal-100 rounded-lg px-3 py-1 text-xs font-bold text-teal-700">
              <Info size={14} />
              For shortlisted projects only
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-6 mb-12">
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

          {loading ? (
            <div className="text-center py-12 bg-purple-50 rounded-xl border-2 border-purple-200">
              <FileText size={48} className="text-purple-300 mx-auto mb-4" />
              <p className="text-purple-600 font-semibold">Loading documents...</p>
            </div>
          ) : (
            <>
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
                      className="p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between hover:border-purple-300 transition"
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
                        onClick={() => handleDownload(doc)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition"
                      >
                        <Download size={16} />
                        Download
                      </button>
                    </div>
                  ))}
                  {visibleFiles.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No documents in this folder</p>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-8 mb-8">
          <div className="flex gap-4">
            <Info size={24} className="text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-purple-900 mb-3 font-display">Need Help?</h3>
              <p className="text-purple-700 mb-4 leading-relaxed">
                If you need assistance completing your application or have questions about the process, support is available. Read the guidance documents carefully before submitting your application.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="font-bold text-purple-900 mb-1">Application Guidance</p>
                  <p className="text-purple-600">Step-by-step instructions for both Part 1 and Part 2 applications</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="font-bold text-purple-900 mb-1">Budget Templates</p>
                  <p className="text-purple-600">Downloadable templates to help structure your project budget</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 text-white rounded-2xl p-8 md:p-10 shadow-xl text-center">
          <h2 className="text-3xl font-bold mb-4 font-display">Ready to Submit Your Application?</h2>
          <p className="text-lg text-purple-100 mb-6 leading-relaxed max-w-2xl mx-auto">
            Before you start, make sure you've reviewed the priorities for your area and downloaded the relevant guidance documents.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/priorities"
              className="bg-teal-500 hover:bg-teal-400 text-purple-950 px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2"
            >
              <BookOpen size={20} />
              View Community Priorities
            </a>
            <a
              href="/"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold transition-all inline-flex items-center justify-center gap-2"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default DocumentsPage;
