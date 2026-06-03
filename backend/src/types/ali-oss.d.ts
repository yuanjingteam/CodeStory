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

  interface OSSClient {
    put(name: string, file: Buffer, options?: { headers?: Record<string, string> }): Promise<PutObjectResult>;
    delete(name: string): Promise<void>;
  }

  export default class OSS implements OSSClient {
    constructor(options: OSSOptions);
    put(name: string, file: Buffer, options?: { headers?: Record<string, string> }): Promise<PutObjectResult>;
    delete(name: string): Promise<void>;
  }
}
