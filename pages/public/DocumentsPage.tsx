import React from 'react';
import { PublicLayout } from '../../components/Layout';
import { FileText, Download, ExternalLink } from 'lucide-react';

const DOCUMENTS = [
  {
    category: "Guidance",
    items: [
      { title: "Application Guidance Notes (PDF)", desc: "Essential reading before submitting your application.", size: "1.2 MB" },
      { title: "Scoring Matrix Explained", desc: "How committee members will evaluate your project.", size: "0.8 MB" }
    ]
  },
  {
    category: "Policies & Terms",
    items: [
      { title: "Terms of Reference 2024", desc: "Rules and regulations for the Participatory Budgeting process.", size: "0.5 MB" },
      { title: "Privacy Policy", desc: "How we handle your data during the voting process.", size: "0.3 MB" }
    ]
  }
];

const DocumentsPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto py-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-900 mb-4 font-display">Documents & Resources</h1>
          <p className="text-lg text-gray-600">
            Download guidance, policy documents, and other useful resources for the Communities' Choice process.
          </p>
        </div>

        <div className="space-y-8">
          {DOCUMENTS.map((section, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-card p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-purple-800 mb-6 border-b border-purple-100 pb-2 font-display">
                {section.category}
              </h2>
              <div className="grid gap-4">
                {section.items.map((doc, dIdx) => (
                  <div key={dIdx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition group">
                    <div className="flex items-start gap-4 mb-4 sm:mb-0">
                      <div className="bg-purple-100 p-3 rounded-lg text-purple-600 group-hover:bg-white transition">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 group-hover:text-purple-700 transition">{doc.title}</h3>
                        <p className="text-sm text-gray-500">{doc.desc}</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition shadow-sm whitespace-nowrap">
                      <Download size={16} />
                      Download <span className="text-xs font-normal opacity-70 ml-1">({doc.size})</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-teal-50 rounded-2xl p-8 border border-teal-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-teal-900 font-display mb-2">Need Help?</h3>
              <p className="text-teal-700">If you need assistance with the documents or the application process, please contact the TVA team.</p>
            </div>
            <a href="mailto:dan@tvawales.org.uk" className="px-6 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition shadow-md flex items-center">
              Contact Support <ExternalLink size={16} className="ml-2"/>
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default DocumentsPage;