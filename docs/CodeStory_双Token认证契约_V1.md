# CodeStory 双 Token 认证契约 V1

> **⚠️ 状态：已过时**  
> **归档日期：2026-07-21**  
> **归档原因：双 Token 认证链路已全部实现，包括前端自动刷新、页面初始化恢复和静默刷新。**  
> **保留目的：历史参考，记录认证契约设计决策。**  
> **当前依据：以代码实现为准（`backend/src/config/auth-*.ts`、`frontend/src/utils/auth-session.ts`、`frontend/src/components/auth/AuthBootstrap.tsx`）。**

---

> 原始状态：实施中，登录签发链路已完成，刷新与退出链路尚未实现  
> 适用范围：CodeStory Web 前端、Express 后端、Redis  
> 目标：兼顾登录安全、活跃用户体验和后续可维护性

## 1. 当前实现与目标

### 1.0 当前实施进度

- [x] 认证契约。
- [x] Redis 登录 Session 数据结构与 CRUD。
- [x] Access/Refresh Token 签发、验证和哈希。
- [x] 登录时创建 Redis Session。
- [x] 登录时返回 Access Token。
- [x] 登录时通过 HttpOnly Cookie 返回 Refresh Token。
- [x] 认证中间件识别新 Access Token。
- [x] Refresh Token Rotation。
- [x] `/auth/refresh`。
- [x] `/auth/logout`、`/auth/me`。
- [ ] 前端自动刷新、页面初始化恢复和静默刷新。

### 1.1 当前实现

当前项目使用单 JWT：

- 登录成功后只签发一个 JWT。
- 普通登录有效期为 1 天。
- “记住我”有效期为 7 天。
- Token 持久化在前端 Zustand/localStorage。
- 任意接口返回 401 时，前端清空登录状态并跳转登录页。
- 暂无 Refresh Token、刷新接口和可靠的服务端登录会话。

### 1.2 目标实现

目标认证链路：

```text
短期 Access Token 负责访问业务接口
+ 长期 Refresh Token 负责续期
+ Redis Session 负责轮换、撤销和绝对期限
```

本契约只确定认证规则。实现代码应分阶段完成，不要求一次改完。

---

## 2. 核心时间规则

| 项目 | 时间 | 是否可延长 |
| --- | ---: | --- |
| Access Token | 15 分钟 | 每次刷新后重新签发 |
| Refresh Token 滑动期限 | 7 天 | 每次成功刷新后向后延长 |
| 登录会话绝对期限 | 30 天 | 永不延长 |
| 静默刷新阈值 | Access Token 剩余 2 分钟 | 不适用 |

三个关键时间字段：

```text
accessExpiresAt
refreshExpiresAt
sessionExpiresAt
```

计算规则：

```text
accessExpiresAt = 当前时间 + 15 分钟

sessionExpiresAt = 首次登录时间 + 30 天

refreshExpiresAt = min(
  当前时间 + 7 天,
  sessionExpiresAt
)
```

示例：

```text
首次登录：6 月 1 日
绝对到期：7 月 1 日

6 月 10 日刷新：
Refresh Token 到期时间 = 6 月 17 日

6 月 29 日刷新：
Refresh Token 到期时间 = 7 月 1 日
不能延长到 7 月 6 日
```

---

## 3. “记住我”契约

`rememberMe` 不再改变 Access Token 有效期。

无论是否勾选“记住我”：

```text
Access Token 都是 15 分钟
Refresh Token 滑动期限都是 7 天
会话绝对期限都是 30 天
```

`rememberMe` 只控制 Refresh Cookie 是否跨浏览器重启保留：

### 未勾选“记住我”

```text
Refresh Cookie 不设置 Max-Age/Expires
→ 属于 Session Cookie
→ 正常关闭浏览器后失效
```

### 勾选“记住我”

```text
Refresh Cookie 设置 Max-Age/Expires
→ 浏览器重启后仍然存在
→ 但仍受 7 天滑动期限和 30 天绝对期限约束
```

---

## 4. Token 职责与 Payload

### 4.1 Access Token

用途：

- 调用课程、练习、AI 对话、用户资料等业务接口。
- 通过 `Authorization` 请求头发送。
- 不写入 Cookie。

建议 Payload：

