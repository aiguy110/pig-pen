import React, { useState } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { botService } from '../services/api';

interface BotUploadProps {
  onUploadSuccess: () => void;
}

export const BotUpload: React.FC<BotUploadProps> = ({ onUploadSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !file) {
      setError('Name and WASM file are required');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await botService.uploadBot(name, description, file);
      setSuccess(`Bot uploaded successfully! ID: ${response.id}`);
      setName('');
      setDescription('');
      setFile(null);
      onUploadSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload bot');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Bot</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Bot Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label htmlFor="wasm" className="block text-sm font-medium text-gray-700">
            WASM File
          </label>
          <div className="mt-1 flex items-center">
            <label className="relative cursor-pointer bg-white rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 flex items-center">
              <CloudArrowUpIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-700">
                {file ? file.name : 'Choose file'}
              </span>
              <input
                type="file"
                id="wasm"
                accept=".wasm"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="sr-only"
                required
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          {uploading ? 'Uploading...' : 'Upload Bot'}
        </button>
      </form>
    </div>
  );
};
