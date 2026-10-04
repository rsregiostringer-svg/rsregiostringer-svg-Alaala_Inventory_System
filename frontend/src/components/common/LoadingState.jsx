import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading data...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-amber-500 animate-spin" />
        <Loader2 className="w-5 h-5 text-amber-500 absolute animate-pulse" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-400">{message}</p>
    </div>
  );
}
