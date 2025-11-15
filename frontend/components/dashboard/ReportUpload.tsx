"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useReports } from '@/hooks/useReports';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { gsap } from 'gsap';

export function ReportUpload() {
  const router = useRouter();
  const { uploadReport, loading } = useReports();
  const [reportName, setReportName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      // Validate file type
      const validTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/tiff',
        'image/bmp',
        'image/gif',
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Invalid file type. Please upload a PDF or image file.');
        return;
      }

      if (selectedFile.size > 200 * 1024 * 1024) {
        toast.error('File size must be less than 200MB');
        return;
      }

      setFile(selectedFile);
      if (!reportName) {
        setReportName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [reportName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif'],
    },
    multiple: false,
    disabled: loading,
  });

  const handleUpload = async () => {
    if (!file || !reportName.trim()) {
      toast.error('Please provide a report name and select a file');
      return;
    }

    setUploadProgress(0);
    
    // Simulate progress (in real app, use axios progress callback)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const result = await uploadReport(reportName, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        toast.success('Report uploaded successfully!');

        // If backend returned limited analysis due to missing OCR/LLM, surface a friendly warning
        try {
          const created = result.data;
          // analysis_result_json might be a stringified JSON on the backend
          const analysisRaw = created?.analysis_result_json;
          if (analysisRaw) {
            try {
              const analysis = typeof analysisRaw === 'string' ? JSON.parse(analysisRaw) : analysisRaw;
              if (analysis?.llm_explanation && typeof analysis.llm_explanation === 'string' && analysis.llm_explanation.includes('LLM-powered explanation is not available')) {
                toast.warning('AI analysis is limited because the local model is not available.');
              }
            } catch {}
          }

          // Check for OCR extracted_text or errors
          if (created?.extracted_text && typeof created.extracted_text === 'string' && created.extracted_text.startsWith('Error extracting text')) {
            toast.warning('OCR unavailable: uploaded file was saved but text extraction failed (tesseract not installed).');
          }

          // Navigate to the created report details for immediate review
          const newId = created?.id;
          if (newId) {
            setFile(null);
            setReportName('');
            setUploadProgress(0);
            router.push(`/reports/${newId}`);
            return;
          }
        } catch (e) {
          // ignore parsing/navigation errors and fall through
        }

        setFile(null);
        setReportName('');
        setUploadProgress(0);
      } else {
        toast.error(result.error || 'Failed to upload report');
        setUploadProgress(0);
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      toast.error(error.message || 'Failed to upload report');
    }
  };

  return (
    <Card ref={cardRef}>
      <CardHeader>
        <CardTitle>Upload Medical Report</CardTitle>
        <CardDescription>
          Upload a PDF or image file containing your medical report for AI analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reportName">Report Name</Label>
          <Input
            id="reportName"
            placeholder="e.g., Blood Test - November 2024"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div
          ref={dropzoneRef}
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onMouseEnter={(e) => {
            if (!loading && !isDragActive) {
              gsap.to(e.currentTarget, { scale: 1.01, duration: 0.2 });
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && !isDragActive) {
              gsap.to(e.currentTarget, { scale: 1, duration: 0.2 });
            }
          }}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="space-y-2">
              <FileText className="h-12 w-12 mx-auto text-primary" />
              <div className="flex items-center justify-center gap-2">
                <span className="font-medium">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {isDragActive ? 'Drop the file here' : 'Drag and drop a file here, or click to select'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, PNG, JPG, JPEG, TIFF, BMP, GIF (Max 200MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleUpload}
          disabled={!file || !reportName.trim() || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading & Analyzing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Analyze
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
