import { NextResponse } from "next/server";

// Base64 mock contents
const MOCK_JPG = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAADklEQVR42mP8z8BQz0AEYBhcAFM+7t4AAAAASUVORK5CYII="; // Tiny red square PNG as placeholder
const MOCK_PDF = "JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PgplbmRvYmoKMiAwIG9iagogIDw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbIDMgMCBSIF0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKICA8PCAvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUgODQyIF0gL1Jlc291cmNlcyA8PCA+PiAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKICA8PCAvTGVuZ3RoIDU0ID4+CnN0cmVhbQpCVAovRjEgMjQgVGYKMTAwIDcwMCBUZApKKFNhbXBsZSBQREYgRG9jdW1lbnQgZm9yIFByZXZpZXcpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE4IDAwMDAwIG4gCjAwMDAwMDAwNjkgMDAwMDAgbiAKMDAwMDAwMDEyNyAwMDAwMCBuIAowMDAwMDAwMjMwIDAwMDAwIG4gCnRyYWlsZXIKICA8PCAvU2l6ZSA1IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgogMzMzCiUlRU9GCg=="; // Minimal valid PDF
const MOCK_MD = `# Preview Manager Demo

Welcome to the Preview Manager! This markdown file is loaded from your Mock Zata Storage Endpoint.

## Features
- Browsing files
- Direct previewing of images, PDFs, and text documents
- Direct downloading

This is a **Markdown** content demonstration. You should see formatting like *italics*, **bold**, and lists.
`;
const MOCK_JSON = `{
  "appName": "Preview Manager",
  "version": "1.0.0",
  "environment": "mock",
  "features": [
    "endpoint-config",
    "file-browser",
    "file-previews",
    "file-downloads"
  ],
  "author": "Antigravity",
  "license": "MIT"
}`;
const MOCK_XYZ = "01010101 BINARY DATA NOT PREVIEWABLE BY DEFAULT TEXT PREVIEWERS 01010101";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) {
    return new Response("Unauthorized: Missing token", { status: 401 });
  }

  const { fileId } = await params;

  if (fileId === "beach_sunset.jpg") {
    const buffer = Buffer.from(MOCK_JPG, "base64");
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png", // We serve PNG for the red square but with JPG extension
        "Content-Disposition": 'inline; filename="beach_sunset.jpg"',
      },
    });
  }

  if (fileId === "financial_report.pdf") {
    const buffer = Buffer.from(MOCK_PDF, "base64");
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="financial_report.pdf"',
      },
    });
  }

  if (fileId === "readme.md") {
    return new Response(MOCK_MD, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'inline; filename="readme.md"',
      },
    });
  }

  if (fileId === "config.json") {
    return new Response(MOCK_JSON, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'inline; filename="config.json"',
      },
    });
  }

  if (fileId === "unsupported_data.xyz") {
    return new Response(MOCK_XYZ, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="unsupported_data.xyz"',
      },
    });
  }

  return new Response("File Not Found", { status: 404 });
}
