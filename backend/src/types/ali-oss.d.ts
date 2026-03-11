declare module 'ali-oss' {
  interface OSSConfig {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
  }

  interface OSS {
    put(name: string, file: Buffer | string | ReadableStream): Promise<{ url: string; name: string }>;
    delete(name: string): Promise<void>;
    get(name: string): Promise<{ content: Buffer }>;
    list(query?: any): Promise<any>;
  }

  class OSS implements OSS {
    constructor(config: OSSConfig);
  }

  export = OSS;
}
