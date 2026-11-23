import { describe, it, expect } from 'vitest';
import {
  EMPTY_PAYLOAD_SHA256,
  encodeKeyPath,
  encodeRfc3986,
  presignUrl,
  sha256Hex,
  signRequest,
} from '../../src/services/storage/sigv4';
import { S3ObjectClient, FetchLike, S3RequestError } from '../../src/services/storage/s3-client';
import { S3Target } from '../../src/services/storage/storage-config';

// Published example credentials and requests from the AWS S3 documentation
// ("Signature Calculations for the Authorization Header" and "Authenticating Requests: Using
// Query Parameters"). They are not real credentials.
const credentials = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
};
const host = 'examplebucket.s3.amazonaws.com';
const date = new Date('2013-05-24T00:00:00.000Z');

describe('SigV4 signing against the AWS S3 documentation vectors', () => {
  it('signs GET Object', () => {
    const result = signRequest({
      method: 'GET',
      canonicalUri: '/test.txt',
      headers: {
        host,
        range: 'bytes=0-9',
        'x-amz-content-sha256': EMPTY_PAYLOAD_SHA256,
        'x-amz-date': '20130524T000000Z',
      },
      payloadHash: EMPTY_PAYLOAD_SHA256,
      date,
      credentials,
    });
    expect(result.signedHeaders).toBe('host;range;x-amz-content-sha256;x-amz-date');
    expect(result.signature).toBe('f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
    expect(result.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41'
    );
  });

  it('signs PUT Object with a body and a key that needs encoding', () => {
    const payloadHash = sha256Hex('Welcome to Amazon S3.');
    expect(payloadHash).toBe('44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072');
    const result = signRequest({
      method: 'PUT',
      canonicalUri: `/${encodeKeyPath('test$file.text')}`,
      headers: {
        date: 'Fri, 24 May 2013 00:00:00 GMT',
        host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': '20130524T000000Z',
        'x-amz-storage-class': 'REDUCED_REDUNDANCY',
      },
      payloadHash,
      date,
      credentials,
    });
    expect(result.signature).toBe('98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd');
  });

  it('signs a request with query parameters (List Objects)', () => {
    const result = signRequest({
      method: 'GET',
      canonicalUri: '/',
      query: { prefix: 'J', 'max-keys': '2' },
      headers: { host, 'x-amz-content-sha256': EMPTY_PAYLOAD_SHA256, 'x-amz-date': '20130524T000000Z' },
      payloadHash: EMPTY_PAYLOAD_SHA256,
      date,
      credentials,
    });
    expect(result.signature).toBe('34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7');
  });

  it('signs a request with a valueless query parameter (Get Bucket Lifecycle)', () => {
    const result = signRequest({
      method: 'GET',
      canonicalUri: '/',
      query: { lifecycle: '' },
      headers: { host, 'x-amz-content-sha256': EMPTY_PAYLOAD_SHA256, 'x-amz-date': '20130524T000000Z' },
      payloadHash: EMPTY_PAYLOAD_SHA256,
      date,
      credentials,
    });
    expect(result.signature).toBe('fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543');
  });

  it('presigns a GET URL', () => {
    const url = presignUrl({ method: 'GET', host, canonicalUri: '/test.txt', expiresInSeconds: 86400, date, credentials });
    expect(url).toBe(
      'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'
    );
  });

  it('never presigns for longer than seven days', () => {
    const url = presignUrl({ method: 'GET', host, canonicalUri: '/test.txt', expiresInSeconds: 99999999, date, credentials });
    expect(url).toContain('X-Amz-Expires=604800&');
  });

  it('percent-encodes per RFC 3986 and keeps slashes in key paths', () => {
    expect(encodeRfc3986("a b!'()*~")).toBe('a%20b%21%27%28%29%2A~');
    expect(encodeKeyPath('assets/banner/2026/11/a b.png')).toBe('assets/banner/2026/11/a%20b.png');
  });
});

describe('S3ObjectClient over a fake HTTP layer', () => {
  const target: S3Target = {
    provider: 'aws',
    bucket: 'examplebucket',
    region: 'us-east-1',
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    host,
  };

  function fakeFetch(respond: (url: string, method: string) => Response) {
    const calls: Array<{ url: string; method: string; headers: Record<string, string>; body?: Uint8Array }> = [];
    const impl: FetchLike = async (url, init) => {
      calls.push({ url, method: init.method, headers: init.headers, body: init.body });
      return respond(url, init.method);
    };
    return { calls, impl };
  }

  it('PUTs an object with signed headers; the ACL header is only sent when asked for', async () => {
    const { calls, impl } = fakeFetch(() => new Response(null, { status: 200 }));
    const client = new S3ObjectClient(target, impl, () => date);
    const body = Buffer.from('hello');

    await client.putObject({ key: 'private/digital-product/2026/11/x.pdf', body, contentType: 'application/pdf' });
    await client.putObject({ key: 'assets/banner/2026/11/y.png', body, contentType: 'image/png', acl: 'public-read', cacheControl: 'public, max-age=60' });

    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url).toBe('https://examplebucket.s3.amazonaws.com/private/digital-product/2026/11/x.pdf');
    expect(calls[0].headers['x-amz-acl']).toBeUndefined();
    expect(calls[0].headers['x-amz-content-sha256']).toBe(sha256Hex(body));
    expect(calls[0].headers['content-type']).toBe('application/pdf');
    expect(calls[0].headers.Authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE\/20130524\/us-east-1\/s3\/aws4_request, SignedHeaders=content-length;content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/
    );
    expect(Buffer.from(calls[0].body as Uint8Array).toString()).toBe('hello');

    expect(calls[1].headers['x-amz-acl']).toBe('public-read');
    expect(calls[1].headers.Authorization).toContain('SignedHeaders=cache-control;content-length;content-type;host;x-amz-acl;x-amz-content-sha256;x-amz-date');
  });

  it('sends list requests with the signed query string', async () => {
    const { calls, impl } = fakeFetch(() => new Response('<ListBucketResult></ListBucketResult>', { status: 200 }));
    const client = new S3ObjectClient(target, impl, () => date);
    await client.listKeys('J');
    expect(calls[0].url).toBe('https://examplebucket.s3.amazonaws.com/?list-type=2&prefix=J');
    expect(calls[0].headers.Authorization).toMatch(/Signature=[0-9a-f]{64}$/);
  });

  it('raises on a failed upload and never puts credentials in the error', async () => {
    const { impl } = fakeFetch(() => new Response('<Error><Code>AccessDenied</Code></Error>', { status: 403 }));
    const client = new S3ObjectClient(target, impl, () => date);
    const attempt = client.putObject({ key: 'assets/x.png', body: Buffer.from('x'), contentType: 'image/png' });
    await expect(attempt).rejects.toBeInstanceOf(S3RequestError);
    await expect(attempt).rejects.not.toThrow(/wJalrXUtnFEMI/);
  });

  it('reads metadata, treats a missing object as absent, and accepts deleting a missing object', async () => {
    const { calls, impl } = fakeFetch((url, method) => {
      if (method === 'HEAD' && url.endsWith('/there.pdf')) {
        return new Response(null, { status: 200, headers: { 'content-length': '42', 'content-type': 'application/pdf' } });
      }
      if (method === 'DELETE') return new Response(null, { status: 204 });
      return new Response(null, { status: 404 });
    });
    const client = new S3ObjectClient(target, impl, () => date);
    expect(await client.headObject('there.pdf')).toMatchObject({ size: 42, contentType: 'application/pdf' });
    expect(await client.headObject('missing.pdf')).toBeNull();
    expect(await client.deleteObject('missing.pdf')).toBe(true);
    expect(calls.map((c) => c.method)).toEqual(['HEAD', 'HEAD', 'DELETE']);
  });

  it('lists keys across continuation pages', async () => {
    let page = 0;
    const { calls, impl } = fakeFetch(() => {
      page += 1;
      return page === 1
        ? new Response('<R><Contents><Key>reports/u1/a.pdf</Key></Contents><NextContinuationToken>tok/1=</NextContinuationToken></R>', { status: 200 })
        : new Response('<R><Contents><Key>reports/u1/b&amp;c.pdf</Key></Contents></R>', { status: 200 });
    });
    const client = new S3ObjectClient(target, impl, () => date);
    expect(await client.listKeys('reports')).toEqual(['reports/u1/a.pdf', 'reports/u1/b&c.pdf']);
    expect(calls[1].url).toContain('continuation-token=tok%2F1%3D');
  });

  it('changes an object ACL to private with PUT ?acl', async () => {
    const { calls, impl } = fakeFetch(() => new Response(null, { status: 200 }));
    const client = new S3ObjectClient(target, impl, () => date);
    await client.putObjectAcl('assets/1700000000000-ebook.pdf', 'private');
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].url).toBe('https://examplebucket.s3.amazonaws.com/assets/1700000000000-ebook.pdf?acl');
    expect(calls[0].headers['x-amz-acl']).toBe('private');
  });

  it('presigns a download with a forced file name', () => {
    const client = new S3ObjectClient(target, async () => new Response(null), () => date);
    const url = client.presignGetUrl('private/digital-product/2026/11/x.pdf', 300, { downloadFileName: 'My "Guide".pdf' });
    expect(url).toContain('X-Amz-Expires=300');
    expect(url).toContain('response-content-disposition=attachment%3B%20filename%3D%22My%20_Guide_.pdf%22');
    expect(url).toMatch(/X-Amz-Signature=[0-9a-f]{64}$/);
  });
});
