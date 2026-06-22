import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const endpoint = await db.endpoint.findUnique({ where: { id } });
    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }
    return NextResponse.json(endpoint);
  } catch (error) {
    console.error("Failed to fetch endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, endpointUrl, token, accessKeyId, secretKey, bucket } = body;

    if (!name || !endpointUrl) {
      return NextResponse.json({ error: "Name and Endpoint URL are required" }, { status: 400 });
    }

    try { new URL(endpointUrl); } catch {
      return NextResponse.json({ error: "Invalid Endpoint URL format" }, { status: 400 });
    }

    const exists = await db.endpoint.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    const updated = await db.endpoint.update({
      where: { id },
      data: {
        name,
        endpointUrl,
        token: token || "",
        accessKeyId: accessKeyId || "",
        secretKey: secretKey || "",
        bucket: bucket || "",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exists = await db.endpoint.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    await db.endpoint.delete({ where: { id } });

    return NextResponse.json({ message: "Endpoint deleted successfully" });
  } catch (error) {
    console.error("Failed to delete endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
