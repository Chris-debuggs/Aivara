'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useReports } from '@/hooks/useReports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Calendar, Search, RefreshCw, Activity } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { gsap } from 'gsap';
import type { Report } from '@/hooks/useReports';

export function ReportsList() {
  const router = useRouter();
  const { reports, loading, fetchReports } = useReports();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = reports.filter((report) =>
        report.report_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredReports(filtered);
    } else {
      setFilteredReports(reports);
    }
  }, [searchQuery, reports]);

  useEffect(() => {
    // Animate cards on mount and when reports change
    if (!loading && filteredReports.length > 0) {
      cardRefs.current.forEach((ref, index) => {
        if (ref) {
          gsap.fromTo(
            ref,
            { opacity: 0, y: 30, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.5,
              ease: 'power3.out',
              delay: index * 0.05,
            }
          );
        }
      });
    }
  }, [filteredReports, loading]);

  const sortedReports = [...filteredReports].sort(
    (a, b) =>
      new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Medical Reports</CardTitle>
            <CardDescription>
              View and manage all your uploaded medical reports
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchReports()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-4 animate-pulse" />
            Loading reports...
          </div>
        ) : sortedReports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">
              {searchQuery ? 'No reports match your search.' : 'No reports yet.'}
            </p>
            {!searchQuery && (
              <p className="text-sm">
                Upload your first medical report to get started with AI analysis.
              </p>
            )}
          </div>
        ) : (
          <div ref={containerRef} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedReports.map((report, index) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="block group"
                ref={(el) => { cardRefs.current[index] = el; }}
                onMouseEnter={(e) => {
                  gsap.to(e.currentTarget, {
                    y: -4,
                    scale: 1.02,
                    duration: 0.3,
                    ease: 'power2.out',
                  });
                }}
                onMouseLeave={(e) => {
                  gsap.to(e.currentTarget, {
                    y: 0,
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out',
                  });
                }}
              >
                <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 hover:shadow-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <FileText className="h-5 w-5 text-primary" />
                      {report.analysis_results && (
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                      )}
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {report.report_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(new Date(report.upload_timestamp), 'MMM d, yyyy')}
                    </div>

                    {(report.hemoglobin || report.wbc || report.platelets || report.rbc) && (
                      <div className="pt-2 border-t space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Health Markers</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {report.hemoglobin && (
                            <div>
                              <span className="text-muted-foreground">HGB:</span>{' '}
                              <span className="font-medium">{report.hemoglobin}</span>
                            </div>
                          )}
                          {report.wbc && (
                            <div>
                              <span className="text-muted-foreground">WBC:</span>{' '}
                              <span className="font-medium">{report.wbc}</span>
                            </div>
                          )}
                          {report.platelets && (
                            <div>
                              <span className="text-muted-foreground">PLT:</span>{' '}
                              <span className="font-medium">{report.platelets}</span>
                            </div>
                          )}
                          {report.rbc && (
                            <div>
                              <span className="text-muted-foreground">RBC:</span>{' '}
                              <span className="font-medium">{report.rbc}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
