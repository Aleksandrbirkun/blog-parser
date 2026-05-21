"use client";

import { useState, useMemo } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ArticleData } from "@/types/article";

const DEFAULT_URL =
  "https://docs.google.com/document/d/1s0fZsDcXJtiwrqUT1fVInS6q1yCZwVKkyCEGcxUiIYY/edit";

export default function Home() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const sanitizedHtml = useMemo(() => {
    if (!article?.htmlContent) return "";
    return DOMPurify.sanitize(article.htmlContent);
  }, [article?.htmlContent]);

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    setArticle(null);
    setUploadResult(null);

    try {
      const response = await fetch("/api/parse-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      setArticle(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse document");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!article) return;
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textContent: article.textContent,
          links: article.programmaticChecks.links,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      setArticle({ ...article, aiAnalysis: result.analysis });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze article");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!article) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const response = await fetch("/api/upload-wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          articleTitle: article.title,
          articleHtml: article.htmlContent,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setUploadResult(result.mockPostUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const checks = article?.programmaticChecks;
  const ai = article?.aiAnalysis;

  return (
    <div className="min-h-screen noise-bg gradient-mesh">
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--cyan-dim)] border border-[var(--cyan)]/30 mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--cyan)] animate-pulse" />
            <span className="text-[var(--cyan)] text-sm font-medium tracking-wide">
              SEO Content Analysis
            </span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Article QA Tool
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Parse, analyze, and publish articles with AI-powered quality checks
          </p>
        </header>

        {/* URL Input Card */}
        <div className="glass-card rounded-2xl p-6 mb-8 animate-fade-in-delay-1">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <Input
                type="url"
                placeholder="Paste Google Docs URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full h-14 pl-12 pr-4 !bg-zinc-900 !border-zinc-700 text-white placeholder:text-zinc-500 text-base rounded-xl focus:!bg-zinc-800 focus:!border-cyan-500"
              />
            </div>
            <Button
              onClick={handleParse}
              disabled={loading || !url}
              className="h-14 px-8 bg-[var(--cyan)] hover:bg-[var(--cyan)]/90 text-black font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Parsing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Analyze
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="glass-card rounded-xl p-4 mb-8 border-red-500/30 bg-red-500/10 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-red-300/80 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {uploadResult && (
          <div className="glass-card rounded-xl p-4 mb-8 border-emerald-500/30 bg-emerald-500/10 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-emerald-400 font-medium">Upload Complete</p>
                <p className="text-emerald-300/80 text-sm mono">{uploadResult}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {article && (
          <div className="animate-fade-in-delay-2">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="w-full grid grid-cols-5 h-14 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {["Overview", "Quality", "AI Analysis", "WordPress", "Preview"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab.toLowerCase().replace(" ", "-")}
                    className="h-full rounded-lg text-zinc-400 font-medium data-[state=active]:bg-[var(--cyan)]/15 data-[state=active]:text-[var(--cyan)] transition-all"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Stats Cards */}
                  <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--cyan)]/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[var(--cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-white font-semibold">Article Stats</h3>
                    </div>
                    <div className="space-y-3">
                      <StatRow label="Words" value={checks?.wordCount || 0} />
                      <StatRow label="Paragraphs" value={checks?.paragraphCount || 0} />
                      <StatRow label="Images" value={checks?.imageCount || 0} />
                      <StatRow label="Links" value={checks?.linkCount || 0} />
                    </div>
                  </div>

                  {/* Title Card */}
                  <div className="glass-card rounded-2xl p-6 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </div>
                      <h3 className="text-white font-semibold">Content</h3>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3 leading-tight">{article.title}</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">
                      {article.textContent.slice(0, 300)}...
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4">Quick Status</h3>
                  <div className="flex flex-wrap gap-3">
                    <StatusBadge ok={checks?.hasH1} label="H1 Heading" />
                    <StatusBadge ok={checks?.hasMetaTitle} label="Meta Title" />
                    <StatusBadge ok={checks?.hasMetaDescription} label="Meta Description" />
                    <StatusBadge
                      ok={checks?.issues.length === 0}
                      label={checks?.issues.length === 0 ? "All Checks Pass" : `${checks?.issues.length} Issues`}
                    />
                  </div>

                  {checks && checks.issues.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <h4 className="text-zinc-400 text-sm font-medium mb-3">Issues Found</h4>
                      <div className="space-y-2">
                        {checks.issues.map((issue, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span className="text-zinc-300">{issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Quality Tab */}
              <TabsContent value="quality" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Images */}
                  <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold">Images</h3>
                      <span className="px-3 py-1 rounded-full bg-white/5 text-zinc-400 text-sm">
                        {checks?.imageCount} found
                      </span>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {checks?.images.map((img, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className={img.isGoogleDrive ? "badge-success" : "badge-error"}>
                              {img.isGoogleDrive ? "Google Drive" : "External"}
                            </span>
                            <span className={img.isPubliclyAccessible ? "badge-success" : "badge-error"}>
                              {img.isPubliclyAccessible ? "Public" : "Private"}
                            </span>
                            <span className={img.alt ? "badge-info" : "badge-warning"}>
                              {img.alt ? "Has Alt" : "No Alt"}
                            </span>
                          </div>
                          <p className="text-zinc-300 text-sm mb-1">
                            <span className="text-zinc-500">Alt:</span> {img.alt || "(none)"}
                          </p>
                          <p className="text-zinc-500 text-xs mono truncate">{img.src.slice(0, 60)}...</p>
                        </div>
                      ))}
                      {checks?.imageCount === 0 && (
                        <p className="text-zinc-500 text-center py-8">No images found</p>
                      )}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold">Links</h3>
                      <span className="px-3 py-1 rounded-full bg-white/5 text-zinc-400 text-sm">
                        {checks?.linkCount} found
                      </span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {checks?.links.map((link, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] group hover:border-[var(--cyan)]/30 transition-colors">
                          <p className="text-zinc-200 text-sm font-medium mb-1 group-hover:text-[var(--cyan)] transition-colors">
                            {link.text || "(no text)"}
                          </p>
                          <p className="text-zinc-500 text-xs mono truncate">{link.href}</p>
                        </div>
                      ))}
                      {checks?.linkCount === 0 && (
                        <p className="text-zinc-500 text-center py-8">No links found</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* AI Analysis Tab */}
              <TabsContent value="ai-analysis" className="space-y-6">
                {!ai ? (
                  <div className="glass-card rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--cyan)]/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-[var(--cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">AI-Powered Analysis</h3>
                    <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                      Get intelligent feedback on readability, SEO optimization, and content quality
                    </p>
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="h-12 px-8 bg-gradient-to-r from-[var(--cyan)] to-emerald-400 hover:opacity-90 text-black font-semibold rounded-xl"
                    >
                      {analyzing ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Analyzing...
                        </span>
                      ) : (
                        "Run AI Analysis"
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Score Cards */}
                    <div className="grid grid-cols-3 gap-6">
                      <ScoreCard title="Overall" score={ai.overallScore} color="cyan" />
                      <ScoreCard title="Readability" score={ai.readabilityScore} color="purple" />
                      <ScoreCard title="SEO" score={ai.seoScore} color="amber" />
                    </div>

                    {/* Summary */}
                    <div className="glass-card rounded-2xl p-6">
                      <h3 className="text-white font-semibold mb-3">Summary</h3>
                      <p className="text-zinc-300 leading-relaxed">{ai.summary}</p>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="glass-card rounded-2xl p-6 border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 className="text-emerald-400 font-semibold">Strengths</h3>
                        </div>
                        <ul className="space-y-2">
                          {ai.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                              <span className="text-emerald-400 mt-1">✓</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="glass-card rounded-2xl p-6 border-amber-500/20">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <h3 className="text-amber-400 font-semibold">Improvements</h3>
                        </div>
                        <ul className="space-y-2">
                          {ai.improvements.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                              <span className="text-amber-400 mt-1">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Product Link Analysis */}
                    <div className="glass-card rounded-2xl p-6">
                      <h3 className="text-white font-semibold mb-3">Product Link Analysis</h3>
                      <p className="text-zinc-300 leading-relaxed">{ai.productLinkAnalysis}</p>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* WordPress Tab */}
              <TabsContent value="wordpress" className="space-y-6">
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.54.82-2.771.82-3.864 0-.405-.026-.78-.07-1.109m-7.981.105c.647-.034 1.232-.1 1.232-.1.582-.075.514-.93-.067-.898 0 0-1.755.138-2.883.138-.585 0-1.562-.062-2.469-.1l-.083.003c.756-.112 1.53-.17 2.305-.17.605 0 1.203.026 1.965.127m-5.603 1.47c.647-.035 1.232-.1 1.232-.1.583-.075.514-.93-.067-.898 0 0-1.755.137-2.883.137-.586 0-1.561-.062-2.469-.1-.205-.017-.402-.031-.59-.043L3.102 6.89c.605-.112 1.178-.17 2.193-.17 1.203 0 2.443.111 3.59.38m7.332 10.68l-2.4-6.93-.029-.083c-.245-.706-.406-1.308-.406-1.823 0-.667.333-.986.79-1.082.142-.03.296-.042.457-.042.62 0 1.276.232 1.276.232l-.145-.695-.097-.466a8.94 8.94 0 00-1.034-.06c-.89 0-1.502.226-1.93.638-.398.385-.617.928-.617 1.558 0 .557.11 1.052.287 1.535l3.848 10.218zm-3.93-9.784l-2.656 7.72-2.534-7.456-.064-.193c-.254-.76-.42-1.378-.42-1.922 0-.707.33-1.057.774-1.166.152-.038.314-.057.485-.057.63 0 1.273.227 1.273.227l-.142-.683-.1-.482c-.32-.025-.647-.038-.98-.038-.872 0-1.473.226-1.894.635-.399.388-.614.934-.614 1.566 0 .548.11 1.04.276 1.513l3.596 9.336z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">WordPress Export</h3>
                      <p className="text-zinc-400 text-sm">Ready to publish</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-zinc-400 text-sm font-medium mb-2">Meta Title</label>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <p className="text-white">{article.metaTitle || "(not set)"}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-sm font-medium mb-2">Meta Description</label>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <p className="text-zinc-300">{article.metaDescription || "(not set)"}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-sm font-medium mb-2">Article Title</label>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <p className="text-white font-medium">{article.title}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-sm font-medium mb-2">
                        Article HTML
                        <span className="text-zinc-500 font-normal ml-2">
                          ({article.htmlContent.length.toLocaleString()} characters)
                        </span>
                      </label>
                      <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] max-h-48 overflow-y-auto">
                        <pre className="text-zinc-400 text-xs mono whitespace-pre-wrap">
                          {article.htmlContent.slice(0, 2000)}
                          {article.htmlContent.length > 2000 && "..."}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full h-14 mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload to WordPress
                      </span>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Preview Tab */}
              <TabsContent value="preview">
                <div className="glass-card rounded-2xl p-8">
                  <h3 className="text-white font-semibold mb-6 pb-4 border-b border-white/10">Article Preview</h3>
                  <div
                    className="prose-dark max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Empty State */}
        {!article && !loading && (
          <div className="text-center py-20 animate-fade-in-delay-2">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-400 mb-2">No article loaded</h3>
            <p className="text-zinc-500">Paste a Google Docs URL above to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className="text-white font-semibold mono">{value.toLocaleString()}</span>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        ok
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-red-500/10 text-red-400 border border-red-500/20"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      {label}
    </span>
  );
}

function ScoreCard({ title, score, color }: { title: string; score: number; color: string }) {
  const colorMap: Record<string, { ring: string; text: string; bg: string }> = {
    cyan: { ring: "stroke-[var(--cyan)]", text: "text-[var(--cyan)]", bg: "bg-[var(--cyan)]/10" },
    purple: { ring: "stroke-purple-400", text: "text-purple-400", bg: "bg-purple-500/10" },
    amber: { ring: "stroke-amber-400", text: "text-amber-400", bg: "bg-amber-500/10" },
  };

  const colors = colorMap[color] || colorMap.cyan;
  const percentage = (score / 10) * 100;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="glass-card rounded-2xl p-6 text-center">
      <div className="relative w-28 h-28 mx-auto mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-white/[0.06]"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={`${colors.ring} score-ring`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${colors.text}`}>{score}</span>
        </div>
      </div>
      <p className="text-zinc-400 font-medium">{title}</p>
    </div>
  );
}
