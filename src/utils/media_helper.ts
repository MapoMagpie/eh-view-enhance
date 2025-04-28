const PICTURE_EXTENSION = ["jpeg", "jpg", "png", "gif", "webp", "bmp", "avif", "jxl"];
const VIDEO_EXTENSION = ["mp4", "webm", "ogg", "ogv", "mov", "avi", "mkv", "av1"];

export function isImage(ext: string) {
  return PICTURE_EXTENSION.includes(ext);
}
export function isVideo(ext: string) {
  return VIDEO_EXTENSION.includes(ext);
}
