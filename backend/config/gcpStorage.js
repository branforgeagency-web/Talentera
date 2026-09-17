const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");

let storageInstance = null;
let bucketInstance = null;

function resolveKeyPath(filepath) {
  if (!filepath) return null;
  if (path.isAbsolute(filepath) && fs.existsSync(filepath)) return filepath;
  const relativeToBackend = path.join(__dirname, "..", filepath);
  if (fs.existsSync(relativeToBackend)) return relativeToBackend;
  const relativeToCwd = path.resolve(filepath);
  if (fs.existsSync(relativeToCwd)) return relativeToCwd;
  return null;
}

/**
 * Checks if GCP Cloud Storage credentials and bucket are configured in environment.
 */
function isGcpConfigured() {
  const bucketName = process.env.GCP_STORAGE_BUCKET;
  if (!bucketName) return false;

  // 1. Base64 encoded JSON credentials
  if (process.env.GCP_CREDENTIALS_BASE64) {
    try {
      const decoded = Buffer.from(process.env.GCP_CREDENTIALS_BASE64, "base64").toString("utf8");
      JSON.parse(decoded);
      return true;
    } catch {
      return false;
    }
  }

  // 2. Raw JSON credentials string
  if (process.env.GCP_CREDENTIALS_JSON) {
    try {
      JSON.parse(process.env.GCP_CREDENTIALS_JSON);
      return true;
    } catch {
      return false;
    }
  }

  // 3. Direct credentials via env
  if (process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) return true;

  // 4. JSON Key file path
  const keyPath = resolveKeyPath(process.env.GCP_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (keyPath) return true;

  // 5. Default Google ADC with project ID
  if (process.env.GCP_PROJECT_ID) return true;

  return false;
}

/**
 * Initializes and returns the GCP Storage client and target Bucket.
 */
function getGcpBucket() {
  if (bucketInstance) return bucketInstance;

  const bucketName = process.env.GCP_STORAGE_BUCKET;
  if (!bucketName) return null;

  const storageOptions = {};

  if (process.env.GCP_PROJECT_ID) {
    storageOptions.projectId = process.env.GCP_PROJECT_ID;
  }

  const keyPath = resolveKeyPath(process.env.GCP_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (process.env.GCP_CREDENTIALS_BASE64) {
    try {
      const decoded = Buffer.from(process.env.GCP_CREDENTIALS_BASE64, "base64").toString("utf8");
      storageOptions.credentials = JSON.parse(decoded);
    } catch (e) {
      console.error("[STORAGE:GCP] Failed to parse GCP_CREDENTIALS_BASE64:", e.message);
    }
  } else if (process.env.GCP_CREDENTIALS_JSON) {
    try {
      storageOptions.credentials = JSON.parse(process.env.GCP_CREDENTIALS_JSON);
    } catch (e) {
      console.error("[STORAGE:GCP] Failed to parse GCP_CREDENTIALS_JSON:", e.message);
    }
  } else if (keyPath) {
    storageOptions.keyFilename = keyPath;
  } else if (process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
    let pKey = process.env.GCP_PRIVATE_KEY.trim();
    // Strip wrapping single or double quotes if present
    if ((pKey.startsWith('"') && pKey.endsWith('"')) || (pKey.startsWith("'") && pKey.endsWith("'"))) {
      pKey = pKey.slice(1, -1);
    }
    // Convert escaped literal \n to real newlines and strip \r
    pKey = pKey.replace(/\\n/g, "\n").replace(/\r/g, "");

    storageOptions.credentials = {
      client_email: process.env.GCP_CLIENT_EMAIL.trim(),
      private_key: pKey,
    };
  }

  try {
    storageInstance = new Storage(storageOptions);
    bucketInstance = storageInstance.bucket(bucketName);
    return bucketInstance;
  } catch (err) {
    console.error("[STORAGE:GCP] Error creating storage instance:", err.message);
    return null;
  }
}

/**
 * Uploads a memory buffer directly to Google Cloud Storage.
 * @param {Buffer} buffer - File buffer from req.file.buffer
 * @param {Object} options - Upload options (folder, originalname, mimetype, makePublic)
 * @returns {Promise<{fileUrl: string, filename: string, bucket: string}>}
 */
async function uploadBufferToGcp(buffer, options = {}) {
  const bucket = getGcpBucket();
  if (!bucket) {
    throw new Error("GCP Storage bucket is not configured. Check GCP_STORAGE_BUCKET in .env");
  }

  const folder = options.folder || "talentera";
  const originalName = options.originalname || "file.bin";
  const cleanOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const gcsFileName = `${folder}/${Date.now()}-${cleanOriginalName}`;
  const file = bucket.file(gcsFileName);

  return new Promise((resolve, reject) => {
    const stream = file.createWriteStream({
      resumable: false,
      metadata: {
        contentType: options.mimetype || "application/octet-stream",
        cacheControl: "public, max-age=31536000",
      },
    });

    stream.on("error", (err) => {
      reject(err);
    });

    stream.on("finish", async () => {
      try {
        // Attempt to make public if bucket permissions allow ACLs
        if (options.makePublic !== false) {
          try {
            await file.makePublic();
          } catch (aclErr) {
            // Bucket might use Uniform Bucket-Level Access (UBLA), where individual ACL makePublic isn't needed
            // if the bucket/allUsers has Storage Object Viewer permission.
          }
        }

        const bucketName = process.env.GCP_STORAGE_BUCKET;
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;

        resolve({
          fileUrl: publicUrl,
          filename: gcsFileName,
          bucket: bucketName,
        });
      } catch (postErr) {
        reject(postErr);
      }
    });

    stream.end(buffer);
  });
}

module.exports = {
  isGcpConfigured,
  getGcpBucket,
  uploadBufferToGcp,
};