```json
{
  "sub": "userId",
  "email": "user@example.com",
  "role": 0,
  "sessionId": "session-uuid",
  "type": "access",
  "iat": 1000000000,
  "exp": 1000000900
}
```

验证要求：

- JWT 签名正确。
- 算法必须是服务端指定算法。
- `type === "access"`。
- 未超过 `exp`。
- Payload 字段完整。

### 4.2 Refresh Token

用途：

- 仅用于 `/api/v1/auth/refresh`。
- 通过 HttpOnly Cookie 发送。
- 不允许作为 Bearer Token 调用业务接口。

建议 Payload：

```json
{
  "sub": "userId",
  "sessionId": "session-uuid",
  "tokenId": "token-uuid",
  "type": "refresh",
  "iat": 1000000000,
  "exp": 1000604800
}
```

验证要求：

- JWT 签名正确。
- 算法必须是服务端指定算法。
- `type === "refresh"`。
- 未超过 Token 自身 `exp`。
- Redis Session 存在且未被撤销。
- 当前时间未超过 `sessionExpiresAt`。
- Token 哈希或 `tokenId` 与 Redis 当前记录一致。

---

## 5. Token 存储契约

### 5.1 前端 Access Token

目标方案：

```text
只保存在 Zustand 内存状态
不持久化到 localStorage
```

页面刷新后：

```text
Access Token 消失
→ 前端调用 refresh
→ Refresh Cookie 自动携带
→ 获得新的 Access Token
→ 恢复用户状态
```

### 5.2 Refresh Token Cookie

Cookie 名称：

```text
codestory_refresh_token
```

推荐配置：

```text
HttpOnly=true
Secure=生产环境为 true
SameSite=Lax
Path=/api/v1/auth
```

开发环境可以使用：

```text
Secure=false
```

生产环境必须：

```text
HTTPS
+ Secure=true
```

前端 JavaScript 不得读取、打印或保存 Refresh Token。

---

## 6. Redis 登录会话契约

Redis Key：

```text
auth:session:{sessionId}
```

建议数据：

```json
{
  "sessionId": "session-uuid",
  "userId": "user-uuid",
  "currentTokenId": "token-uuid",
  "refreshTokenHash": "sha256-or-hmac-result",
  "rememberMe": true,
  "createdAt": "2026-06-01T00:00:00.000Z",
  "lastRefreshedAt": "2026-06-10T00:00:00.000Z",
  "refreshExpiresAt": "2026-06-17T00:00:00.000Z",
  "sessionExpiresAt": "2026-07-01T00:00:00.000Z",
  "revokedAt": null,
  "userAgent": "...",
  "ip": "..."
}
```

规则：

- Redis 不保存 Refresh Token 明文。
- Redis TTL 不得超过 `sessionExpiresAt`。
- 每个设备登录创建独立 `sessionId`。
- 用户退出时只撤销当前会话。
- 修改密码或检测到 Refresh Token 重放时，可以撤销该用户所有会话。

---

## 7. Refresh Token Rotation

每次刷新成功都必须轮换 Refresh Token：

```text
旧 Refresh Token
→ 验证成功
→ 生成新 Access Token
→ 生成新 Refresh Token
→ Redis 替换 currentTokenId 和 Token 哈希
→ 旧 Refresh Token 立即失效
```

如果旧 Refresh Token 再次被使用：

```text
判定为疑似 Token 泄露或重放
→ 撤销当前 sessionId
→ 清除 Refresh Cookie
→ 返回 REFRESH_TOKEN_REUSED
→ 前端要求重新登录
```

---

## 8. API 契约

### 8.1 登录

```http
POST /api/v1/auth/login
```

请求：

```json
{
  "email": "user@example.com",
  "password": "password",
  "captchaId": "captcha-id",
  "captchaCode": "abcd",
  "rememberMe": true
}
```

响应：

