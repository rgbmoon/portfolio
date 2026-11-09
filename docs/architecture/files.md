# 5.11 Files

- Cloudflare R2 stores uploaded files (publication media). Case images live in the repository; R2 is not used for them.
- Access goes through the S3 API: the provider changes by configuration. Development uses a separate bucket.
- Files can be uploaded by users with a verified email and trust level 1 or higher, within quotas (section 5.8).
- Only raster images are accepted; sharp re-encodes them. SVG, HTML and other active formats are rejected. Files are
  served with the correct `Content-Type` and `X-Content-Type-Options: nosniff`.
- **Upload:**
  - presigned PUT with a signed `Content-Type` and a lifetime of minutes;
  - the server generates the object key: `{userId}/{uuidv7}`;
  - the bucket CORS policy allows the exact origin and the `PUT` method.
- **R2 limitations:** no presigned POST, so no `content-length-range` — the size is checked after upload. Presigned
  URLs do not work with a custom domain: uploads go to the R2 S3 endpoint, serving goes through a subdomain. Signing
  `Content-Length` in R2 is undocumented — do not rely on it without a test.
- **Confirmation after upload:**
  1. `HeadObject` — size check;
  2. `file-type` — magic bytes check;
  3. sharp — variants and EXIF removal, including geolocation;
  4. status "available".
- A cleanup job removes unconfirmed objects.
- In production files are served from our own subdomain (for example `assets.<domain>`). `r2.dev` — development only:
  its request rate is limited.
- The server does not download files by a user-supplied URL. If this becomes necessary: allowlist, deny private IPs
  after DNS resolution, timeouts, size limit.
