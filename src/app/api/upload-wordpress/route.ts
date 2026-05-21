import { NextRequest, NextResponse } from "next/server";

interface WordPressUploadPayload {
  metaTitle: string;
  metaDescription: string;
  articleTitle: string;
  articleHtml: string;
}

interface UploadResponse {
  success: boolean;
  message: string;
  mockPostId?: string;
  mockPostUrl?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const payload: WordPressUploadPayload = await request.json();

    // Validate required fields
    if (!payload.articleTitle || !payload.articleHtml) {
      return NextResponse.json(
        {
          success: false,
          message: "Article title and HTML content are required",
        },
        { status: 400 }
      );
    }

    // Log what would be sent to WordPress
    console.log("=== WORDPRESS UPLOAD TRIGGERED ===");
    console.log("Meta Title:", payload.metaTitle);
    console.log("Meta Description:", payload.metaDescription);
    console.log("Article Title:", payload.articleTitle);
    console.log("HTML Content Length:", payload.articleHtml.length, "characters");
    console.log("==================================");

    // Simulate WordPress API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In a real implementation, this would call the WordPress REST API:
    // POST https://yoursite.com/wp-json/wp/v2/posts
    // Headers: Authorization: Bearer <token>
    // Body: { title, content, status, meta: { _yoast_wpseo_title, _yoast_wpseo_metadesc } }

    // Return mock success response
    const mockPostId = `mock-${Date.now()}`;

    return NextResponse.json({
      success: true,
      message: "Article successfully uploaded to WordPress (mock)",
      mockPostId,
      mockPostUrl: `https://example-wordpress.com/posts/${mockPostId}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload to WordPress",
      },
      { status: 500 }
    );
  }
}
