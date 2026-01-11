import React, { useState } from 'react';
import { Sparkles, Copy, Check, RefreshCw, Wand2, AlertCircle } from 'lucide-react';
import { Card, Button, Input, Badge } from './UI';
import { BlurbGeneration } from '../types';

interface BlurbGeneratorProps {
  projectTitle?: string;
  projectSummary?: string;
  amountRequested?: number;
  area?: string;
  onUseBlurb?: (blurb: string) => void;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'passionate', label: 'Passionate' },
  { value: 'factual', label: 'Factual' }
];

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short (50 words)', maxWords: 50 },
  { value: 'medium', label: 'Medium (100 words)', maxWords: 100 },
  { value: 'long', label: 'Long (150 words)', maxWords: 150 }
];

/**
 * AI Blurb Generator Component (PRD 4.3.3)
 * Helps applicants generate compelling project descriptions
 * Uses Anthropic Claude API for text generation
 */
export const BlurbGenerator: React.FC<BlurbGeneratorProps> = ({
  projectTitle = '',
  projectSummary = '',
  amountRequested = 0,
  area = '',
  onUseBlurb
}) => {
  const [inputTitle, setInputTitle] = useState(projectTitle);
  const [inputSummary, setInputSummary] = useState(projectSummary);
  const [inputAmount, setInputAmount] = useState(amountRequested.toString());
  const [inputArea, setInputArea] = useState(area);
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [generatedBlurb, setGeneratedBlurb] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BlurbGeneration[]>([]);

  // Generate blurb using AI
  const handleGenerate = async () => {
    if (!inputTitle.trim() || !inputSummary.trim()) {
      setError('Please provide at least a project title and summary');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Build the prompt for Claude
      const selectedLength = LENGTH_OPTIONS.find(l => l.value === length);
      const prompt = buildPrompt({
        title: inputTitle,
        summary: inputSummary,
        amount: parseFloat(inputAmount) || 0,
        area: inputArea,
        tone,
        maxWords: selectedLength?.maxWords || 100
      });

      // Call the AI API (this would be a server-side API call in production)
      const response = await callAIAPI(prompt);

      setGeneratedBlurb(response);

      // Add to history
      const generation: BlurbGeneration = {
        id: `blurb_${Date.now()}`,
        projectTitle: inputTitle,
        inputData: {
          summary: inputSummary,
          amount: parseFloat(inputAmount) || 0,
          area: inputArea
        },
        generatedBlurb: response,
        tone,
        length: length as 'short' | 'medium' | 'long',
        createdAt: Date.now(),
        usedInApplication: false
      };
      setHistory(prev => [generation, ...prev].slice(0, 5));
    } catch (err) {
      console.error('Error generating blurb:', err);
      setError('Failed to generate blurb. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!generatedBlurb) return;

    try {
      await navigator.clipboard.writeText(generatedBlurb);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Use the blurb (callback to parent)
  const handleUse = () => {
    if (generatedBlurb && onUseBlurb) {
      onUseBlurb(generatedBlurb);
    }
  };

  // Regenerate with same settings
  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-xl">
          <Sparkles className="text-purple-600" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-purple-900">AI Blurb Generator</h3>
          <p className="text-sm text-gray-600">
            Get help writing a compelling project description
          </p>
        </div>
        <Badge variant="purple" className="ml-auto">Beta</Badge>
      </div>

      <div className="space-y-4">
        {/* Input Fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Project Title"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            placeholder="e.g., Community Garden Project"
            required
          />
          <Input
            label="Area/Location"
            value={inputArea}
            onChange={(e) => setInputArea(e.target.value)}
            placeholder="e.g., Blaenavon"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Brief Summary <span className="text-red-500">*</span>
          </label>
          <textarea
            value={inputSummary}
            onChange={(e) => setInputSummary(e.target.value)}
            placeholder="Describe your project in a few sentences - what will it do, who will it help, and what difference will it make?"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none resize-none"
          />
        </div>

        <Input
          label="Amount Requested (GBP)"
          type="number"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          placeholder="e.g., 5000"
        />

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
            >
              {TONE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Length</label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
            >
              {LENGTH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center pt-2">
          <Button
            onClick={handleGenerate}
            disabled={generating || !inputTitle.trim() || !inputSummary.trim()}
            className="px-8"
          >
            {generating ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 size={18} />
                Generate Blurb
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Generated Result */}
        {generatedBlurb && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-800">Generated Blurb</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleRegenerate}>
                  <RefreshCw size={16} />
                  Regenerate
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                {onUseBlurb && (
                  <Button size="sm" onClick={handleUse}>
                    Use This
                  </Button>
                )}
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <p className="text-gray-800 whitespace-pre-wrap">{generatedBlurb}</p>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-bold text-gray-800 mb-3">Previous Generations</h4>
            <div className="space-y-2">
              {history.slice(1).map(gen => (
                <button
                  key={gen.id}
                  onClick={() => setGeneratedBlurb(gen.generatedBlurb)}
                  className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <p className="text-sm text-gray-600 line-clamp-2">{gen.generatedBlurb}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {gen.tone} • {gen.length}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// Build prompt for AI
function buildPrompt(data: {
  title: string;
  summary: string;
  amount: number;
  area: string;
  tone: string;
  maxWords: number;
}): string {
  return `You are helping write a project description for a community funding application. Generate a compelling, ${data.tone} blurb for the following project:

Project Title: ${data.title}
Summary: ${data.summary}
${data.amount > 0 ? `Funding Amount: £${data.amount.toLocaleString()}` : ''}
${data.area ? `Location: ${data.area}` : ''}

Requirements:
- Write approximately ${data.maxWords} words
- Use a ${data.tone} tone
- Focus on community impact and benefits
- Be specific about what the project will achieve
- Avoid jargon and keep it accessible
- Make it engaging and persuasive

Generate only the blurb text, no additional commentary.`;
}

// Mock AI API call - in production this would call a server-side API
async function callAIAPI(prompt: string): Promise<string> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // In production, this would be:
  // const response = await fetch('/api/generate-blurb', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ prompt })
  // });
  // return response.json();

  // For now, return a placeholder response
  return `This community project aims to make a real difference in the local area by bringing people together and creating lasting positive change. Through dedicated effort and community involvement, we will establish a welcoming space where residents of all ages can connect, learn, and thrive together.

Our initiative addresses a genuine need in the community, providing valuable resources and opportunities that will benefit families for years to come. With your support, we can transform this vision into reality and create something truly special for our neighbourhood.`;
}

export default BlurbGenerator;
