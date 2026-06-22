import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createS3Client, isS3Mode } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

interface StandardFile {
  filename: string;
  fileType: string;
  fileSize: number;
  lastModified: string;
}

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

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

    // ---------- S3 mode (Zata.ai / S3-compatible) ----------
    if (isS3Mode(endpoint)) {
      try {
        const s3 = createS3Client(endpoint.endpointUrl, endpoint.accessKeyId, endpoint.secretKey);
        const allObjects: StandardFile[] = [];
        let continuationToken: string | undefined;

        // Paginate through all objects in the bucket
        do {
          const command = new ListObjectsV2Command({
            Bucket: endpoint.bucket,
            MaxKeys: 1000,
            ContinuationToken: continuationToken,
          });
          const response = await s3.send(command);

          for (const obj of response.Contents || []) {
            if (!obj.Key) continue;
            // Skip "folder" entries (keys ending with /)
            if (obj.Key.endsWith("/")) continue;

            const name = obj.Key;
            allObjects.push({
              filename: name,
              fileType: getExtension(name),
              fileSize: obj.Size ?? 0,
              lastModified: obj.LastModified?.toISOString() ?? new Date().toISOString(),
            });
          }

          continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
        } while (continuationToken);

        return NextResponse.json(allObjects);
      } catch (err: any) {
        console.error("S3 list objects failed:", err);
        return NextResponse.json(
          { error: `S3 Error: ${err?.message || "Failed to list files"}` },
          { status: 502 }
        );
      }
    }

    // ---------- Generic HTTP mode ----------
    try {
      const response = await fetch(endpoint.endpointUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${endpoint.token}`,
          "x-api-key": endpoint.token,
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Endpoint responded with status ${response.status}: ${response.statusText}` },
          { status: 502 }
        );
      }

      const rawData = await response.json();
      let rawFilesList: any[] = [];

      if (Array.isArray(rawData)) {
        rawFilesList = rawData;
      } else if (rawData && typeof rawData === "object") {
        const arrayProps = ["files", "data", "objects", "contents", "items", "results"];
        for (const prop of arrayProps) {
          if (Array.isArray(rawData[prop])) { rawFilesList = rawData[prop]; break; }
        }
        if (!rawFilesList.length) {
          for (const key of Object.keys(rawData)) {
            if (Array.isArray(rawData[key])) { rawFilesList = rawData[key]; break; }
          }
        }
      }

      const standardized: StandardFile[] = rawFilesList.map((item: any) => {
        const name = item.filename || item.name || item.key || item.path || "unnamed_file";
        let type = item.fileType || item.type || item.mimeType || "";
        if (type.includes("/")) type = type.split("/").pop() || "";
        if (!type || type.length > 5) type = getExtension(name);

        return {
          filename: name,
          fileType: type.toLowerCase(),
          fileSize: Number(item.fileSize ?? item.size ?? item.length) || 0,
          lastModified: item.lastModified || item.updatedAt || new Date().toISOString(),
        };
      });

      return NextResponse.json(standardized);
    } catch (fetchError: any) {
      return NextResponse.json(
        { error: `Failed to query endpoint: ${fetchError.message || "Network error"}` },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Files API route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
