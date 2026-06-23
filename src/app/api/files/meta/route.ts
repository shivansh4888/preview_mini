import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createS3Client, isS3Mode } from "@/lib/s3";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpointId = searchParams.get("endpointId");
    const filename = searchParams.get("filename");

    if (!endpointId || !filename) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const endpoint = await db.endpoint.findUnique({ where: { id: endpointId } });
    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    // ---------- S3 mode ----------
    if (isS3Mode(endpoint)) {
      try {
        const s3 = createS3Client(endpoint.endpointUrl, endpoint.accessKeyId, endpoint.secretKey);
        const response = await s3.send(
          new HeadObjectCommand({ Bucket: endpoint.bucket, Key: filename })
        );
        return NextResponse.json({
          size: response.ContentLength ?? null,
          lastModified: response.LastModified?.toISOString() ?? null,
          contentType: response.ContentType ?? null,
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 502 });
      }
    }

    // ---------- Generic HTTP mode ----------
    try {
      let fileUrl = endpoint.endpointUrl;
      fileUrl = fileUrl.endsWith("/")
        ? `${fileUrl}${encodeURIComponent(filename)}`
        : `${fileUrl}/${encodeURIComponent(filename)}`;

      const response = await fetch(fileUrl, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${endpoint.token}`,
          "x-api-key": endpoint.token,
        },
      });

      return NextResponse.json({
        size: response.headers.get("content-length")
          ? Number(response.headers.get("content-length"))
          : null,
        lastModified: response.headers.get("last-modified") ?? null,
        contentType: response.headers.get("content-type") ?? null,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}