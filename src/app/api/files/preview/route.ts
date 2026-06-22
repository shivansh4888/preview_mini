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
    case "txt": case "log": return "text/plain; charset=utf-8";
    case "json": return "application/json; charset=utf-8";
    case "csv": return "text/csv; charset=utf-8";
    case "xml": return "application/xml; charset=utf-8";
    case "md": return "text/markdown; charset=utf-8";
    default: return "application/octet-stream";
  }
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

    // ---------- S3 mode ----------
    if (isS3Mode(endpoint)) {
      try {
        const s3 = createS3Client(endpoint.endpointUrl, endpoint.accessKeyId, endpoint.secretKey);
        const response = await s3.send(new GetObjectCommand({ Bucket: endpoint.bucket, Key: filename }));

        const contentType = response.ContentType || getMimeType(filename);
        const body = response.Body;
        if (!body) throw new Error("Empty response from S3");

        // Stream the body
        const stream = body.transformToWebStream();
        return new Response(stream, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${filename}"`,
          },
        });
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

      const response = await fetch(fileUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${endpoint.token}`,
          "x-api-key": endpoint.token,
        },
      });

      if (!response.ok) {
        return NextResponse.json({ error: `Target endpoint returned ${response.status}: ${response.statusText}` }, { status: response.status });
      }

      const data = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || getMimeType(filename);

      return new Response(data, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filename}"`,
        },
      });
    } catch (fetchError: any) {
      return NextResponse.json({ error: `Failed to fetch file: ${fetchError.message || "Network error"}` }, { status: 502 });
    }
  } catch (error) {
    console.error("Preview API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
