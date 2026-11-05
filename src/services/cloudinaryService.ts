// Browser -> Cloudinary direct upload with an unsigned preset.
// The cloud name and preset are public by design (they ship in the bundle),
// so they come from VITE_ vars. The API secret must never be used here.
const CLOUD_NAME = (
  (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ?? ''
).trim();
const UPLOAD_PRESET = (
  (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined) ?? ''
).trim();

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: { message?: string };
  message?: string;
};

export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Image upload is not configured: set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  const result = (await response
    .json()
    .catch(() => null)) as CloudinaryUploadResponse | null;

  if (!response.ok || !result?.secure_url) {
    throw new Error(
      result?.error?.message ||
        result?.message ||
        `Cloudinary upload failed (${response.status})`
    );
  }

  return result.secure_url;
}
