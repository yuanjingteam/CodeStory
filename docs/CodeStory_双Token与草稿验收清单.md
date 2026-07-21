# CodeStory 双 Token 与草稿验收清单

> **⚠️ 状态：已过时**  
> **归档日期：2026-07-21**  
> **归档原因：双 Token 认证与草稿功能验收已完成。**  
> **保留目的：历史参考，记录验收标准与测试步骤。**  
> **当前依据：以代码实现和实际运行为准。**

---

## 1. 验证原则

不能通过一次登录成功证明认证系统没有问题。验证分为四层：

1. 类型和构建检查。
2. Token 与 Redis Session 自动检查。
3. 浏览器真实流程检查。
4. 上线前的异常与安全检查。

每次修改认证相关代码后，至少执行前两层。

---

## 2. 一键自动检查

先确认 Redis 正在运行。

### 后端

```powershell
cd backend
pnpm run check
```

它会依次检查：

- TypeScript 构建。
- Access Token 和 Refresh Token 的签发与验证。
- 两种 Token 不能混用。
- Token 被篡改后必须失效。
- Refresh Token 只以哈希形式保存。
- Redis Session 的创建、读取、更新和删除。
- Refresh Token Rotation。
- 旧 Refresh Token 不能再次轮换。
- 退出登录撤销 Session。
- 重复退出保持幂等。

### 前端

```powershell
cd frontend
pnpm run check
```

它会检查：

- TypeScript 类型。
- ESLint 规则。

现有 warning 可以逐步处理，但不能新增 error。

---

## 3. 登录验收

1. 打开浏览器开发者工具。
2. 进入 `Application > Cookies`。
3. 正常登录。
4. 检查登录响应 JSON 中存在 `accessToken`。
5. 检查 Cookie 中存在 `codestory_refresh_token`。
6. 检查该 Cookie 的 `HttpOnly` 已启用。
7. 检查 `localStorage` 中不存在 Access Token。

预期结果：

- Access Token 只存在前端内存。
- Refresh Token 只存在 HttpOnly Cookie。
- JavaScript 无法读取 Refresh Token。

---

## 4. 刷新页面恢复登录

1. 登录后进入任意受保护页面。
2. 刷新浏览器。
3. 在 `Network` 面板观察请求。

预期顺序：

```text
POST /api/v1/auth/refresh
GET /api/v1/auth/me
业务请求
```

页面不应该跳回登录页，用户信息应该恢复。

---

## 5. Access Token 过期验收

开发环境测试时，可以临时把：

```ts
ACCESS_TOKEN_TTL_SECONDS
```

改成较短时间，例如 30 秒。测试结束后必须恢复为 15 分钟。

测试步骤：

1. 登录。
2. 等待 Access Token 过期。
3. 发起一个受保护请求。
4. 查看 `Network` 面板。

预期结果：

```text
业务请求返回 ACCESS_TOKEN_EXPIRED
→ 只调用一次 /auth/refresh
→ 原业务请求自动重试
→ 页面正常得到数据
```

不能出现无限刷新或重复跳转。

---

## 6. 并发刷新验收

1. 临时缩短 Access Token 有效期。
2. 等待 Token 过期。
3. 同时触发多个受保护请求。
4. 在 `Network` 面板筛选 `refresh`。

预期结果：

- 多个业务请求可以返回 401。
- `/auth/refresh` 只能出现一次。
- 刷新成功后，各业务请求分别重试。

这用于验证前端的单飞刷新机制。

---

## 7. Refresh Token 失效验收

1. 登录并进入学习页面。
2. 在浏览器中删除 `codestory_refresh_token` Cookie。
3. 等待 Access Token 过期后发起请求。

预期结果：

- 刷新接口返回 401。
- 前端清空登录状态。
- 跳转到 `/auth/login?redirect=原页面`。
- 登录成功后回到原学习页面。

---

## 8. 退出登录验收

1. 正常登录。
2. 点击退出。
3. 检查 Cookie 被删除。
4. 刷新页面。

预期结果：

- Redis Session 被删除。
- Refresh Cookie 被删除。
- 刷新页面后不能恢复登录。
- 再次调用退出接口也不报错。

---

## 9. 草稿验收

### 代码题

1. 打开代码题并修改模板。
2. 不提交，直接关闭练习。
3. 重新打开同一道题。
4. 刷新浏览器后再次打开。

预期结果：修改后的代码仍然存在。

### 选择题

1. 选择一个选项但不提交。
2. 关闭练习后重新打开。
3. 刷新浏览器后再次打开。

预期结果：之前选择的选项仍然选中。

### 提交结果

- 答错后草稿保留。
- 答对后草稿删除。
- 不同用户登录同一浏览器时不能读取对方草稿。

---

## 10. 每次提交代码前

```powershell
cd backend
pnpm run check

cd ../frontend
pnpm run check
```

然后至少手动验证：

1. 登录。
2. 刷新页面恢复登录。
3. 退出登录。
4. 一道代码题草稿恢复。
5. 一道选择题草稿恢复。

只有自动检查和浏览器验收都通过，才能认为本次认证改动可交付。
