import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createS3Client, isS3Mode } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const endpoint = await db.endpoint.findUnique({ where: { id } });
    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    // ---------- S3 mode (Zata.ai / S3-compatible) ----------
    if (isS3Mode(endpoint)) {
      try {
        const s3 = createS3Client(endpoint.endpointUrl, endpoint.accessKeyId, endpoint.secretKey);
        // List at most 1 object to verify credentials and bucket access
        await s3.send(new ListObjectsV2Command({ Bucket: endpoint.bucket, MaxKeys: 1 }));
        return NextResponse.json({
          status: "connected",
          message: "S3 connection successful. Credentials and bucket verified.",
        });
      } catch (err: any) {
        console.error("S3 connection test failed:", err);
        const msg = err?.message || "S3 connection failed";
        return NextResponse.json({
          status: "failed",
          message: `S3 Error: ${msg}`,
        });
      }
    }

    // ---------- Generic HTTP mode (mock / custom REST) ----------
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(endpoint.endpointUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${endpoint.token}`,
          "x-api-key": endpoint.token,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return NextResponse.json({ status: "connected", statusCode: response.status, message: "Connection successful" });
      } else {
        return NextResponse.json({ status: "failed", statusCode: response.status, message: `HTTP ${response.status}: ${response.statusText}` });
      }
    } catch (fetchError: any) {
      return NextResponse.json({
        status: "failed",
        message: fetchError.name === "AbortError" ? "Connection timed out" : fetchError.message || "Network error",
      });
    }
  } catch (error) {
    console.error("Test connection route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
