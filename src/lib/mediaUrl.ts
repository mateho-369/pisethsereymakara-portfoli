const VIDEO_EXTENSION = /\.(?:mp4|webm|ogv|ogg|mov|m4v)(?:[?#].*)?$/i;
const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;

export const isVideoUrl = (url: string) => VIDEO_EXTENSION.test(url);
export const isImageUrl = (url: string) => IMAGE_EXTENSION.test(url);
