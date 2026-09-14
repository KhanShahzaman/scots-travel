import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-route";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function extensionFromFilename(filename) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg"].includes(ext)) return "jpg";
  if (["png", "webp", "avif"].includes(ext)) return ext;
  return "";
}

export async function POST(request) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const byMime = ALLOWED_MIME_TO_EXT[file.type];
    const byName = extensionFromFilename(file.name || "");
    const extension = byMime || byName;

    if (!extension) {
      return NextResponse.json(
        { error: "Unsupported image format. Use JPG, PNG, WEBP, or AVIF." },
        { status: 400 },
      );
    }

    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "vehicles");
    await mkdir(uploadDirectory, { recursive: true });

    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    const outputPath = path.join(uploadDirectory, filename);

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(outputPath, Buffer.from(arrayBuffer));

    const url = `/uploads/vehicles/${filename}`;

    return NextResponse.json({
      url,
      publicId: filename,
      size: file.size,
      mimeType: file.type || `image/${extension}`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not upload image." }, { status: 500 });
  }
}
