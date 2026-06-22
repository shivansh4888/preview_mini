import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const endpoints = await db.endpoint.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(endpoints);
  } catch (error) {
    console.error("Failed to fetch endpoints:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, endpointUrl, token, accessKeyId, secretKey, bucket } = body;

    if (!name || !endpointUrl) {
      return NextResponse.json({ error: "Name and Endpoint URL are required" }, { status: 400 });
    }

    // Must have either (accessKeyId + secretKey + bucket) for S3 mode OR token for HTTP mode
    const isS3 = accessKeyId && secretKey;
    if (!isS3 && !token) {
      return NextResponse.json(
        { error: "For S3 mode provide Access Key ID, Secret Key, and Bucket. For HTTP mode provide a Token." },
        { status: 400 }
      );
    }

    try { new URL(endpointUrl); } catch {
      return NextResponse.json({ error: "Invalid Endpoint URL format" }, { status: 400 });
    }

    const endpoint = await db.endpoint.create({
      data: {
        name,
        endpointUrl,
        token: token || "",
        accessKeyId: accessKeyId || "",
        secretKey: secretKey || "",
        bucket: bucket || "",
      },
    });

    return NextResponse.json(endpoint, { status: 201 });
  } catch (error) {
    console.error("Failed to create endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
