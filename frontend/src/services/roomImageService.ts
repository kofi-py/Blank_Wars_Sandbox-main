import { createImage } from "./aiClient";

export async function generateRoomImage(opts: {
  description: string;
  size: "256x256" | "512x512" | "1024x1024";
  n: number;
  style?: string;
}) {
  const prompt = `${opts.description}${opts.style ? `, style: ${opts.style}` : ""}`;
  const { images } = await createImage({
    prompt,
    size: opts.size,
    n: opts.n,
    format: "png",
  });

  if (images.length === 0) {
    throw new Error('Image generation API returned empty images array');
  }

  return images[0].dataUrl;
}

// Back-compat wrapper
class RoomImageServiceThin {
  async generateRoomImage(opts: Parameters<typeof generateRoomImage>[0]) {
    return generateRoomImage(opts);
  }
}

export const roomImageService = new RoomImageServiceThin();
export default roomImageService;