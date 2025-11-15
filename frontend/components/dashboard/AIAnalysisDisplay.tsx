'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Pill, Heart, FileText, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { gsap } from 'gsap';
import { Markdown } from '@/components/ui/markdown';
import type { Report } from '@/hooks/useReports';

interface AIAnalysisDisplayProps {
  report: Report;
  reportId: number;
}

interface AIAnalysis {
  summary?: string;
  observations?: string[];
  llm_explanation?: string;
  report_reading_insights?: string;
  analysis_model?: string;
}

interface Suggestions {
  suggestions?: string;
  model?: string;
}

export function AIAnalysisDisplay({ report, reportId }: AIAnalysisDisplayProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(report.analysis_results || null);
  const [medicineSuggestions, setMedicineSuggestions] = useState<Suggestions | null>(null);
  const [womenHealthSuggestions, setWomenHealthSuggestions] = useState<Suggestions | null>(null);
  const [loadingMedicine, setLoadingMedicine] = useState(false);
  const [loadingWomen, setLoadingWomen] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Animate cards on mount
    cardRefs.current.forEach((ref, index) => {
      if (ref) {
        gsap.fromTo(
          ref,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: index * 0.1 }
        );
      }
    });
  }, [analysis, medicineSuggestions, womenHealthSuggestions]);

  const fetchMedicineSuggestions = async () => {
    setLoadingMedicine(true);
    try {
      const data = await api.getMedicineSuggestions(reportId);
      setMedicineSuggestions(data);
      toast.success('Medicine suggestions loaded');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load medicine suggestions');
    } finally {
      setLoadingMedicine(false);
    }
  };

  const fetchWomenHealthSuggestions = async () => {
    setLoadingWomen(true);
    try {
      const data = await api.getWomenHealthSuggestions(reportId);
      setWomenHealthSuggestions(data);
      toast.success("Women's health suggestions loaded");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to load women's health suggestions");
    } finally {
      setLoadingWomen(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* General AI Explanation */}
      {analysis && (
        <div ref={(el) => { cardRefs.current[0] = el; }}>
          <Card className="shadow-lg border-primary/10 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                General Health Explanation
                {analysis.analysis_model && (
                  <Badge variant="outline" className="ml-auto">
                    {analysis.analysis_model}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>AI-powered analysis of your health markers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {analysis.summary && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20 rounded-lg border-l-4 border-primary">
                  <h4 className="font-semibold mb-2 text-foreground">Summary</h4>
                  <Markdown content={analysis.summary} />
                </div>
              )}
              {analysis.observations && analysis.observations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">Observations</h4>
                  <div className="space-y-2">
                    {analysis.observations.map((obs, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                        <p className="text-muted-foreground flex-1">{obs}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analysis.llm_explanation && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">Detailed Explanation</h4>
                  <div className="p-6 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/50 shadow-sm">
                    <Markdown content={analysis.llm_explanation} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Reading Insights */}
      {analysis?.report_reading_insights && (
        <div ref={(el) => { cardRefs.current[1] = el; }}>
          <Card className="shadow-lg border-blue-200/50 dark:border-blue-800/50 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20 border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                Report Reading Insights
                {analysis.analysis_model && (
                  <Badge variant="outline" className="ml-auto">
                    {analysis.analysis_model}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Detailed report analysis using qwen3-vl:2b</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="p-6 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/10 rounded-xl border border-blue-200/50 dark:border-blue-800/30 shadow-sm">
                <Markdown content={analysis.report_reading_insights} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Medicine Suggestions */}
  <div ref={(el) => { cardRefs.current[2] = el; }}>
        <Card className="shadow-lg border-green-200/50 dark:border-green-800/50 hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/20 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Pill className="h-5 w-5 text-green-500" />
              </div>
              Allopathic Medicine Suggestions
              {medicineSuggestions?.model && (
                <Badge variant="outline" className="ml-auto">
                  {medicineSuggestions.model}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>AI-generated medicine recommendations (consult your doctor)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {medicineSuggestions ? (
              <div className="p-6 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/10 rounded-xl border border-green-200/50 dark:border-green-800/30 shadow-sm">
                <Markdown content={medicineSuggestions.suggestions || 'No suggestions available'} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-4 rounded-full bg-green-500/10">
                  <Sparkles className="h-12 w-12 text-green-500" />
                </div>
                <p className="text-muted-foreground text-center max-w-md">
                  Click below to get AI-powered medicine suggestions based on your health markers
                </p>
                <Button
                  onClick={fetchMedicineSuggestions}
                  disabled={loadingMedicine}
                  className="mt-4"
                  size="lg"
                >
                  {loadingMedicine ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Pill className="mr-2 h-4 w-4" />
                      Get Medicine Suggestions
                    </>
                  )}
                </Button>
              </div>
            )}
            {loadingMedicine && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Women's Health Suggestions */}
  <div ref={(el) => { cardRefs.current[3] = el; }}>
        <Card className="shadow-lg border-pink-200/50 dark:border-pink-800/50 hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-transparent dark:from-pink-950/20 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              Women's Health Suggestions
              {womenHealthSuggestions?.model && (
                <Badge variant="outline" className="ml-auto">
                  {womenHealthSuggestions.model}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Specialized women's healthcare recommendations</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {womenHealthSuggestions ? (
              <div className="p-6 bg-gradient-to-br from-pink-50/50 to-transparent dark:from-pink-950/10 rounded-xl border border-pink-200/50 dark:border-pink-800/30 shadow-sm">
                <Markdown content={womenHealthSuggestions.suggestions || 'No suggestions available'} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-4 rounded-full bg-pink-500/10">
                  <Heart className="h-12 w-12 text-pink-500" />
                </div>
                <p className="text-muted-foreground text-center max-w-md">
                  Click below to get specialized women's health suggestions tailored to your needs
                </p>
                <Button
                  onClick={fetchWomenHealthSuggestions}
                  disabled={loadingWomen}
                  className="mt-4"
                  size="lg"
                  variant="outline"
                >
                  {loadingWomen ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2 h-4 w-4" />
                      Get Women's Health Suggestions
                    </>
                  )}
                </Button>
              </div>
            )}
            {loadingWomen && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-200/50 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/10 dark:border-amber-800/50 shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                Important Disclaimer
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                All AI-generated suggestions are for informational purposes only. Always consult with a
                qualified healthcare provider before making any medical decisions or taking medications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

