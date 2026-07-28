declare module 'ali-oss' {
  interface OSSOptions {
    region?: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket?: string;
    endpoint?: string;
    secure?: boolean;
  }

  interface PutObjectResult {
    name: string;
    url: string;
    res: { status: number };
  }

  interface GetObjectResult {
    content: Buffer;
    res: {
      status: number;
      headers: Record<string, string | string[] | undefined>;
    };
  }

  interface GetBucketACLResult {
    acl: 'private' | 'public-read' | 'public-read-write';
    owner: {
      id: string;
      displayName: string;
    };
    res: { status: number };
  }

  interface GetBucketVersioningResult {
    status: number;
    versionStatus?: 'Enabled' | 'Suspended';
    res: { status: number };
  }

  interface ObjectVersion {
    name: string;
    lastModified: string;
    isLatest: boolean;
    versionId: string;
    etag: string;
    size: number;
  }

  interface ListObjectVersionsResult {
    objects: ObjectVersion[];
    deleteMarker: Array<{
      name: string;
      lastModified: string;
      versionId: string;
    }>;
    isTruncated: boolean;
    nextKeyMarker: string | null;
    nextVersionIdMarker: string | null;
  }

  interface ListObjectsV2Result {
    objects: Array<{
      name: string;
      lastModified: string;
      etag: string;
      size: number;
    }>;
    isTruncated: boolean;
    nextContinuationToken: string | null;
  }

  interface OSSClient {
    put(name: string, file: Buffer, options?: { headers?: Record<string, string> }): Promise<PutObjectResult>;
    get(name: string, options?: { versionId?: string }): Promise<GetObjectResult>;
    getBucketACL(name: string): Promise<GetBucketACLResult>;
    getBucketVersioning(name: string): Promise<GetBucketVersioningResult>;
    listObjectVersions(query?: {
      prefix?: string;
      keyMarker?: string;
      versionIdMarker?: string;
      maxKeys?: number;
    }): Promise<ListObjectVersionsResult>;
    listV2(query?: {
      prefix?: string;
      continuationToken?: string;
      maxKeys?: number;
    }): Promise<ListObjectsV2Result>;
    delete(name: string): Promise<void>;
  }

  export default class OSS implements OSSClient {
    constructor(options: OSSOptions);
    put(name: string, file: Buffer, options?: { headers?: Record<string, string> }): Promise<PutObjectResult>;
    get(name: string, options?: { versionId?: string }): Promise<GetObjectResult>;
    getBucketACL(name: string): Promise<GetBucketACLResult>;
    getBucketVersioning(name: string): Promise<GetBucketVersioningResult>;
    listObjectVersions(query?: {
      prefix?: string;
      keyMarker?: string;
      versionIdMarker?: string;
      maxKeys?: number;
    }): Promise<ListObjectVersionsResult>;
    listV2(query?: {
      prefix?: string;
      continuationToken?: string;
      maxKeys?: number;
    }): Promise<ListObjectsV2Result>;
    delete(name: string): Promise<void>;
  }
}
