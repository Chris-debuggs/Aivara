'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface Report {
  id: number;
  report_name: string;
  upload_timestamp: string;
  file_path: string;
  hemoglobin: number | null;
  wbc: number | null;
  platelets: number | null;
  rbc: number | null;
  analysis_results?: any;
  extracted_text?: string;
}

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReports();
      // Normalize analysis_result_json into analysis_results for frontend usage
      const normalized = (data || []).map((r: any) => {
        const copy = { ...r };
        try {
          if (copy.analysis_result_json && typeof copy.analysis_result_json === 'string') {
            copy.analysis_results = JSON.parse(copy.analysis_result_json);
          }
        } catch {
          copy.analysis_results = null;
        }
        return copy;
      });
      setReports(normalized);
      return { success: true, data };
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch reports';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReport = useCallback(async (reportId: number, includeText = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReport(reportId, includeText);
      // Normalize analysis_result_json
      try {
        if (data.analysis_result_json && typeof data.analysis_result_json === 'string') {
          data.analysis_results = JSON.parse(data.analysis_result_json);
        }
      } catch {
        data.analysis_results = null;
      }
      return { success: true, data };
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch report';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadReport = useCallback(async (reportName: string, file: File) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.uploadReport(reportName, file);
      // Normalize returned report
      try {
        if (data.analysis_result_json && typeof data.analysis_result_json === 'string') {
          data.analysis_results = JSON.parse(data.analysis_result_json);
        }
      } catch {
        data.analysis_results = null;
      }
      // Refresh reports list
      await fetchReports();
      return { success: true, data };
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to upload report';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [fetchReports]);

  const reanalyzeReport = useCallback(async (reportId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.reanalyzeReport(reportId);
      return { success: true, data };
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to reanalyze report';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reports,
    loading,
    error,
    fetchReports,
    fetchReport,
    uploadReport,
    reanalyzeReport,
  };
}
