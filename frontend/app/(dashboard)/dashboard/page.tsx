'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useReports } from '@/hooks/useReports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, FileText, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { gsap } from 'gsap';

export default function DashboardPage() {
  const router = useRouter();
  const { reports, loading, fetchReports } = useReports();
  const pageRef = useRef<HTMLDivElement>(null);
  const statCardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (pageRef.current && !loading) {
      gsap.fromTo(
        pageRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, [loading]);

  useEffect(() => {
    if (statCardsRef.current.length > 0) {
      statCardsRef.current.forEach((ref, index) => {
        if (ref) {
          gsap.fromTo(
            ref,
            { opacity: 0, y: 20, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.5,
              ease: 'power3.out',
              delay: index * 0.1,
            }
          );
        }
      });
    }
  }, [reports, loading]);

  const stats = {
    totalReports: reports.length,
    recentReports: reports.filter(
      (r) => new Date(r.upload_timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length,
  };

  return (
    <div ref={pageRef} className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your medical reports and health analytics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card ref={(el) => { statCardsRef.current[0] = el; }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground">All time reports</p>
          </CardContent>
        </Card>

  <Card ref={(el) => { statCardsRef.current[1] = el; }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Reports</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentReports}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

  <Card ref={(el) => { statCardsRef.current[2] = el; }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Analysis</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.analysis_results).length}
            </div>
            <p className="text-xs text-muted-foreground">Reports with AI analysis</p>
          </CardContent>
        </Card>

  <Card ref={(el) => { statCardsRef.current[3] = el; }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Trends</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.hemoglobin || r.wbc || r.platelets || r.rbc).length}
            </div>
            <p className="text-xs text-muted-foreground">Reports with markers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Your latest medical reports</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reports yet. Upload your first report to get started.</p>
                <Button className="mt-4" asChild>
                  <Link href="/reports">Upload Report</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.slice(0, 5).map((report) => (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{report.report_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(report.upload_timestamp), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/reports">
                <FileText className="mr-2 h-4 w-4" />
                View All Reports
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/reports?upload=true">
                <Activity className="mr-2 h-4 w-4" />
                Upload New Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
