import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { AIAnalysis, AnalyzeResponse, LinkInfo } from "@/types/article";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

const ANALYSIS_PROMPT = `You are an expert SEO content analyst for ecommerce businesses. Analyze the following article and provide a detailed quality assessment.

Your task is to evaluate:
1. **Readability**: Is the content easy to read? Is the structure logical? Are sentences clear?
2. **SEO Quality**: Are there proper headings? Is keyword usage natural? Is the content comprehensive?
3. **Ecommerce Focus**: Does the article effectively support product promotion? Are product mentions natural?
4. **Content Quality**: Is the information accurate and valuable? Does it provide real value to readers?

Also analyze each link and determine if it's a product link (linking to a product page, shop, or purchase) or informational (blog, resource, documentation).

Respond in the following JSON format only, no additional text:
{
  "overallScore": <1-10>,
  "readabilityScore": <1-10>,
  "seoScore": <1-10>,
  "summary": "<2-3 sentence summary of article quality>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", ...],
  "productLinkAnalysis": "<brief analysis of link usage for ecommerce>",
  "linkClassifications": [
    {"href": "<link url>", "isProductLink": <true/false>},
    ...
  ]
}`;

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const { textContent, links } = await request.json();

    if (!textContent) {
      return NextResponse.json(
        { success: false, error: "Article content is required" },
        { status: 400 }
      );
    }

    // Prepare links for analysis
    const linksForAnalysis = (links as LinkInfo[])
      .map((l) => `- ${l.text}: ${l.href}`)
      .join("\n");

    const userMessage = `
ARTICLE CONTENT:
${textContent.slice(0, 8000)}

LINKS IN ARTICLE:
${linksForAnalysis || "No links found"}
`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    const analysisResult = JSON.parse(responseText);

    const analysis: AIAnalysis = {
      overallScore: analysisResult.overallScore,
      readabilityScore: analysisResult.readabilityScore,
      seoScore: analysisResult.seoScore,
      summary: analysisResult.summary,
      strengths: analysisResult.strengths || [],
      improvements: analysisResult.improvements || [],
      productLinkAnalysis: analysisResult.productLinkAnalysis,
    };

    return NextResponse.json({
      success: true,
      analysis,
      linkClassifications: analysisResult.linkClassifications,
    } as AnalyzeResponse & { linkClassifications?: Array<{ href: string; isProductLink: boolean }> });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze article",
      },
      { status: 500 }
    );
  }
}
