import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/Layout';
import { FileText, Download, ExternalLink, Filter, BookOpen, Info } from 'lucide-react';
import { PUBLIC_DOCS } from '../../constants';
import { DataService } from '../../services/firebase';
import { DocumentFolder, DocumentItem } from '../../types';

type CategoryFilter = 'All' | 'Part 1' | 'Part 2';

const DocumentsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadDocuments = async () => {
      try {
        const [docsData, folderData] = await Promise.all([
          DataService.getDocuments({ visibility: 'public' }),
          DataService.getDocumentFolders('public')
        ]);
        if (isMounted) {
          setDocuments(docsData);
          setFolders(folderData);
        }
      } catch (error) {
        console.error('Failed to load public documents:', error);
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

  const usingFallback = documents.length === 0;
  const filteredDocs = usingFallback
    ? (selectedCategory === 'All'
      ? PUBLIC_DOCS
      : PUBLIC_DOCS.filter(doc => doc.category === selectedCategory))
    : documents;

  const categories: CategoryFilter[] = ['All', 'Part 1', 'Part 2'];

  const getCategoryCount = (category: CategoryFilter) => {
    if (category === 'All') return PUBLIC_DOCS.length;
    return PUBLIC_DOCS.filter(doc => doc.category === category).length;
  };

  const folderLookup = useMemo(() => new Map(folders.map(folder => [folder.id, folder.name])), [folders]);

  const isSeedDoc = (doc: DocumentItem | (typeof PUBLIC_DOCS)[number]): doc is (typeof PUBLIC_DOCS)[number] => {
    return (doc as (typeof PUBLIC_DOCS)[number]).title !== undefined;
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

        {/* Category Filter */}
        {usingFallback && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Filter size={20} className="text-purple-600" />
              <h2 className="text-lg font-bold text-purple-900">Filter by Stage</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {categories.map((category) => {
                const isSelected = selectedCategory === category;
                const count = getCategoryCount(category);

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white text-purple-700 border-2 border-purple-200 hover:border-purple-400'
                    }`}
                  >
                    {category}
                    <span className={`ml-2 text-sm ${isSelected ? 'text-purple-200' : 'text-purple-500'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents Grid */}
        <div className="space-y-4 mb-12">
          {loading ? (
            <div className="text-center py-12 bg-purple-50 rounded-xl border-2 border-purple-200">
              <FileText size={48} className="text-purple-300 mx-auto mb-4" />
              <p className="text-purple-600 font-semibold">Loading documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12 bg-purple-50 rounded-xl border-2 border-purple-200">
              <FileText size={48} className="text-purple-300 mx-auto mb-4" />
              <p className="text-purple-600 font-semibold">No documents found in this category</p>
            </div>
          ) : (
            filteredDocs.map((doc, index) => (
              (() => {
                const isSeed = isSeedDoc(doc as DocumentItem | (typeof PUBLIC_DOCS)[number]);
                const title = isSeed ? (doc as (typeof PUBLIC_DOCS)[number]).title : (doc as DocumentItem).name;
                const url = isSeed ? (doc as (typeof PUBLIC_DOCS)[number]).url : (doc as DocumentItem).url;
                const description = isSeed
                  ? (doc as (typeof PUBLIC_DOCS)[number]).desc
                  : ((doc as DocumentItem).folderId && folderLookup.get((doc as DocumentItem).folderId || ''))
                    ? `Folder: ${folderLookup.get((doc as DocumentItem).folderId || '')}`
                    : 'Shared document';
                const badgeLabel = isSeed
                  ? (doc as (typeof PUBLIC_DOCS)[number]).category
                  : ((doc as DocumentItem).folderId && folderLookup.get((doc as DocumentItem).folderId || ''))
                    ? folderLookup.get((doc as DocumentItem).folderId || '')
                    : 'General';
                const badgeClass = isSeed && (doc as (typeof PUBLIC_DOCS)[number]).category === 'Part 1'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-teal-100 text-teal-700';

                if (!url) {
                  return null;
                }

                return (
              <div
                key={index}
                className="bg-white border-2 border-purple-200 hover:border-purple-400 rounded-xl p-6 transition-all hover:shadow-lg group"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center ${
                    isSeed && (doc as (typeof PUBLIC_DOCS)[number]).category === 'Part 1'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-teal-100 text-teal-600'
                  }`}>
                    <FileText size={28} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-purple-900 mb-1 font-display group-hover:text-purple-700 transition-colors">
                          {title}
                        </h3>
                        <p className="text-purple-700 text-sm leading-relaxed mb-3">
                          {description}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${
                            badgeClass
                          }`}>
                            {badgeLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 group"
                  >
                    <Download size={18} />
                    <span className="hidden sm:inline">Download</span>
                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
              </div>
                );
              })()
            ))
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
            <Link
              to="/priorities"
              className="bg-teal-500 hover:bg-teal-400 text-purple-950 px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2"
            >
              <BookOpen size={20} />
              View Community Priorities
            </Link>
            <Link
              to="/"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold transition-all inline-flex items-center justify-center gap-2"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default DocumentsPage;
