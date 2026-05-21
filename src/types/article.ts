export interface ImageInfo {
  src: string;
  alt: string;
  isGoogleDrive: boolean;
  isPubliclyAccessible: boolean | null; // null = not checked yet
}

export interface LinkInfo {
  href: string;
  text: string;
  isProductLink: boolean | null; // determined by AI
}

export interface ProgrammaticChecks {
  imageCount: number;
  linkCount: number;
  hasH1: boolean;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  paragraphCount: number;
  wordCount: number;
  images: ImageInfo[];
  links: LinkInfo[];
  issues: string[];
}

export interface AIAnalysis {
  overallScore: number; // 1-10
  readabilityScore: number;
  seoScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  productLinkAnalysis: string;
}

export interface ArticleData {
  title: string;
  metaTitle: string;
  metaDescription: string;
  htmlContent: string;
  textContent: string;
  programmaticChecks: ProgrammaticChecks;
  aiAnalysis: AIAnalysis | null;
}

export interface ParseResponse {
  success: boolean;
  data?: ArticleData;
  error?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: AIAnalysis;
  error?: string;
}
