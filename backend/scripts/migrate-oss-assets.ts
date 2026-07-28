import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import OSS from 'ali-oss';
import { parse } from 'dotenv';
import prisma from '../src/config/prisma';

type Mode = 'plan' | 'copy' | 'verify' | 'rewrite';
type MediaSource = 'users.avatar' | 'courses.cover_url' | 'wechat_users.avatar';

interface OSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint?: string;
  domain?: string;
}

interface MediaReference {
  source: MediaSource;
  id: string;
  oldUrl: string;
  objectKey: string;
  storage: 'local' | 'source-oss';
}

interface TransferObject {
  objectKey: string;
  origin: 'local-archive' | 'source-oss';
  localPath?: string;
}

const repositoryRoot = path.resolve(__dirname, '../..');
const backupRoot = path.join(repositoryRoot, 'codestory_backup');
const sourceEnvPath = path.join(backupRoot, 'production.env');
const targetEnvPath = path.join(backupRoot, 'oss-target.env');
const extractedUploadsRoot = path.join(backupRoot, 'oss-transfer', 'uploads');

function required(
  values: Record<string, string>,
  key: string,
  filePath: string
): string {
  const value = values[key]?.trim();
  if (!value) {
    throw new Error(`${path.basename(filePath)} 缺少 ${key}`);
  }
  if (/你的|请填写|^your[-_ ]/i.test(value)) {
    throw new Error(`${path.basename(filePath)} 的 ${key} 仍是占位符`);
  }
  return value;
}

function readEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`找不到配置文件：${filePath}`);
  }
  return parse(fs.readFileSync(filePath));
}

function readSourceConfig(): OSSConfig {
  const values = readEnv(sourceEnvPath);
  return {
    region: required(values, 'OSS_REGION', sourceEnvPath),
    accessKeyId: required(values, 'OSS_ACCESS_KEY_ID', sourceEnvPath),
    accessKeySecret: required(values, 'OSS_ACCESS_KEY_SECRET', sourceEnvPath),
    bucket: required(values, 'OSS_BUCKET', sourceEnvPath),
    endpoint: values.OSS_ENDPOINT?.trim() || undefined,
  };
}

function readTargetConfig(): OSSConfig {
  const values = readEnv(targetEnvPath);
  return {
    region: required(values, 'OSS_TARGET_REGION', targetEnvPath),
    accessKeyId: required(values, 'OSS_TARGET_ACCESS_KEY_ID', targetEnvPath),
    accessKeySecret: required(values, 'OSS_TARGET_ACCESS_KEY_SECRET', targetEnvPath),
    bucket: required(values, 'OSS_TARGET_BUCKET', targetEnvPath),
    endpoint: values.OSS_TARGET_ENDPOINT?.trim() || undefined,
    domain: values.OSS_TARGET_DOMAIN?.trim() || undefined,
  };
}

function createClient(config: OSSConfig): OSS {
  if (!/^oss-[a-z0-9-]+$/.test(config.region)) {
    throw new Error(`OSS Region 格式无效：${config.region}`);
  }
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(config.bucket)) {
    throw new Error(
      `OSS Bucket 格式无效：${config.bucket}；这里只填 Bucket 名称，不填 URL`
    );
  }
  return new OSS({
    region: config.region,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    endpoint: config.endpoint,
    secure: true,
  });
}

function assertMigrationDatabase(mode: Mode): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('缺少 DATABASE_URL');
  }

  const parsed = new URL(databaseUrl);
  const isLocalHost = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  const isMigrationPort = parsed.port === '55432';
  const isExpectedDatabase = parsed.pathname === '/codestory';

  if (!isLocalHost || !isMigrationPort || !isExpectedDatabase) {
    throw new Error(
      '拒绝连接非隔离迁移库；DATABASE_URL 必须指向 localhost:55432/codestory'
    );
  }

  if (mode === 'rewrite' && process.env.ALLOW_OSS_URL_REWRITE !== '1') {
    throw new Error('rewrite 模式需要显式设置 ALLOW_OSS_URL_REWRITE=1');
  }
}

function extractObjectKey(url: string): string {
  const rawPath = url.startsWith('/') ? url : new URL(url).pathname;
  const objectKey = decodeURIComponent(rawPath.replace(/^\/+/, ''));
  if (!/^uploads\/(?:avatars|courses)\/[^/]+$/.test(objectKey)) {
    throw new Error(`无法识别媒体对象路径：${url}`);
  }
  return objectKey;
}

async function collectMediaReferences(): Promise<MediaReference[]> {
  const [users, courses, wechatUsers] = await Promise.all([
    prisma.users.findMany({
      where: { avatar: { not: null } },
      select: { id: true, avatar: true },
    }),
    prisma.courses.findMany({
      where: { cover_url: { not: null } },
      select: { id: true, cover_url: true },
    }),
    prisma.wechat_users.findMany({
      where: { avatar: { not: null } },
      select: { id: true, avatar: true },
    }),
  ]);

  const references: MediaReference[] = [];
  const append = (
    source: MediaSource,
    id: string,
    value: string | null
  ): void => {
    if (!value) return;
    references.push({
      source,
      id,
      oldUrl: value,
      objectKey: extractObjectKey(value),
      storage: value.startsWith('/') ? 'local' : 'source-oss',
    });
  };

  users.forEach((user) => append('users.avatar', user.id, user.avatar));
  courses.forEach((course) =>
    append('courses.cover_url', course.id, course.cover_url)
  );
  wechatUsers.forEach((user) =>
    append('wechat_users.avatar', user.id, user.avatar)
  );
  return references;
}

function walkFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    throw new Error(
      `找不到已解压的 uploads：${directory}。请先解压 uploads 归档。`
    );
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

function collectTransferObjects(
  references: MediaReference[]
): TransferObject[] {
  const objects = new Map<string, TransferObject>();

  for (const localPath of walkFiles(extractedUploadsRoot)) {
    const relativePath = path
      .relative(path.dirname(extractedUploadsRoot), localPath)
      .split(path.sep)
      .join('/');
    extractObjectKey(`/${relativePath}`);
    objects.set(relativePath, {
      objectKey: relativePath,
      origin: 'local-archive',
      localPath,
    });
  }

  for (const reference of references) {
    if (reference.storage !== 'source-oss') continue;
    const existing = objects.get(reference.objectKey);
    if (existing?.origin === 'local-archive') {
      throw new Error(
        `对象 ${reference.objectKey} 同时存在于本地归档与旧 OSS，拒绝猜测覆盖顺序`
      );
    }
    objects.set(reference.objectKey, {
      objectKey: reference.objectKey,
      origin: 'source-oss',
    });
  }

  return [...objects.values()].sort((a, b) =>
    a.objectKey.localeCompare(b.objectKey)
  );
}

function contentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const value = types[extension];
  if (!value) {
    throw new Error(`不支持的本地媒体格式：${filePath}`);
  }
  return value;
}

function hash(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function readTransferObject(
  item: TransferObject,
  sourceClient: OSS
): Promise<{ content: Buffer; contentType?: string }> {
  if (item.origin === 'local-archive') {
    return {
      content: fs.readFileSync(item.localPath!),
      contentType: contentType(item.localPath!),
    };
  }

  let result;
  try {
    result = await sourceClient.get(item.objectKey);
  } catch (error) {
    const status = (error as { status?: number }).status;
    const code = (error as { code?: string }).code;
    if (status !== 404 && code !== 'NoSuchKey') throw error;

    const versions = await sourceClient.listObjectVersions({
      prefix: item.objectKey,
      maxKeys: 100,
    });
    const previousVersion = versions.objects
      .filter((version) => version.name === item.objectKey)
      .sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime()
      )[0];
    if (!previousVersion) throw error;

    result = await sourceClient.get(item.objectKey, {
      versionId: previousVersion.versionId,
    });
    console.log(`从旧 OSS 历史版本读取：${item.objectKey}`);
  }
  const header = result.res.headers['content-type'];
  return {
    content: result.content,
    contentType: Array.isArray(header) ? header[0] : header,
  };
}

async function readTargetIfPresent(
  client: OSS,
  objectKey: string
): Promise<Buffer | null> {
  try {
    return (await client.get(objectKey)).content;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return null;
    throw error;
  }
}

function isMissingObject(error: unknown): boolean {
  const ossError = error as { status?: number; code?: string };
  return ossError.status === 404 || ossError.code === 'NoSuchKey';
}

