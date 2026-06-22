import { NextResponse } from "next/server";
import { createS3Client } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpointUrl, token, accessKeyId, secretKey, bucket } = body;

    if (!endpointUrl) {
      return NextResponse.json({ error: "Endpoint URL is required" }, { status: 400 });
    }

    try {
      new URL(endpointUrl);
    } catch {
      return NextResponse.json({ error: "Invalid Endpoint URL format" }, { status: 400 });
    }

    // ---------- S3 mode ----------
    if (accessKeyId && secretKey) {
      if (!bucket) {
        return NextResponse.json({ error: "Bucket name is required for S3 mode" }, { status: 400 });
      }
      try {
        const s3 = createS3Client(endpointUrl, accessKeyId, secretKey);
        await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
        return NextResponse.json({
          status: "connected",
          message: "S3 connection successful. Credentials and bucket verified.",
        });
      } catch (err: any) {
        console.error("S3 test failed:", err);
        return NextResponse.json({
          status: "failed",
          message: `S3 Error: ${err?.message || "Connection failed"}`,
        });
      }
    }

    // ---------- Generic HTTP mode ----------
    if (!token) {
      return NextResponse.json({ error: "Token is required for generic HTTP endpoints" }, { status: 400 });
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": token,
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
