import React, { useState } from 'react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}
export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
  const base = "font-dynapuff rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-brand-purple hover:bg-brand-darkPurple text-white shadow-lg shadow-purple-200",
    secondary: "bg-brand-teal hover:bg-brand-darkTeal text-white shadow-lg shadow-teal-200",
    outline: "border-2 border-brand-purple text-brand-purple hover:bg-brand-light",
    danger: "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-brand-purple"
  };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-6 py-3 text-base", lg: "px-8 py-4 text-lg font-bold" };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl shadow-xl border border-purple-50 p-6 ${onClick ? 'cursor-pointer hover:-translate-y-1 transition-transform' : ''} ${className}`}>{children}</div>
);

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; }
export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-bold text-gray-700 mb-2 font-dynapuff">{label}</label>}
    <input className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-purple focus:ring-4 focus:ring-purple-100 outline-none transition-all font-arial ${className}`} {...props} />
  </div>
);

// --- Rich Text Area ---
export const RichTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; maxWords?: number }> = ({ label, maxWords, value, className = '', ...props }) => {
  const wordCount = typeof value === 'string' && value.trim() ? value.trim().split(/\s+/).length : 0;
  const isOver = maxWords ? wordCount > maxWords : false;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-2">
        {label && <label className="block text-sm font-bold text-gray-700 font-dynapuff">{label}</label>}
        {maxWords && (
          <span className={`text-xs font-bold ${isOver ? 'text-red-600' : 'text-gray-400'}`}>
            {wordCount} / {maxWords} words
          </span>
        )}
      </div>
      <textarea
        className={`w-full px-4 py-3 rounded-xl border ${isOver ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:border-brand-purple focus:ring-purple-100'} focus:ring-4 outline-none transition-all font-arial ${className}`}
        value={value}
        {...props}
      />
    </div>
  );
};

// --- File Upload ---
export const FileUpload: React.FC<{
  label: string;
  accept?: string;
  currentUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => void;
  disabled?: boolean;
}> = ({ label, accept, currentUrl, onUpload, onDelete, disabled }) => {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        await onUpload(e.target.files[0]);
      } catch (err) {
        alert('Upload failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <label className="block text-sm font-bold text-gray-700 mb-2 font-dynapuff">{label}</label>
      <div className="flex items-center gap-4">
        {currentUrl ? (
          <div className="flex-1 flex items-center justify-between bg-white p-3 rounded-lg border">
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-bold truncate">View Uploaded Document</a>
            {!disabled && onDelete && (
              <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-700 text-sm font-bold">Remove</button>
            )}
          </div>
        ) : (
          <div className="flex-1 relative">
            <input
              type="file"
              accept={accept || ".pdf,.doc,.docx,.jpg,.png"}
              onChange={handleChange}
              disabled={loading || disabled}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className={`flex items-center justify-center p-3 border-2 border-dashed rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors ${loading ? 'bg-gray-100' : 'bg-white'}`}>
              {loading ? 'Uploading...' : 'Click to Upload File'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Modal ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl' | 'full' }> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-5xl', full: 'max-w-full h-[90vh]' };
  return (
    <div className="fixed inset-0 bg-brand-purple/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className={`bg-white rounded-3xl w-full ${sizes[size]} shadow-2xl flex flex-col max-h-[90vh] animate-slide-up border-4 border-white ring-1 ring-purple-100`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
          <h3 className="text-2xl font-bold font-dynapuff text-brand-purple">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 rounded-full p-2 transition-colors">✕</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode; variant?: 'blue' | 'green' | 'purple' | 'red' | 'gray' | 'amber' | 'teal' | null }> = ({ children, variant }) => {
    let detectedVariant = variant;
    if (!detectedVariant && typeof children === 'string') {
        const s = children as string;
        if (s.includes('Rejected')) detectedVariant = 'red';
        else if (s.includes('Funded') || s.includes('Submitted')) detectedVariant = 'green';
        else if (s.includes('Invited') || s.includes('Finalist')) detectedVariant = 'amber';
        else detectedVariant = 'gray';
    }
    const styles: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700 border border-blue-200',
        green: 'bg-green-100 text-green-700 border border-green-200',
        purple: 'bg-purple-100 text-purple-700 border border-purple-200',
        red: 'bg-red-100 text-red-700 border border-red-200',
        gray: 'bg-gray-100 text-gray-600 border border-gray-200',
        amber: 'bg-amber-100 text-amber-800 border border-amber-200',
        teal: 'bg-teal-100 text-teal-700 border border-teal-200'
    };
    return <span className={`${styles[detectedVariant || 'gray']} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap shadow-sm`}>{children}</span>;
};

// --- Simple Bar Chart (CSS Based) ---
export const BarChart: React.FC<{ data: { label: string; value: number; color?: string }[], height?: number }> = ({ data, height = 200 }) => {
    const max = Math.max(...data.map(d => d.value));
    return (
        <div className="flex items-end justify-around gap-2 w-full bg-gray-50 rounded-xl border border-gray-100 p-4" style={{ height: `${height}px` }}>
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 group relative">
                    <div className="text-xs font-bold text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full">{d.value}</div>
                    <div 
                        className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ${d.color || 'bg-brand-purple'}`} 
                        style={{ height: `${(d.value / max) * 100}%` }}
                    />
                    <div className="text-[10px] font-bold text-gray-400 mt-2 text-center uppercase truncate w-full">{d.label}</div>
                </div>
            ))}
        </div>
    );
};

// --- File Card ---
export const FileCard: React.FC<{ title: string; type: string; date?: string; onClick: () => void; onDelete?: () => void }> = ({ title, type, date, onClick, onDelete }) => (
    <div onClick={onClick} className="group bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${type === 'folder' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
            {type === 'folder' ? '📁' : '📄'}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-800 truncate">{title}</h4>
            {date && <p className="text-xs text-gray-500">{date}</p>}
        </div>
        {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                🗑️
            </button>
        )}
    </div>
);