async function copyObjects(
  objects: TransferObject[],
  sourceClient: OSS,
  targetClient: OSS
): Promise<void> {
  let copied = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const [index, item] of objects.entries()) {
    try {
      const source = await readTransferObject(item, sourceClient);
      const existing = await readTargetIfPresent(targetClient, item.objectKey);

      if (existing) {
        if (hash(existing) !== hash(source.content)) {
          throw new Error('目标桶已存在同名但内容不同的对象');
        }
        skipped += 1;
      } else {
        await targetClient.put(item.objectKey, source.content, {
          headers: source.contentType
            ? { 'Content-Type': source.contentType }
            : undefined,
        });
        const uploaded = await targetClient.get(item.objectKey);
        if (hash(uploaded.content) !== hash(source.content)) {
          throw new Error('上传后校验失败');
        }
        copied += 1;
      }

      console.log(
        `[${index + 1}/${objects.length}] ${item.objectKey} ${
          existing ? '已存在且一致' : '已复制并校验'
        }`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${item.objectKey}（${item.origin}）：${message}`);
      console.error(
        `[${index + 1}/${objects.length}] ${item.objectKey} 失败：${message}`
      );
    }
  }

  console.log(
    `复制结束：新增 ${copied}，已存在且一致 ${skipped}，失败 ${failures.length}`
  );
  if (failures.length > 0) {
    throw new Error(`以下对象未迁移：\n${failures.join('\n')}`);
  }
}

async function verifyObjects(
  objects: TransferObject[],
  sourceClient: OSS,
  targetClient: OSS
): Promise<Set<string>> {
  const unavailable = new Set<string>();
  const failures: string[] = [];
  let verified = 0;

  for (const [index, item] of objects.entries()) {
    let source: { content: Buffer; contentType?: string };
    try {
      source = await readTransferObject(item, sourceClient);
    } catch (error) {
      if (
        item.origin === 'source-oss' &&
        isMissingObject(error) &&
        (await readTargetIfPresent(targetClient, item.objectKey)) === null
      ) {
        unavailable.add(item.objectKey);
        console.warn(
          `[${index + 1}/${objects.length}] ${item.objectKey} 源端已丢失`
        );
        continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${item.objectKey}：读取源对象失败：${message}`);
      continue;
    }

    try {
      const target = await targetClient.get(item.objectKey);
      if (hash(source.content) !== hash(target.content)) {
        throw new Error('目标对象内容不一致');
      }
      verified += 1;
      console.log(
        `[${index + 1}/${objects.length}] ${item.objectKey} 校验通过`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${item.objectKey}：核验目标对象失败：${message}`);
    }
  }

  console.log(
    `对象核验结束：通过 ${verified}，源端已丢失 ${unavailable.size}，其他失败 ${failures.length}`
  );
  if (failures.length > 0) {
    throw new Error(`对象核验失败：\n${failures.join('\n')}`);
  }
  return unavailable;
}

function buildProxyPath(objectKey: string): string {
  return `/${objectKey}`;
}

async function rewriteReferences(
  references: MediaReference[],
  unavailable: Set<string>
): Promise<void> {
  const changes = references
    .map((reference) => ({
      ...reference,
      newUrl: unavailable.has(reference.objectKey)
        ? null
        : buildProxyPath(reference.objectKey),
    }))
    .filter((reference) => reference.oldUrl !== reference.newUrl);

  const backupPath = path.join(
    backupRoot,
    `oss-url-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(backupPath, `${JSON.stringify(changes, null, 2)}\n`, {
    flag: 'wx',
  });

  await prisma.$transaction(async (transaction) => {
    for (const change of changes) {
      let count = 0;
      if (change.source === 'users.avatar') {
        count = (
          await transaction.users.updateMany({
            where: { id: change.id, avatar: change.oldUrl },
            data: { avatar: change.newUrl },
          })
        ).count;
      } else if (change.source === 'courses.cover_url') {
        count = (
          await transaction.courses.updateMany({
            where: { id: change.id, cover_url: change.oldUrl },
            data: { cover_url: change.newUrl },
          })
        ).count;
      } else {
        count = (
          await transaction.wechat_users.updateMany({
            where: { id: change.id, avatar: change.oldUrl },
            data: { avatar: change.newUrl },
          })
        ).count;
      }

      if (count !== 1) {
        throw new Error(
          `${change.source}(${change.id}) 更新数量异常：${count}`
        );
      }
    }
  });

  console.log(`已事务更新 ${changes.length} 条媒体 URL`);
  console.log(`原 URL 备份：${backupPath}`);
}

async function main(): Promise<void> {
  const mode = (process.argv[2] || 'plan') as Mode;
  if (
    !['plan', 'copy', 'verify', 'rewrite'].includes(mode)
  ) {
    throw new Error('用法：migrate-oss-assets.ts [plan|copy|verify|rewrite]');
  }
  assertMigrationDatabase(mode);

  const sourceConfig = readSourceConfig();
  const targetConfig = readTargetConfig();
  if (sourceConfig.bucket === targetConfig.bucket) {
    throw new Error('源桶和目标桶相同，拒绝执行');
  }

  const sourceClient = createClient(sourceConfig);
  const targetClient = createClient(targetConfig);
  const [sourceAcl, sourceVersioning, targetAcl, references] =
    await Promise.all([
      sourceClient.getBucketACL(sourceConfig.bucket),
      sourceClient.getBucketVersioning(sourceConfig.bucket),
      targetClient.getBucketACL(targetConfig.bucket),
      collectMediaReferences(),
    ]);
  const objects = collectTransferObjects(references);

  const sourceOssCount = references.filter(
    (item) => item.storage === 'source-oss'
  ).length;
  const localReferenceCount = references.length - sourceOssCount;
  const localArchiveCount = objects.filter(
    (item) => item.origin === 'local-archive'
  ).length;
  const sourceObjectCount = objects.length - localArchiveCount;

  console.log(`旧 OSS ACL：${sourceAcl.acl}`);
  console.log(`旧 OSS 版本控制：${sourceVersioning.versionStatus || '未启用'}`);
  console.log(`新 OSS ACL：${targetAcl.acl}`);
  console.log(
    `数据库媒体引用：${references.length}（旧 OSS ${sourceOssCount}，本地 ${localReferenceCount}）`
  );
  console.log(
    `待保全对象：${objects.length}（旧 OSS ${sourceObjectCount}，本地归档 ${localArchiveCount}）`
  );
  console.log('数据库目标地址模式：/uploads/...（后端代理私有 OSS）');

  if (mode === 'plan') return;
  if (mode === 'copy') {
    await copyObjects(objects, sourceClient, targetClient);
    return;
  }

  const unavailable = await verifyObjects(
    objects,
    sourceClient,
    targetClient
  );
  if (mode === 'verify') return;
  await rewriteReferences(references, unavailable);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
