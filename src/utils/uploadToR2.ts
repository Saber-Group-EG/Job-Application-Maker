import axios from 'axios';

const BACKEND_URL =
  import.meta.env.VITE_FORM_URL || 'https://application-maker.onrender.com/api';

export async function uploadToR2(file: File, folder = 'JobApplications'): Promise<string> {
  const maxRetries = 3;
  let attempt = 0;
  let lastError: any;

  while (attempt < maxRetries) {
    try {
      let presignData;
      try {
        const { data } = await axios.post(
          `${BACKEND_URL.replace(/\/$/, '')}/upload/presign`,
          { name: file.name, type: file.type, folder },
          { timeout: 30000 }
        );
        presignData = data;
      } catch (err: any) {
        const detail = err.response
          ? `Server responded ${err.response.status}: ${JSON.stringify(err.response.data)}`
          : err.request
            ? `No response received from server (${err.code || 'unknown'}): ${err.message}`
            : err.message;
        throw new Error(`Presign step failed — ${detail}`);
      }

      const { presignedUrl, publicUrl } = presignData;

      if (!presignedUrl || !presignedUrl.startsWith('https://')) {
        throw new Error(`Invalid presigned URL received: ${presignedUrl}`);
      }

      const uploadResult = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.timeout = 180000;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            console.log(`${Math.round((e.loaded / e.total) * 100)}%`);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(publicUrl as string);
          } else {
            reject(
              new Error(
                `R2 rejected upload — status ${xhr.status} ${xhr.statusText}: ${xhr.responseText || '(empty body)'}`
              )
            );
          }
        };

        xhr.onerror = () => {
          reject(
            new Error(
              `Browser blocked or dropped the request before any response (readyState ${xhr.readyState}, status ${xhr.status}). ` +
                `Common causes: ad blocker/extension, corporate/school network filtering, offline connection, or DNS failure resolving the R2 endpoint.`
            )
          );
        };
        xhr.ontimeout = () =>
          reject(
            new Error(
              `Upload timed out after 180s (file size: ${(file.size / 1e6).toFixed(1)}MB) — likely a slow or unstable connection.`
            )
          );
        xhr.send(file);
      });

      return uploadResult;
    } catch (error: any) {
      lastError = error;
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(
          `Upload failed after ${maxRetries} attempts. Last error: ${lastError.message}`
        );
      }
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error(`Upload failed after ${maxRetries} attempts`);
}
