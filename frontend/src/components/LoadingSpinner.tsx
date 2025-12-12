import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </div>
  );
};

