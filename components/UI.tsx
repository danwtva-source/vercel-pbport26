import React, { useState } from 'react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}
export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', children, ...props }) => {
  const base = "font-bold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-brand-purple hover:bg-brand-darkPurple text-white shadow-lg shadow-purple-200",
    secondary: "bg-brand-teal hover:bg-brand-darkTeal text-white shadow-lg shadow-teal-200",
    outline: "border-2 border-brand-purple text-brand-purple hover:bg-brand-light",
    danger: "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-brand-purple"
  };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-6 py-3 text-base", lg: "px-8 py-4 text-lg font-bold" };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl shadow-xl border border-purple-50 p-6 ${onClick ? 'cursor-pointer hover:-translate-y-1 transition-transform' : ''} ${className}`}>
    {children}
  </div>
);

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{label}</label>}
    <input className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-purple focus:ring-4 focus:ring-purple-50 transition-all outline-none ${className}`} {...props} />
  </div>
);

// --- Rich Text Area with Word Count ---
export const RichTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string, maxWords?: number }> = ({ label, maxWords, value, className = '', ...props }) => {
  const wordCount = typeof value === 'string' ? value.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const isOver = maxWords ? wordCount > maxWords : false;

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2 ml-1">
        {label && <label className="block text-sm font-bold text-gray-700">{label}</label>}
        {maxWords && (
          <span className={`text-xs font-bold ${isOver ? 'text-red-600' : 'text-gray-400'}`}>
            {wordCount} / {maxWords} words
          </span>
        )}
      </div>
      <textarea
        className={`w-full px-4 py-3 rounded-xl border ${isOver ? 'border-red-300 focus:ring-red-50' : 'border-gray-200 focus:border-brand-purple focus:ring-purple-50'} focus:ring-4 transition-all outline-none ${className}`}
        value={value}
        {...props}
      />
    </div>
  );
};

// --- File Upload ---
export const FileUpload: React.FC<{
  label: string,
  accept?: string,
  currentUrl?: string,
  onUpload: (file: File) => Promise<void>,
  onDelete?: () => void,
  disabled?: boolean
}> = ({ label, accept, currentUrl, onUpload, onDelete, disabled }) => {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        await onUpload(e.target.files[0]);
      } catch (err) {
        alert("Upload failed");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-4">
        {currentUrl ? (
          <div className="flex-1 flex items-center justify-between bg-white p-3 rounded-lg border">
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-bold truncate">
              View Uploaded Document
            </a>
            {!disabled && onDelete && (
              <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-700 text-sm font-bold">
                Remove
              </button>
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

// --- Badge with Auto-Detection ---
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'draft' | 'danger' | 'blue' | 'green' | 'purple' | 'red' | 'gray' | 'amber' | 'teal';
  className?: string
}> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: "bg-gray-100 text-gray-600 border border-gray-200",
    success: "bg-green-100 text-green-700 border border-green-200",
    warning: "bg-orange-100 text-orange-700 border border-orange-200",
    info: "bg-blue-100 text-blue-700 border border-blue-200",
    draft: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    danger: "bg-red-100 text-red-700 border border-red-200",
    blue: "bg-blue-100 text-blue-700 border border-blue-200",
    green: "bg-green-100 text-green-700 border border-green-200",
    purple: "bg-purple-100 text-purple-700 border border-purple-200",
    red: "bg-red-100 text-red-700 border border-red-200",
    gray: "bg-gray-100 text-gray-600 border border-gray-200",
    amber: "bg-amber-100 text-amber-800 border border-amber-200",
    teal: "bg-teal-100 text-teal-700 border border-teal-200"
  };

  // Auto-detect variant based on content if not explicitly specified
  let finalVariant = variant;
  if (variant === 'default' && typeof children === 'string') {
    const s = children as string;
    if (s.includes('Funded') || s.includes('Submitted')) finalVariant = 'success';
    else if (s.includes('Draft')) finalVariant = 'draft';
    else if (s.includes('Rejected')) finalVariant = 'danger';
    else if (s.includes('Invited') || s.includes('Finalist')) finalVariant = 'amber';
    else if (s.includes('Warning')) finalVariant = 'warning';
    else if (s.includes('Info')) finalVariant = 'info';
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${variants[finalVariant]} ${className}`}>
      {children}
    </span>
  );
};

// --- Modal ---
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | 'full'
}> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full h-[90vh]'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={`bg-white rounded-[2rem] shadow-2xl w-full ${sizes[size]} relative z-10 flex flex-col max-h-[90vh] animate-scale-up`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold font-dynapuff text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-red-500">
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">{children}</div>
      </div>
    </div>
  );
};

// --- Bar Chart (Horizontal Style) ---
export const BarChart: React.FC<{
  data: { label: string, value: number }[],
  color?: string
}> = ({ data, color = '#7c3aed' }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-gray-700">{d.label}</span>
            <span className="text-gray-500">{d.value}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Vertical Bar Chart ---
export const VerticalBarChart: React.FC<{
  data: { label: string; value: number; color?: string }[],
  height?: number
}> = ({ data, height = 200 }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="flex items-end justify-around gap-2 w-full bg-gray-50 rounded-xl border border-gray-100 p-4" style={{ height: `${height}px` }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 group relative">
          <div className="text-xs font-bold text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full">
            {d.value}
          </div>
          <div
            className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ${d.color || 'bg-brand-purple'}`}
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <div className="text-[10px] font-bold text-gray-400 mt-2 text-center uppercase truncate w-full">
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
};

// --- File Card ---
export const FileCard: React.FC<{
  title: string;
  type: 'folder' | 'file';
  date?: string;
  onClick?: () => void;
  onDelete?: () => void
}> = ({ title, type, date, onClick, onDelete }) => (
  <div onClick={onClick} className="group bg-white p-4 rounded-xl border border-gray-100 hover:border-brand-purple hover:shadow-lg transition-all cursor-pointer relative">
    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
      {type === 'folder' ? '📁' : '📄'}
    </div>
    <h4 className="font-bold text-gray-800 truncate mb-1">{title}</h4>
    {date && <p className="text-xs text-gray-400">{date}</p>}
    {onDelete && (
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2 right-2 p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-full transition-colors"
      >
        ✕
      </button>
    )}
  </div>
);
