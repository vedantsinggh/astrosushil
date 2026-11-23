/**
 * Which object store the backend talks to, decided from the environment.
 *
 *   STORAGE_PROVIDER=aws    the website's AWS S3 bucket (owner decision for the website integration)
 *   STORAGE_PROVIDER=r2     Cloudflare R2 (the original report storage)
 *   STORAGE_PROVIDER=local  local disk (development and tests only; refused in production)
 *   unset                   R2 when its credentials are present (unchanged behaviour of existing
 *                           deployments), otherwise AWS S3 when fully configured, otherwise local disk
 *
 * A provider that is named but not fully configured resolves to "no remote store", which
 * StorageService treats as a configuration error in production.
 */

export type StorageProviderName = 'aws' | 'r2';

export interface S3Target {
  provider: StorageProviderName;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Virtual-hosted-style host of the bucket, e.g. `astro-sushil.s3.ap-southeast-2.amazonaws.com`. */
  host: string;
}

type Env = Record<string, string | undefined>;

function r2Target(env: Env): S3Target | null {
  const accountId = env.R2_ACCOUNT_ID || env.S3_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID || env.S3_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY || env.S3_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET_NAME || env.S3_BUCKET_NAME || 'astro-sushil-reports';
  const region = env.R2_REGION || env.S3_REGION || 'auto';
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return {
    provider: 'r2',
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    host: `${bucket}.${accountId}.r2.cloudflarestorage.com`,
  };
}

/**
 * AWS S3, using the same variable names as the website backend so its values can be copied over.
 * All four are required: the generic AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY pair alone (often
 * present on a developer machine) never switches storage to S3.
 */
function awsTarget(env: Env): S3Target | null {
  const bucket = env.AWS_STORAGE_BUCKET_NAME;
  const region = env.AWS_S3_REGION_NAME;
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) return null;
  return { provider: 'aws', bucket, region, accessKeyId, secretAccessKey, host: awsBucketHost(bucket, region) };
}

export function awsBucketHost(bucket: string, region: string): string {
  return `${bucket}.s3.${region}.amazonaws.com`;
}

export function resolveStorageTarget(env: Env = process.env): S3Target | null {
  const provider = (env.STORAGE_PROVIDER || '').trim().toLowerCase();
  if (provider === 'local') return null;
  if (provider === 'aws') return awsTarget(env);
  if (provider === 'r2') return r2Target(env);
  return r2Target(env) || awsTarget(env);
}

/**
 * ACL sent with objects stored as `public`. The website bucket serves public files through
 * per-object `public-read` ACLs, so that is the default. Set AWS_S3_PUBLIC_ACL=none when the bucket
 * has ACLs disabled and grants public read on the `assets/` prefix through a bucket policy instead.
 */
export function publicObjectAcl(env: Env = process.env): string | null {
  const value = (env.AWS_S3_PUBLIC_ACL || 'public-read').trim().toLowerCase();
  return value === 'none' || value === '' ? null : value;
}

/**
 * The website bucket's name and region when known, even without credentials (local development
 * with migrated data still has to recognise the absolute URLs stored by the website).
 */
export function knownAwsBucket(env: Env = process.env): { bucket: string; region: string } | null {
  const bucket = env.AWS_STORAGE_BUCKET_NAME;
  const region = env.AWS_S3_REGION_NAME;
  return bucket && region ? { bucket, region } : null;
}
