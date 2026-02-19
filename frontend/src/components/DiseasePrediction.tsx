import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Brain, AlertTriangle, CheckCircle, Activity, Shield } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Prediction {
  condition: string;
  probability: number;
  severity: 'Low' | 'Mild' | 'Moderate' | 'High';
}

interface AnalysisResult {
  predictions: Prediction[];
  primary_assessment: string;
  recommendations: string[];
  confidence: number;
  disclaimer: string;
}

const DiseasePrediction: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_BASE_URL}/predict/disease`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Disease prediction failed:', error);
      alert('Analysis failed. Please try again with a clearer image.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low': return 'text-emerald-600 bg-emerald-50';
      case 'Mild': return 'text-amber-600 bg-amber-50';
      case 'Moderate': return 'text-orange-600 bg-orange-50';
      case 'High': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getProbabilityWidth = (probability: number) => `${probability * 100}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl mb-4"
        >
          <Brain className="w-8 h-8 text-purple-600" />
          <h2 className="text-2xl font-black gradient-text">AI Disease Prediction</h2>
        </motion.div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Advanced facial analysis for early disease detection. Our AI analyzes facial markers to predict potential health conditions.
        </p>
      </div>

      {/* Upload Section */}
      {!result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Upload Area */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">
                Upload Facial Image
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all group"
                >
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3 group-hover:text-purple-500 transition-colors" />
                    <p className="text-gray-600 font-medium">Click to upload image</p>
                    <p className="text-sm text-gray-400 mt-1">or drag and drop</p>
                    <p className="text-xs text-gray-400 mt-2">PNG, JPG up to 10MB</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">
                Image Preview
              </label>
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analyze Button */}
          <div className="mt-8 text-center">
            <button
              onClick={analyzeImage}
              disabled={!selectedFile || isAnalyzing}
              className="btn-premium px-12 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5" />
                  Start AI Analysis
                </div>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Analysis Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-6"
          >
            {/* Confidence Score */}
            <div className="glass-card p-6 border-l-[4px] border-l-purple-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Analysis Complete</h3>
                    <p className="text-sm text-gray-500">AI Confidence Score</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-purple-600">{Math.round(result.confidence * 100)}%</div>
                  <div className="text-sm text-gray-500">Confidence</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: getProbabilityWidth(result.confidence) }}
                />
              </div>
            </div>

            {/* Primary Assessment */}
            <div className="glass-card p-6">
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Primary Assessment
              </h4>
              <p className="text-slate-700 leading-relaxed">{result.primary_assessment}</p>
            </div>

            {/* Predictions */}
            <div className="glass-card p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Risk Predictions
              </h4>
              <div className="space-y-4">
                {result.predictions.map((prediction, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-700">{prediction.condition}</span>
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getSeverityColor(prediction.severity)}`}>
                          {prediction.severity}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: getProbabilityWidth(prediction.probability) }}
                        />
                      </div>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <div className="font-bold text-slate-700">
                        {Math.round(prediction.probability * 100)}%
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="glass-card p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Recommendations
              </h4>
              <ul className="space-y-3">
                {result.recommendations.map((rec, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    <span className="text-slate-700">{rec}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="glass-card p-6 border-l-[4px] border-l-amber-500">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Medical Disclaimer</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.disclaimer}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setResult(null);
                  setSelectedFile(null);
                  setPreviewUrl('');
                }}
                className="flex-1 btn-secondary-premium"
              >
                Analyze Another Image
              </button>
              <button className="flex-1 btn-premium">
                Download Report
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiseasePrediction;