```http
Set-Cookie: codestory_refresh_token=...; HttpOnly; SameSite=Lax; Path=/api/v1/auth
```

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "accessToken": "...",
    "accessExpiresAt": "2026-06-13T12:15:00.000Z",
    "user": {}
  }
}
```

不再向 JSON 响应暴露 Refresh Token。

### 8.2 刷新

```http
POST /api/v1/auth/refresh
```

请求体：

```json
{}
```

Refresh Token 由浏览器通过 Cookie 自动携带。

成功响应：

```http
Set-Cookie: codestory_refresh_token=新的RefreshToken; HttpOnly; SameSite=Lax; Path=/api/v1/auth
```

```json
{
  "code": 200,
  "message": "Token 刷新成功",
  "data": {
    "accessToken": "...",
    "accessExpiresAt": "2026-06-13T12:30:00.000Z"
  }
}
```

### 8.3 恢复当前用户

```http
GET /api/v1/auth/me
Authorization: Bearer ACCESS_TOKEN
```

用途：

- 页面刷新并成功换取 Access Token 后恢复用户资料。
- 不依赖前端 localStorage 中缓存的用户身份。

### 8.4 退出登录

```http
POST /api/v1/auth/logout
```

行为：

```text
读取 Refresh Cookie
→ 撤销 Redis 当前会话
→ 清除 Refresh Cookie
→ 返回成功
```

即使 Cookie 已失效或 Redis Session 不存在，退出接口也返回成功，保证幂等。

---

## 9. 错误码契约

HTTP 状态码与业务错误码必须分开表达。

| HTTP | 业务错误码 | 前端行为 |
| ---: | --- | --- |
| 401 | `ACCESS_TOKEN_MISSING` | 未登录请求，进入登录流程 |
| 401 | `ACCESS_TOKEN_EXPIRED` | 尝试刷新一次 |
| 401 | `ACCESS_TOKEN_INVALID` | 不刷新，清理状态并登录 |
| 401 | `REFRESH_TOKEN_MISSING` | 清理状态并登录 |
| 401 | `REFRESH_TOKEN_EXPIRED` | 清理状态并登录 |
| 401 | `REFRESH_TOKEN_INVALID` | 清理状态并登录 |
| 401 | `REFRESH_TOKEN_REUSED` | 撤销会话并提示安全风险 |
| 401 | `SESSION_REVOKED` | 清理状态并登录 |
| 401 | `SESSION_ABSOLUTE_EXPIRED` | 提示登录已达到最长时间 |
| 403 | `FORBIDDEN` | 保持登录，提示没有权限 |

只有下面这一种情况允许自动刷新：

```text
ACCESS_TOKEN_EXPIRED
```

不能把所有 401 都当成 Token 过期。

统一错误响应：

```json
{
  "code": "ACCESS_TOKEN_EXPIRED",
  "message": "登录凭证已过期",
  "data": null
}
```

---

## 10. 前端刷新契约

### 10.1 Axios 请求

业务请求携带：

```http
Authorization: Bearer ACCESS_TOKEN
```

刷新请求必须设置：

```ts
credentials: "include"
```

或者 Axios：

```ts
withCredentials: true
```

### 10.2 并发刷新

同一时刻只允许存在一个刷新请求：

```text
第一个 ACCESS_TOKEN_EXPIRED
→ 创建 refreshPromise

后续过期请求
→ 等待同一个 refreshPromise

刷新成功
→ 更新内存中的 Access Token
→ 重试所有失败请求
```

原请求最多自动重试一次，防止死循环。

以下接口不得触发自动刷新：

```text
/api/v1/auth/login
/api/v1/auth/refresh
/api/v1/auth/logout
```

### 10.3 活跃用户静默刷新

满足以下条件时可以静默刷新：

```text
用户已经登录
+ 最近 5 分钟内有交互
+ Access Token 剩余时间小于 2 分钟
+ 当前没有刷新请求
```

用户交互包括：

- 鼠标点击。
- 键盘输入。
- 页面滚动。
- 页面重新获得焦点。

后台页面不应高频刷新。

页面重新获得焦点时，可以检查一次 Token 剩余时间。

---

## 11. 强制登录与原页面恢复

需要重新登录时，保存当前站内地址：

```text
/auth/login?redirect=%2Fcourses%2F123%2Flessons%2F456
```

登录成功后：

```text
读取 redirect
→ 验证它是站内相对路径
→ 返回原页面
```

安全规则：

- 只允许以 `/` 开头的站内相对路径。
- 禁止 `//evil.com`。
- 禁止 `http://` 和 `https://` 外部地址。
- 非法地址统一返回首页。

这样可以防止开放重定向漏洞。

---

## 12. 草稿恢复契约

