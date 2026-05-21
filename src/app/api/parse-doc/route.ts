import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type {
  ArticleData,
  ImageInfo,
  LinkInfo,
  ProgrammaticChecks,
  ParseResponse,
} from "@/types/article";

// Config for quality thresholds
const CONFIG = {
  minImages: 2,
  maxImages: 10,
  minLinks: 3,
  maxLinks: 15,
  minWordCount: 500,
};

function extractGoogleDocId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function fetchGoogleDocHtml(docId: string): Promise<string> {
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
  const response = await fetch(exportUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.status}`);
  }

  return response.text();
}

async function checkImageAccessibility(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

function isGoogleDriveUrl(url: string): boolean {
  return (
    url.includes("drive.google.com") ||
    url.includes("googleusercontent.com") ||
    url.includes("lh3.google.com") ||
    url.includes("lh4.google.com") ||
    url.includes("lh5.google.com") ||
    url.includes("lh6.google.com")
  );
}

async function parseDocument(html: string): Promise<ArticleData> {
  const $ = cheerio.load(html);

  // Remove Google Docs styling artifacts
  $("style").remove();
  $("script").remove();

  // Extract title (first h1 or first large text)
  const title =
    $("h1").first().text().trim() ||
    $("p")
      .first()
      .find("span[style*='font-size']")
      .first()
      .text()
      .trim() ||
    $("p").first().text().trim() ||
    "Untitled Article";

  // Extract meta title and description (often in first few lines or comments)
  // In Google Docs, these might be marked specially or be the first lines
  let metaTitle = "";
  let metaDescription = "";

  // Look for meta patterns in the content
  $("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.toLowerCase().startsWith("meta title:")) {
      metaTitle = text.replace(/meta title:/i, "").trim();
    }
    if (text.toLowerCase().startsWith("meta description:")) {
      metaDescription = text.replace(/meta description:/i, "").trim();
    }
    if (text.toLowerCase().startsWith("title:") && !metaTitle) {
      metaTitle = text.replace(/title:/i, "").trim();
    }
    if (text.toLowerCase().startsWith("description:") && !metaDescription) {
      metaDescription = text.replace(/description:/i, "").trim();
    }
  });

  // Fallback: use article title as meta title
  if (!metaTitle) {
    metaTitle = title;
  }

  // Extract images
  const images: ImageInfo[] = [];
  const imagePromises: Promise<void>[] = [];

  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";
    const isGoogleDrive = isGoogleDriveUrl(src);

    const imageInfo: ImageInfo = {
      src,
      alt,
      isGoogleDrive,
      isPubliclyAccessible: null,
    };

    images.push(imageInfo);

    // Check accessibility in parallel
    if (src) {
      imagePromises.push(
        checkImageAccessibility(src).then((accessible) => {
          imageInfo.isPubliclyAccessible = accessible;
        })
      );
    }
  });

  // Wait for all image checks
  await Promise.all(imagePromises);

  // Extract links
  const links: LinkInfo[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    if (href && !href.startsWith("#")) {
      links.push({
        href,
        text,
        isProductLink: null, // Will be determined by AI
      });
    }
  });

  // Extract text content
  const textContent = $("body").text().replace(/\s+/g, " ").trim();

  // Get HTML content (cleaned)
  const htmlContent = $("body").html() || "";

  // Count paragraphs and words
  const paragraphCount = $("p").length;
  const wordCount = textContent.split(/\s+/).filter((w) => w.length > 0).length;

  // Check for H1
  const hasH1 = $("h1").length > 0;

  // Identify issues
  const issues: string[] = [];

  if (images.length < CONFIG.minImages) {
    issues.push(
      `Too few images: ${images.length} (minimum recommended: ${CONFIG.minImages})`
    );
  }
  if (images.length > CONFIG.maxImages) {
    issues.push(
      `Too many images: ${images.length} (maximum recommended: ${CONFIG.maxImages})`
    );
  }

  const nonGoogleDriveImages = images.filter((img) => !img.isGoogleDrive);
  if (nonGoogleDriveImages.length > 0) {
    issues.push(
      `${nonGoogleDriveImages.length} image(s) not hosted on Google Drive`
    );
  }

  const inaccessibleImages = images.filter(
    (img) => img.isPubliclyAccessible === false
  );
  if (inaccessibleImages.length > 0) {
    issues.push(`${inaccessibleImages.length} image(s) not publicly accessible`);
  }

  const imagesWithoutAlt = images.filter((img) => !img.alt);
  if (imagesWithoutAlt.length > 0) {
    issues.push(`${imagesWithoutAlt.length} image(s) missing alt text`);
  }

  if (links.length < CONFIG.minLinks) {
    issues.push(
      `Too few links: ${links.length} (minimum recommended: ${CONFIG.minLinks})`
    );
  }
  if (links.length > CONFIG.maxLinks) {
    issues.push(
      `Too many links: ${links.length} (maximum recommended: ${CONFIG.maxLinks})`
    );
  }

  if (!hasH1) {
    issues.push("Missing H1 heading");
  }

  if (wordCount < CONFIG.minWordCount) {
    issues.push(
      `Article too short: ${wordCount} words (minimum recommended: ${CONFIG.minWordCount})`
    );
  }

  if (!metaDescription) {
    issues.push("Missing meta description");
  }

  const programmaticChecks: ProgrammaticChecks = {
    imageCount: images.length,
    linkCount: links.length,
    hasH1,
    hasMetaTitle: !!metaTitle,
    hasMetaDescription: !!metaDescription,
    paragraphCount,
    wordCount,
    images,
    links,
    issues,
  };

  return {
    title,
    metaTitle,
    metaDescription,
    htmlContent,
    textContent,
    programmaticChecks,
    aiAnalysis: null,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ParseResponse>> {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const docId = extractGoogleDocId(url);
    if (!docId) {
      return NextResponse.json(
        { success: false, error: "Invalid Google Docs URL" },
        { status: 400 }
      );
    }

    const html = await fetchGoogleDocHtml(docId);
    const articleData = await parseDocument(html);

    return NextResponse.json({ success: true, data: articleData });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse document",
      },
      { status: 500 }
    );
  }
}
