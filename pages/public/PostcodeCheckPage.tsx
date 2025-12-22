import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicLayout } from '../../components/Layout';
import { AREA_DATA } from '../../constants';
import { CheckCircle, AlertCircle, MapPin } from 'lucide-react';

const PostcodeCheckPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedArea, setSelectedArea] = useState(searchParams.get('area') || '');
  const [postcodeInput, setPostcodeInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [votingUrl, setVotingUrl] = useState('');

  const handleCheck = () => {
    if (!selectedArea || !postcodeInput) {
      setStatus('error');
      return;
    }

    const area = AREA_DATA[selectedArea];
    const normalized = postcodeInput.trim().toUpperCase().replace(/\s+/g, '');
    
    if (area && area.postcodes.includes(normalized)) {
      setStatus('success');
      setVotingUrl(area.formUrl);
    } else {
      setStatus('error');
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-2xl mt-8 border border-purple-100">
        <div className="text-center mb-8">
          <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
            <MapPin size={32} />
          </div>
          <h2 className="text-3xl font-bold text-purple-800 font-display">Verify Residency</h2>
          <p className="text-gray-600 mt-2">Please verify your postcode to access the voting form.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 font-display">Select Your Area</label>
            <select 
              value={selectedArea}
              onChange={(e) => {
                setSelectedArea(e.target.value);
                setStatus('idle');
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition bg-white"
            >
              <option value="">-- Choose Area --</option>
              {Object.entries(AREA_DATA).map(([key, data]) => (
                <option key={key} value={key}>{data.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 font-display">Your Postcode</label>
            <input 
              type="text"
              value={postcodeInput}
              onChange={(e) => setPostcodeInput(e.target.value)}
              placeholder="e.g. NP4 9AA"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            />
          </div>

          <button 
            onClick={handleCheck}
            className="w-full bg-purple-600 hover:bg-purple-800 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg transform hover:scale-[1.02] font-display"
          >
            Verify Postcode
          </button>
        </div>

        {status === 'success' && (
          <div className="mt-6 p-6 bg-teal-50 border border-teal-200 rounded-xl text-center animate-fade-in">
            <CheckCircle className="w-10 h-10 text-teal-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-teal-800 font-display">Verification Successful!</h3>
            <p className="text-teal-600 mb-4">You can now proceed to vote.</p>
            <a 
              href={votingUrl} 
              target="_blank" 
              rel="noreferrer"
              className="inline-block bg-teal-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-teal-700 transition"
            >
              Open Voting Form
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 animate-fade-in">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-800 text-sm">Verification Failed</h3>
              <p className="text-red-600 text-sm mt-1">
                Please check you have selected the correct area and entered a valid postcode for that zone.
              </p>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default PostcodeCheckPage;