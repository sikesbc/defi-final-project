import { useState } from 'react';
import { Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { attacksApi } from '../services/api';
import { Button } from './ui/button';

export const ExportButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    setLoading(true);
    setStatus('idle');

    try {
      const blob = await attacksApi.exportToCSV();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `crypto-attacks-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      size="lg"
      variant={
        status === 'success' ? 'default' :
        status === 'error' ? 'destructive' :
        'default'
      }
      className="shadow-lg"
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span>Exporting...</span>
        </>
      ) : status === 'success' ? (
        <>
          <CheckCircle className="w-5 h-5 mr-2" />
          <span>Exported!</span>
        </>
      ) : status === 'error' ? (
        <>
          <XCircle className="w-5 h-5 mr-2" />
          <span>Failed</span>
        </>
      ) : (
        <>
          <Download className="w-5 h-5 mr-2" />
          <span>Export to CSV</span>
        </>
      )}
    </Button>
  );
};