草稿功能与 Token 刷新分开实现，但两者共同保证用户体验。

第一版保存到 localStorage：

```text
draft:lesson:{userId}:{lessonId}:{exerciseId}
```

草稿内容：

```json
{
  "answer": "用户答案或代码",
  "language": "python",
  "updatedAt": "2026-06-13T12:00:00.000Z"
}
```

规则：

- 输入变化后防抖 500～1000ms 保存。
- 登录跳转前立即保存一次。
- 返回原页面后提示发现草稿。
- 正式提交成功后删除对应草稿。
- 不保存密码、Token、标准答案和隐藏测试。
- 不同用户、课程、小节和练习之间不得串草稿。

---

## 13. CORS 与 CSRF 契约

因为 Refresh Token 使用 Cookie：

- 后端 CORS 必须指定允许的前端 Origin。
- 后端必须启用 `credentials: true`。
- 不允许同时使用 `Access-Control-Allow-Origin: *` 和凭证 Cookie。
- 前端刷新和退出请求必须携带 credentials。

当前阶段前后端同站部署且使用 `SameSite=Lax`。

如果未来改成跨站部署，应重新评估：

- `SameSite=None; Secure`。
- CSRF Token。
- Origin/Referer 校验。

---

## 14. 安全日志契约

允许记录：

- `sessionId`。
- `userId`。
- Token 错误类型。
- 登录、刷新、退出和会话撤销时间。
- 脱敏后的 IP 和 User-Agent。

禁止记录：

- Access Token 原文。
- Refresh Token 原文。
- Authorization 请求头。
- Cookie 原文。
- 密码。

---

## 15. 验收标准

### 登录

- 登录成功返回 Access Token。
- Refresh Token 只存在于 HttpOnly Cookie。
- Access Token 的有效期固定为 15 分钟。
- `rememberMe` 不改变 Access Token 寿命。

### 刷新

- Access Token 过期后可以无感刷新。
- 刷新后 Access Token 和 Refresh Token 都会轮换。
- Refresh Token 滑动期限为 7 天。
- 滑动期限不能突破 30 天绝对期限。
- 同时发生多个 401 时只发送一次刷新请求。

### 失效

- Refresh Token 过期后要求重新登录。
- 达到 30 天绝对期限后必须重新登录。
- 退出登录后旧 Refresh Token 无法继续刷新。
- 重放旧 Refresh Token 会撤销当前会话。

### 用户体验

- 强制登录后可以回到原学习页面。
- 未提交的代码和答案可以恢复。
- 刷新失败不会形成请求死循环。

---

## 16. 推荐实施顺序

1. 实现双 Token 配置与 Payload 类型。
2. 实现 Redis 登录会话及三个过期时间。
3. 实现 Access/Refresh Token 生成和验证工具。
4. 改造登录接口。
5. 实现 Refresh Token Rotation。
6. 实现刷新、当前用户和退出接口。
7. 修改认证中间件和错误码。
8. 修改前端 Zustand，Access Token 改为仅内存保存。
9. 实现单飞刷新与请求重试。
10. 实现静默刷新。
11. 实现安全 redirect。
12. 实现代码和答案草稿。
13. 补齐异常、并发和安全测试。

---

## 17. 本阶段不做

- OAuth 第三方登录。
- 手机短信登录。
- 多因素认证。
- 后台设备管理页面。
- 管理员远程踢下线界面。
- 跨站部署方案。

这些能力可以在双 Token 基础稳定后继续扩展。

---

## 18. 当前实施进度

- [x] 双 Token 配置与 Payload 类型。
- [x] Redis 登录会话与滑动、绝对过期时间。
- [x] Access/Refresh Token 生成和验证。
- [x] 登录签发双 Token。
- [x] Refresh Token Rotation。
- [x] 刷新、当前用户和退出接口。
- [x] 认证中间件与明确错误码。
- [x] Access Token 仅保存在前端内存。
- [x] 并发请求单飞刷新与失败请求重试。
- [x] 页面启动恢复会话与到期前静默刷新。
- [x] 强制登录后安全返回原页面。
- [x] 学习代码和练习答案本地草稿自动保存。
- [ ] 草稿同步到后端，支持跨设备恢复。
- [ ] 浏览器端到端场景测试与更多异常测试。
