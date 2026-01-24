import { createImage } from "@/services/aiClient";

export async function getRoomCardImage(topic: string) {
  const { images } = await createImage({
    prompt: `High quality game card illustration of ${topic}`,
    size: "512x512",
    n: 1,
    format: "png",
  });
  return images[0]?.dataUrl ?? null;
}

// Back-compat wrapper for any old imports
class RoomImageDataService {
  async getRoomCardImage(topic: string) {
    return getRoomCardImage(topic);
  }
}

export const roomImageService = new RoomImageDataService();
export default roomImageService;