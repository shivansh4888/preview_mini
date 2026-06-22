import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
  }

  // Support list of files
  const mockFiles = [
    {
      filename: "beach_sunset.jpg",
      fileType: "jpg",
      fileSize: 154200,
      lastModified: "2026-06-20T14:30:00Z"
    },
    {
      filename: "financial_report.pdf",
      fileType: "pdf",
      fileSize: 452000,
      lastModified: "2026-06-21T09:15:00Z"
    },
    {
      filename: "readme.md",
      fileType: "md",
      fileSize: 1250,
      lastModified: "2026-06-22T08:00:00Z"
    },
    {
      filename: "config.json",
      fileType: "json",
      fileSize: 520,
      lastModified: "2026-06-22T10:45:00Z"
    },
    {
      filename: "unsupported_data.xyz",
      fileType: "xyz",
      fileSize: 8400,
      lastModified: "2026-06-19T11:00:00Z"
    }
  ];

  return NextResponse.json(mockFiles);
}
