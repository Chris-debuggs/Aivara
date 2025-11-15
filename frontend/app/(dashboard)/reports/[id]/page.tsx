'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReports } from '@/hooks/useReports';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportDetails } from '@/components/dashboard/ReportDetails';
import { HealthMarkerChart } from '@/components/dashboard/HealthMarkerChart';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { AIAnalysisDisplay } from '@/components/dashboard/AIAnalysisDisplay';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { gsap } from 'gsap';
import type { Report } from '@/hooks/useReports';

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = parseInt(params.id as string);
  const { fetchReport, reanalyzeReport } = useReports();
  const [report, setReport] = useState<Report | null>(null);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReport();
    loadAllReports();
  }, [reportId]);

  useEffect(() => {
    if (pageRef.current && !loading && report) {
      gsap.fromTo(
        pageRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, [loading, report]);

  const loadReport = async () => {
    setLoading(true);
    const result = await fetchReport(reportId, true);
    if (result.success) {
      setReport(result.data);
      // If extracted_text indicates OCR wasn't available, surface a warning
      try {
        const txt = result.data?.extracted_text;
        if (txt && typeof txt === 'string' && txt.startsWith('Error extracting text')) {
          toast.warning('OCR appears to be unavailable on the server; extracted text is empty. Install tesseract to enable OCR.');
        }
      } catch {}
    } else {
      toast.error(result.error || 'Failed to load report');
      router.push('/reports');
    }
    setLoading(false);
  };

  const loadAllReports = async () => {
    try {
      const data = await api.getReports();
      setAllReports(data);
    } catch (error) {
      console.error('Failed to load all reports:', error);
    }
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    const result = await reanalyzeReport(reportId);
    if (result.success) {
      toast.success('Report reanalyzed successfully!');
      await loadReport();
    } else {
      toast.error(result.error || 'Failed to reanalyze report');
    }
    setReanalyzing(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Report not found</p>
            <Button className="mt-4" onClick={() => router.push('/reports')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/reports')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{report.report_name}</h1>
          <p className="text-muted-foreground">
            Report ID: {report.id} • Uploaded{' '}
            {new Date(report.upload_timestamp).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReanalyze}
          disabled={reanalyzing}
        >
          {reanalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reanalyzing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reanalyze
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="ai">AI Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ReportDetails report={report} />
        </TabsContent>

        <TabsContent value="charts">
          <HealthMarkerChart report={report} />
        </TabsContent>

        <TabsContent value="ai">
          <AIAnalysisDisplay report={report} reportId={reportId} />
        </TabsContent>

        <TabsContent value="trends">
          <TrendChart currentReport={report} allReports={allReports} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
