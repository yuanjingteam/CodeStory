import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getOSSClient, isOSSConfigured } from '../src/config/oss';

function hash(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function listUploadKeys(): Promise<string[]> {
  const client = getOSSClient();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const result = await client.listV2({
      prefix: 'uploads/',
      continuationToken,
      maxKeys: 1000,
    });
    for (const object of result.objects || []) {
      if (/^uploads\/(?:avatars|courses)\/[A-Za-z0-9._-]+$/.test(object.name)) {
        keys.push(object.name);
      }
    }
    continuationToken = result.isTruncated
      ? result.nextContinuationToken || undefined
      : undefined;
  } while (continuationToken);

  return keys.sort((a, b) => a.localeCompare(b));
}

async function main(): Promise<void> {
  if (!isOSSConfigured()) {
    throw new Error('OSS 未配置，无法生成对象备份');
  }

  const outputRoot = path.resolve(process.argv[2] || 'uploads');
  const client = getOSSClient();
  const keys = await listUploadKeys();
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const key of keys) {
    const relativePath = key.slice('uploads/'.length);
    const outputPath = path.resolve(outputRoot, relativePath);
    if (!outputPath.startsWith(`${outputRoot}${path.sep}`)) {
      throw new Error(`拒绝写出 uploads 目录：${key}`);
    }

    const result = await client.get(key);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    if (fs.existsSync(outputPath)) {
      const existing = fs.readFileSync(outputPath);
      if (hash(existing) === hash(result.content)) {
        unchanged += 1;
        continue;
      }
      updated += 1;
    } else {
      created += 1;
    }

    const temporaryPath = `${outputPath}.tmp-${process.pid}`;
    fs.writeFileSync(temporaryPath, result.content, { flag: 'wx' });
    fs.renameSync(temporaryPath, outputPath);
  }

  console.log(
    `OSS 备份同步完成：对象 ${keys.length}，新增 ${created}，更新 ${updated}，未变化 ${unchanged}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
