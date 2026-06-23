import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createS3Client, isS3Mode } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg": case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "svg": return "image/svg+xml";
    case "pdf": return "application/pdf";
    case "mp4": return "video/mp4";
    case "webm": return "video/webm";
    case "ogg": return "video/ogg";
    case "mov": return "video/quicktime";
    case "avi": return "video/x-msvideo";
    case "txt": case "log": return "text/plain; charset=utf-8";
    case "json": return "application/json; charset=utf-8";
    case "csv": return "text/csv; charset=utf-8";
    case "xml": return "application/xml; charset=utf-8";
    case "md": return "text/markdown; charset=utf-8";
    default: return "application/octet-stream";
  }
}

function isVideoMime(contentType: string): boolean {
  return contentType.startsWith("video/");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpointId = searchParams.get("endpointId");
    const filename = searchParams.get("filename");

    if (!endpointId || !filename) {
      return NextResponse.json({ error: "Missing required parameters: endpointId and filename" }, { status: 400 });
    }

    const endpoint = await db.endpoint.findUnique({ where: { id: endpointId } });
    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    const rangeHeader = request.headers.get("range");

    // ---------- S3 mode ----------
    if (isS3Mode(endpoint)) {
      try {
        const s3 = createS3Client(endpoint.endpointUrl, endpoint.accessKeyId, endpoint.secretKey);

        const commandInput: { Bucket: string; Key: string; Range?: string } = {
          Bucket: endpoint.bucket,
          Key: filename,
        };
        if (rangeHeader) commandInput.Range = rangeHeader;

        const response = await s3.send(new GetObjectCommand(commandInput));

        const contentType = response.ContentType || getMimeType(filename);
        const body = response.Body;
        if (!body) throw new Error("Empty response from S3");

        const stream = body.transformToWebStream();
        const headers: Record<string, string> = {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filename}"`,
          "Accept-Ranges": "bytes",
        };
        if (response.ContentLength) headers["Content-Length"] = String(response.ContentLength);
        if (response.ContentRange) headers["Content-Range"] = response.ContentRange;

        const status = rangeHeader && response.ContentRange ? 206 : 200;
        return new Response(stream, { status, headers });
      } catch (err: any) {
        console.error("S3 GetObject failed:", err);
        return NextResponse.json({ error: `S3 Error: ${err?.message || "Failed to fetch file"}` }, { status: 502 });
      }
    }

    // ---------- Generic HTTP mode ----------
    try {
      let fileUrl = endpoint.endpointUrl;
      fileUrl = fileUrl.endsWith("/")
        ? `${fileUrl}${encodeURIComponent(filename)}`
        : `${fileUrl}/${encodeURIComponent(filename)}`;

      const fetchHeaders: Record<string, string> = {
        Authorization: `Bearer ${endpoint.token}`,
        "x-api-key": endpoint.token,
      };
      if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

      const response = await fetch(fileUrl, { method: "GET", headers: fetchHeaders });

      if (!response.ok && response.status !== 206) {
        return NextResponse.json(
          { error: `Target endpoint returned ${response.status}: ${response.statusText}` },
          { status: response.status }
        );
      }

      const contentType = response.headers.get("content-type") || getMimeType(filename);
      const responseHeaders: Record<string, string> = {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Accept-Ranges": "bytes",
      };
      const contentLength = response.headers.get("content-length");
      if (contentLength) responseHeaders["Content-Length"] = contentLength;
      const contentRange = response.headers.get("content-range");
      if (contentRange) responseHeaders["Content-Range"] = contentRange;

      // For video, stream directly without buffering the whole file
      if (isVideoMime(contentType) && response.body) {
        return new Response(response.body, {
          status: response.status,
          headers: responseHeaders,
        });
      }

      const data = await response.arrayBuffer();
      return new Response(data, { status: response.status, headers: responseHeaders });
    } catch (fetchError: any) {
      return NextResponse.json({ error: `Failed to fetch file: ${fetchError.message || "Network error"}` }, { status: 502 });
    }
  } catch (error) {
    console.error("Preview API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
