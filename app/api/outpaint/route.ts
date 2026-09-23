import { NextRequest, NextResponse } from "next/server";

// Image generation calls routinely take longer than the platform default;
// give the function room (Vercel Hobby allows up to 60s with Fluid Compute).
export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);

const OUTPAINT_PROMPT =
  "Extend the surrounding background of this image naturally to fill the " +
  "transparent area. Continue the existing scene, lighting, colors, " +
  "textures, and style seamlessly, as if the camera had simply captured a " +
  "wider frame. Do not add any new text, logos, watermarks, people, " +
  "products, or objects — only extend the existing background and " +
  "environment. Photorealistic, seamless blend, no visible seam.";

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Buffer.from(base64, "base64");
}

export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.OPENAI_API_KEY) });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI background extension isn't configured on this deployment yet — add an OPENAI_API_KEY environment variable in your Vercel project settings and redeploy.",
      },
      { status: 501 }
    );
  }

  let body: { imageDataUrl?: string; maskDataUrl?: string; size?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { imageDataUrl, maskDataUrl, size } = body;
  if (!imageDataUrl || !maskDataUrl || !size || !ALLOWED_SIZES.has(size)) {
    return NextResponse.json(
      { error: "Missing or invalid image, mask, or size." },
      { status: 400 }
    );
  }

  const form = new FormData();
  form.set("model", "gpt-image-1");
  form.set("prompt", OUTPAINT_PROMPT);
  form.set("size", size);
  form.set("quality", "medium");
  form.set("n", "1");
  form.set(
    "image",
    new Blob([new Uint8Array(dataUrlToBuffer(imageDataUrl))], { type: "image/png" }),
    "image.png"
  );
  form.set(
    "mask",
    new Blob([new Uint8Array(dataUrlToBuffer(maskDataUrl))], { type: "image/png" }),
    "mask.png"
  );

  let resp: Response;
  try {
    resp = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the image generation service." },
      { status: 502 }
    );
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    let message = `Image generation failed (${resp.status}).`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    return NextResponse.json({ error: message }, { status: resp.status });
  }

  const json = await resp.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) {
    return NextResponse.json(
      { error: "Image generation returned no image." },
      { status: 502 }
    );
  }

  return NextResponse.json({ imageDataUrl: `data:image/png;base64,${b64}` });
}
