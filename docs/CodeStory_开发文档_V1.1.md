# codeStory 开发文档V1.1

**文档版本：**V1.1

**文档用途：**全栈开发、测试、验收标准依据

# 1. 产品概述

## 1.1 产品定位

本产品是一个以 AI Agent交互为核心的编程学习平台，致力于重塑传统单向、枯燥且缺乏沉浸感的编程学习方式。与传统的学习方式对比如下：

| 维度 | 文档学习 | 视频学习 | 通用AI（如ChatGPT） | 本产品（AI Agent学习平台） |
| --- | --- | --- | --- | --- |
| 学习模式 | 单向阅读 | 单向观看 | 问答式 | **对话式 + 任务驱动 + 引导式学习** |
| 交互性 | 无 | 极低 | 有，但不连续 | **强交互，贯穿全过程** |
| 实时反馈 | 无 | 无 | 有但不系统 | **全过程实时反馈与纠错** |
| 学习引导 | 无 | 弱 | 依赖用户提问 | **AI主动引导（类似导师）** |
| 实践能力培养 | 依赖自觉，不同人的理解程度会有偏差，导致学习效果参差不齐 | 看完不实操,仅仅只有印象，依赖课后练习 | 容易直接复制粘贴答案，出现学会假象。 | **内嵌任务驱动，强制参与实践** |
| 沉浸感 | 低 | 中 | 中 | **高沉浸（任务/对话结合）** |
| 知识内化 | 慢 | 一般 | 不稳定 | **通过交互与反馈强化记忆** |
| 学习成本 | 低（效率也低） | 中 | 不稳定 | **前期适应，长期效率最高** |
| 适合人群 | 自律强、自学能力强 | 初学者 | 有明确问题的人 | **希望系统学习 + 提升实战能力的人** |

总结来说，本产品通过在学习流程中的各个阶段与小节中引入实时的叙事交互机制，让用户在“对话式学习”中与知识的参与度更高，从而极大的提升理解效率与学习体验。本产品将 AI Agent 作为学习过程中的“引导者与协作伙伴”，而非单纯的信息提供工具，实现从被动接受到主动探索的学习转变。

# 2. 需求分析

## 2.1 用户需求分析

结合用户画像，从核心需求、次要需求、潜在需求三个维度，明确用户对产品的核心诉求，确保需求与产品功能精准匹配，具体如下：

### 2.1.1 核心需求

V1.0版本核心需求：

| **需求名称** | **需求描述** |
| --- | --- |
| 课程资源呈现 | 提供清晰的编程课程分类与章节划分，支持课程详情查看与章节学习入口 |
| 用户基础操作 | 支持用户注册、登录及个人信息管理（头像、昵称、密码修改等） |
| 后台管理 | 用于管理用户、课程资源 |

V1.1及后续版本（新增AI Agent）核心需求：

| **需求名称** | **需求描述** |
| --- | --- |
| 小节内对话式学习流程 | 在章节学习中嵌入 AI Agent，通过对话形式引导用户完成“知识讲解→理解确认→练习”的学习流程 |
| 练习驱动学习机制 | 基于当前知识点自动生成多类型练习题（选择、判断、代码填空、代码编写），并在学习过程中动态插入 |
| 分级提示与引导机制 | 在用户卡住时提供多级提示（方向提示→具体提示→接近答案），逐步引导完成问题 |
| 代码分析与错误解释 | 对用户提交代码进行分析，定位错误原因并提供修改建议与相关知识解释 |
| 学习状态感知与调整 | 根据用户答题情况，动态调整讲解深度与练习难度，实现基础个性化学习 |
| 根据用户回答打分 | AI根据用户的回答进行打分，固定答案会获得固定的分数，代码环节会根据用户的代码质量进行打分 |

### 2.1.2 次要需求

次要需求是核心需求的补充，提升用户使用体验，增强产品粘性：

| **需求名称** | **需求描述** |
| --- | --- |
| 课程评价 | 用户可对课程进行评分与评论，为其他用户提供参考 |
| 主题模式 | 支持暗黑模式与亮色模式切换，适配不同学习场景 |

### 2.1.3 潜在需求

| **需求名称** | **需求描述** |
| --- | --- |
| 技能认证 | 完成课程或项目后发放进行等级评选，增强学习激励 |

## 2.2 需求列表

需求列表按“功能需求+非功能需求”划分，明确需求优先级（P0核心必做、P1重要优化、P2可选迭代），对应后续功能模块设计，确保需求可落地、可追溯：

### 2.2.1 功能需求

| **需求名称** | **需求描述** | **优先级** |  |
| --- | --- | --- | --- |
| 用户注册 | 支持手机号、邮箱注册，完成验证码校验与密码设置 | P0 | 用户 |
| 用户登录 | 支持账号密码登录、记住登录状态、找回/重置密码 | P0 | 用户 |
| 用户管理 | 支持查看平台所有注册用户列表，展示字段包括：用户 ID、昵称、邮箱、头像、用户等级、创建时间、状态（正常 / 禁用）。<br>支持用户信息搜索（按昵称 / 邮箱 / ID）、筛选（按等级 / 状态）、分页展示。<br>支持管理员**禁用 / 启用**用户账号，禁用后用户无法登录平台。<br>支持管理员查看用户学习数据概览：已学课程数、完成课程数、累计得分。<br>支持管理员查看用户详情，包含基础信息与学习轨迹（最近学习时间、学习进度） | P0 | 管理员 |
| 课程管理 | 增删查改课程（删除后前台不展示，数据保留在后台（伪删除）） | P0 | 管理员 |
| 章节管理 | 增删查改章节（删除后前台不展示，数据保留在后台（伪删除）） | P0 | 管理员 |
| 小节管理 | 管理员可按课程 + 章节筛选查看小节列表，支持管理员新增小节，必须先选择所属课程与章节，再填写，以及编辑删除小节，展示小节学习统计：学习人数、完成率、平均得分。 | P0 | 管理员 |
| AI题目生成小节题目 | 管理员不仅可以直接录入题目，还能ai生成题目供管理员参考和审核，来决定是否使用 | P0 | 管理员 |
| 个人信息管理 | 支持用户修改头像、昵称、密码，查看学习数据（课程、进度） | P0 | 用户、管理员 |
| 课程详情 | 展示课程信息与章节结构，支持进入章节学习、支持搜索、筛选与排序 | P0 | 用户、管理员 |
| 章节展示 | 展示章节划分 | P0 | 用户、管理员 |
| 小节内容详情 | 小节内容（文本、代码），支持代码查看与基础交互；点击按钮会有对应题目提示，不同用户做到相同的题目能对这个题目进行评论。 | P0 | 用户、管理员 |
| 学习进度记录 | 自动记录章节学习状态（未开始/进行中/已完成），支持断点续学 | P0 | 用户、管理员 |
| 在线代码编辑 | 提供代码输入、语法高亮与结果展示能力,<br>由AI判断，不支持运行 | P0 | 用户、管理员 |
| AI打分机制 | 1.按题目类型制定差异化打分规则；2. 记录每道题得分，统计小节/章节/课程总分；3. 结合答题次数、提示使用情况调整得分；4. 展示得分明细与提升建议； | P0 | 用户、管理员 |
| AI Agent学习引导 | 在小节中提供对话式学习引导，支持提问与知识讲解 | P0 | 用户、管理员 |
| AI题目生成与练习 | 基于知识点生成练习题（选择/判断/代码题），嵌入学习流程 | P0 | 用户、管理员 |
| AI答案评估与反馈 | 对用户答案进行判断，提供结果与错误原因解释 | P0 | 用户、管理员 |
| AI分级提示机制 | 在用户卡住时提供分层提示，引导完成题目 | P0 | 用户、管理员 |
| AI代码分析 | 对用户提交代码进行错误定位与修改建议 | P0 | 用户、管理员 |

### 2.2.2 非功能需求

| **需求名称** | **需求描述** | **优先级** |
| --- | --- | --- |
| 性能需求 | 页面首屏加载时间 ≤ 2 秒；接口响应时间 ≤ 500ms； | P0 |
| 兼容性需求 | 支持主流浏览器（Chrome、Edge、Firefox）最近两个版本；适配常见分辨率（1920×1080、1366×768） | P0 |
| 安全性需求 | 用户密码加密存储（如 bcrypt）；防御 SQL 注入与 XSS 攻击；接口需鉴权（JWT/Session）；敏感信息脱敏展示 | P0 |
| 易用性需求 | 核心功能（学习、做题、提交代码）操作路径 ≤3步；关键操作提供明确反馈；错误提示可读且可定位问题 | P0 |
| 可扩展性需求 | 系统采用模块化架构（课程/用户/AI模块解耦）；支持后续新增 AI 能力与多端扩展 | P0 |
| 可维护性需求 | 代码遵循统一规范；关键模块具备日志记录；数据库结构清晰，支持数据备份与恢复 | P1 |
| 稳定性需求 | 系统可用性 ≥ 99.5%；核心服务支持异常恢复，故障恢复时间 ≤ 30 分钟 | P1 |

# 3. 功能模块

按“V1.0基础模块+后续迭代模块”划分，明确各模块功能、关联关系，确保功能覆盖需求，模块划分清晰，便于全栈开发与测试。

## 3.1 V1.0版本核心模块

### 3.1.1 首页模块

核心功能：负责用户注册、登录、个人信息管理，是所有模块的基础，控制用户权限访问。

| **子模块名称** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 注册子模块 | 用户账号创建 | 支持手机号/邮箱注册，完成验证码校验、密码设置、用户协议确认 |
| 登录子模块 | 用户身份认证 | 支持账号密码登录、记住密码、忘记密码重置 |
| 个人中心子模块 | 用户信息管理 | 支持头像、昵称、密码修改，展示学习数据（课程、进度）、收藏列表、笔记列表 |
| 网页内容子模块 | 首页内容信息 | 用于填充首页（介绍，展示课程） |

### 3.1.2 课程模块

核心功能：负责课程资源的展示、分类、详情呈现，是平台的核心业务模块。

| **子模块名称** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 课程列表子模块 | 课程展示与筛选 | 按编程语言、难度分类展示课程，支持搜索、筛选、排序（热度、最新） |
| 课程详情子模块 | 课程信息展示 | 展示课程简介、讲师信息、章节列表、用户评价，提供学习入口与收藏入口 |
| 章节学习子模块 | 学习内容划分 | 展示课程章节内容 |
| 小节学习子模块 | 学习内容承载 | 承载AI Agent学习的内容 |

### 3.1.3 关于我们模块

核心功能：为所有模块提供公共支撑，确保平台整体一致性。

| **子模块名称** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 关于我们子模块 | 展示信息 | 主要展示需要明确的信息 |
| 联系我们子模块 | 设置联系方式 | 设置用户反馈的途径 |

### 3.1.4 管理后台模块

**核心定位**：为平台运营人员提供课程体系管理、内容维护、数据监控的统一后台入口，实现「方向 - 章节 - 小节 - 练习」的全链路配置，支撑前台业务正常运转。

#### 3.1.4.1 后台核心能力总览

管理员角色支持：

*   课程、章节、小节的创建与维护

*   练习题库（选择题 / 判断题 / 代码题）的配置与管理

*   用户数据查看、课程数据统计、内容审核

*   基础权限控制（后续迭代可扩展角色权限体系）


#### 3.1.4.2 模块细分功能设计

##### 1. 课程管理

| **子模块** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 课程列表 | 课程管理 | 展示所有课程（如 Python、Java、前端），支持搜索、查看、编辑、删除 |
| 新增课程 | 课程创建 | 表单填写课程名称、描述、排序权重，提交后生成新的课程分类，关联前台课程列表 |
| 课程编辑 | 课程信息修改 | 修改课程名称、描述、排序，实时同步前台课程展示顺序 |

##### 2. 章节管理

| **子模块** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 章节列表 | 章节层级管理 | 按所属课程展示章节列表，支持查看、编辑、删除 |
| 新增章节 | 章节创建 | 绑定所属课程，填写章节名称、排序号，生成章节结构 |
| 章节编辑 | 章节信息维护 | 修改章节名称、排序，调整在课程体系中的展示顺序 |

##### 3. 小节管理

| **子模块** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 小节列表 | 小节内容管理 | 按所属章节展示小节列表，支持查看、编辑、删除 |
| 新增小节 | 小节创建 | 绑定所属章节，填写小节标题、Markdown 内容、知识点标签、难度、预计时长 |
| 小节编辑 | 内容维护 | 修改小节标题、内容、知识点标签，调整学习内容 |

##### 4. 题目管理

| **子模块** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 题目列表 | 题目维护 | 按课程、章节、小节筛选题目，展示题目列表，支持编辑、删除；展示题目平均得分、得分分布，查看题目打分规则 |
| 新建题目 | 题目创建 | 绑定所属小节，填写题目类型（选择 / 判断 / 代码题）、题目内容、选项、标准答案、解析 |
| 题目编辑 | 题目修改 | 修改题目内容、答案、解析，调整题目难度，支持预览题目效果 |

##### 5. 用户与数据管理

| **子模块** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 用户列表（可选） | 用户管理 | 查看所有注册用户信息，支持禁用 / 启用账号 |
| 学习数据统计 | 数据看板 | 查看课程学习人数、完成率、题目正确率等基础数据 |

#### 3.1.4.3 核心交互流程

*   **新增课程方向流程**

    1.  管理员登录后台 → 进入「课程」管理页

    2.  点击「新增方向」按钮 → 填写课程名称、描述、排序权重

    3.  提交表单 → 后台校验并保存 → 前台课程列表同步新增该课程

*   **新增章节流程**

    1.  管理员进入「章节」管理页 → 先选择所属课程

    2.  点击「新增章节」按钮 → 填写章节名称、排序号

    3.  提交后，章节自动挂载到所选课程下

*   **新增小节流程**

    1.  管理员进入「小节」管理页 → 选择课程 + 所属章节

    2.  填写小节标题、内容、知识点标签、难度

    3.  提交后，小节自动挂载到所选章节下

*   **新增题目流程（你截图的「新建练习」）**

    1.  管理员进入「题目」管理页 → 选择课程 + 章节（筛选后显示对应小节）

    2.  点击「新建题目」按钮 → 选择题目类型，填写题目内容、选项、答案、解析

    3.  提交后，题目绑定到所选小节，AI 出题时可调用该题目


#### 3.1.4.4 后台权限与安全

*   仅管理员账号可访问后台入口，通过独立登录鉴权（与前台用户账号隔离）

*   所有操作记录日志，支持回溯修改记录

*   课程、章节、小节、题目数据支持批量导入 / 导出（后续迭代）


## 3.2 V1.1版本迭代模块（新增AI Agent）

### 3.2.1 小节(AI Agent)模块

| **子模块名称** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 学习引导子模块 | 学习流程控制 | 在小节学习过程中，AI Agent根据题目的前置知识知识讲解，引导用户逐步完成学习 |
| 题目生成子模块 | 自动出题 | 有静态题库，由管理员手动添加 |
| 评估与反馈子模块 | 答案判定与解释 | 对用户提交的答案或代码进行判断，返回正确/错误结果，并提供错误原因分析及相关知识解释 |
| 分级提示子模块 | 引导式提示 | 当用户无法完成题目时，提供多级提示（方向提示→具体提示→接近答案），逐步引导用户完成问题 |
| 代码分析子模块 | 代码理解与优化 | 对用户提交的代码进行语法与逻辑分析，定位错误位置，提供修改建议及优化方案 |
| 学习状态子模块 | 学习数据感知 | 记录用户在当前小节中的表现（答题情况、错误记录、提问内容），用于支撑后续学习调整与推荐 |
| 对话交互子模块 | 用户交互入口 | 提供对话界面，支持用户输入文本、粘贴代码进行提问，实现与 AI Agent 的实时交互 |

流程设计

```yaml
进入小节
   ↓
[1] INIT 初始化
   - 加载 lesson
   - 创建 / 恢复 agent_session
   - 初始化状态（knowledge_point_index, hint_level=1）

   ↓
[2] EXPLAIN 知识讲解
   - AI讲解当前知识点
   - 可带“理解确认问题（可选）”

   ↓
[3] QUESTION 出题
   - 生成题目（AI or 题库）
   - 保存 exercise
   - 绑定到 session.current_exercise_id

   ↓
[4] WAIT_ANSWER 等待用户回答
   - 用户输入答案 / 代码

   ↓
[5] EVALUATE_BASE 基础评估
   - 规则判断（选择题 / 填空）
   - 测试用例（代码题）
   - 得到：is_pass（是否通过）

   ↓
[6] AI_EVALUATE
   - 调用 LLM 进行评分（结构化）
   - 输出：
       score（总分）
       dimensions（分项评分）
       feedback（评价）
       suggestions（建议）

   ↓
[7] MERGE_RESULT
   - 合并：
       基础评估结果 + AI评分
   - 生成最终结果：
       final_score
       is_correct
       feedback

   ↓
 ┌───────────────┬───────────────┐
 ↓               ↓
通过（PASS）     未通过（FAIL）
 ↓               ↓
[8] NEXT         [9] HINT
 ↓               ↓
进入下一知识点    hint_level +1
                ↓
           判断 hint_level

                ↓
      ┌───────────────┬───────────────┐
      ↓               ↓
  hint_level < 3     hint_level = 3
      ↓               ↓
返回 WAIT_ANSWER   [10] REVIEW
                   - 给完整解析
                   - 标记未掌握
                   ↓
                NEXT / 重做



```

### 3.2.2提示词

####  系统Prompt

```plaintext
你是一名编程教学AI Agent，目标是引导用户完成学习，而不是直接给答案。

你的行为规则：
1. 优先引导，而不是直接给答案
2. 用户错误时，先分析原因
3. 提供分级提示，而不是直接解答
4. 控制讲解长度，避免冗长
5. 保持互动感（像老师，而不是文档）

当前阶段：
{{state}}

当前知识点：
{{knowledge_point}}

用户能力：
{{user_level}}
```

#### 出题Prompt

```plaintext
请基于以下知识点生成一道编程题：

知识点：
{{knowledge_point}}

难度：
{{difficulty}}

要求：
1. 必须可用于教学
2. 包含清晰输入输出
3. 不要给答案
4. 类型：{{type}}（选择 / 填空 / 编程）

返回格式：
{
  "question": "",
  "options": [],
  "answer": "",
  "analysis": ""
}
```

####  评估Prompt

```plaintext
请评估用户答案：

题目：
{{question}}

标准答案：
{{answer}}

用户答案：
{{user_answer}}

要求：
1. 判断是否正确
2. 如果错误，说明错误原因
3. 指出知识点问题
4. 不直接给完整答案（除非多次错误）

返回格式：
{
  "is_correct": true/false,
  "feedback": "",
  "error_type": ""
}
```

####  提示Prompt（分级）

Level 1（方向提示）

```plaintext
给用户一个提示（方向性），不要接近答案
```

Level 2（具体提示）

```plaintext
给用户一个具体提示，但不要完整答案
```

Level 3（接近答案）

```plaintext
给出接近答案的提示，可以包含部分代码
```
```yaml
提示策略：

- 初始 hintLevel = 1
- 每次错误 hintLevel +1
- 最大为 3

当 hintLevel = 3 且仍错误：
→ 进入 REVIEW 状态
→ 给出完整解析
→ 标记该知识点为“未掌握”
```

---

####  代码分析Prompt

```plaintext
请分析以下代码：

代码：
{{code}}

要求：
1. 找出错误
2. 说明原因
3. 提供修改建议
4. 标注错误位置
```
---

### 3.2.3数据流设计

 学习流程数据流

```plaintext
用户进入小节
   ↓
前端请求 lesson
   ↓
后端返回内容 + 初始化Agent
   ↓
Agent → EXPLAIN（调用LLM）
   ↓
返回讲解内容
   ↓
Agent → QUESTION（生成题目）
   ↓
前端展示题目
   ↓
用户提交答案
   ↓
后端 → Agent.evaluate
   ↓
LLM评估
   ↓
返回结果 + 状态更新
```

## 3.3 V2.1版本迭代模块

### 3.3.1 通知提醒模块

| **子模块名称** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 学习提醒子模块 | 学习提醒通知 | 支持用户设置学习提醒时间，推送未完成章节、课程更新、AI推荐等通知 |
| 提醒管理子模块 | 提醒控制 | 支持开启/关闭提醒、修改提醒时间等配置 |

### 3.3.2 学习社群模块

| **子模块名称** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 小组管理子模块 | 学习小组管理 | 支持创建、加入学习小组，管理员可管理成员 |
| 社群交流子模块 | 内容互动 | 支持小组内聊天、代码分享、学习经验交流 |
| 公告子模块 | 信息发布 | 支持管理员发布公告，通知小组成员 |

### 3.3.3 测试模块

| **子模块名称** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 测试评估子模块 | 结果分析 | 自动计算得分，记录错题并提供解析 |
| 测试报告子模块 | 学习反馈 | 展示测试结果、错误分析，支持重新测试 |

### 3.3.4 多端适配模块

| **子模块名称** | **核心功能** | **具体描述** |
| --- | --- | --- |
| 响应式布局子模块 | 多端适配 | 支持手机、平板、PC端布局自适应 |
| 交互适配子模块 | 体验优化 | 针对不同设备优化操作方式与界面展示 |

# 4. UI设计

## 4.1 UI风格设计

> 前端具体实现以 [CodeStory 前端设计规范](./CodeStory_前端设计规范.md) 为准；本节保留产品设计背景。

需要完全采用 Neo-Brutalism (新粗野主义) 设计风格。

具体样式要求如下（建议使用 Tailwind CSS 实现）：

*   **边框**： 所有卡片、按钮、输入框都要有明显的粗黑实线边框（例如 border-2 border-black 或 border-4）。

*   **阴影**： 不要使用常规的模糊阴影，必须使用纯黑色的硬底阴影（Hard Shadow），即向右下方偏移的色块（例如 shadow-\[4px\_4px\_0\_0\_rgba(0,0,0,1)\]）。

*   **色彩**： 整体使用高饱和度的色块，卡片背景色使用明亮的绿色、紫色或白色，页面顶部导航栏使用亮黄色。

*   **交互**： 当鼠标悬浮（Hover）在卡片或按钮上时，产生按压效果（阴影位移变小，元素向右下移动：translate-x-1 translate-y-1 shadow-\[0px\_0px\_0\_0\_rgba(0,0,0,1)\]）。

*   **背景**： 页面底层需要一个由极小的黑色圆点组成的矩阵背景（Dotted background）。

*   **排版**： 标题字体加粗，信息呈现要像复古仪表面板一样直接。卡片右上角加上带有粗黑边框的状态标签（如 DONE、PAUSE）。


## 4.2 UI图

### ![ChatGPT Image 2026年5月2日 16_28_10.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/Yvenve5ZPye81loy/img/5ea2a1ef-facd-401b-bb22-e1345d0b70a3.png)

### 小节UI图

![ChatGPT Image 2026年5月2日 11_20_46.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/Yvenve5ZPye81loy/img/e3dae3f4-0184-4627-b309-c9bdcd1a0ca8.png)

# 5. 技术架构设计

## 5.1 前端技术栈

| 维度 | 技术选型 | 备选方案 | 选择理由 |
| --- | --- | --- | --- |
| 框架 | Next.js | Vite + React | Next.js 提供 SSR / API Routes ，适合 AI 应用（减少前后端分离复杂度） |
| 样式 | Tailwind CSS | SCSS / CSS Modules | 原子化样式开发效率高，适合快速实现 Neo-Brutalism 风格 |
| 状态管理 | Zustand | Redux / MobX | 轻量、无模板代码，学习成本低，适合中型项目（Redux过重） |
| 路由 | App Router（Next.js） | React Router | 与 Next.js 深度集成，支持服务端组件与布局嵌套 |
| 编辑器 | Monaco Editor | CodeMirror | Monaco功能更强（接近 VS Code），更适合编程教学场景 |
| 网络请求 | Axios | fetch | Axios封装更完善（拦截器、统一错误处理），适合中大型项目 |
| Markdown渲染 | React Markdown | tiptap | React Markdown更轻量，适合纯内容渲染（MDX更复杂） |

## 5.2 后端技术栈

| 维度 | 技术选型 | 备选方案 | 选择理由 |
| --- | --- | --- | --- |
| 运行环境 | Node.js | Java / Go | Node.js 与前端同语言，开发效率高，适合 AI 业务快速迭代 |
| 框架 | Express | NestJS / Koa | Express简单灵活，适合 MVP 快速开发（NestJS更规范但较重） |
| 数据库 | PostgreSQL | MySQL / MongoDB | PostgreSQL 支持 JSON、事务强，适合复杂结构（AI数据 + 关系数据） |
| ORM | Prisma | TypeORM / Sequelize/Drizzle | Prisma 类型安全强，开发体验好，适合 TS 项目 |
| 缓存 | Redis |  | Redis 功能丰富（缓存 + 状态 + 限流），适合 AI 场景 |
| 鉴权 | JWT | Session | JWT 无状态，适合前后端分离和扩展（Session依赖服务端存储） |
| AI服务 | OpenAI API / LLM接口 | 本地模型 | 云模型效果稳定、成本可控，适合 MVP（本地部署复杂） |
| 队列（可选） | BullMQ | RabbitMQ / Kafka | BullMQ 基于 Redis，轻量，适合 Node 项目（Kafka过重） |
| 日志 | Winston | console.log / Pino | Winston 功能完整（分级、持久化），适合后期扩展（console过弱） |

## 5.3 系统架构图

| **层级** | **模块** | **描述** |
| --- | --- | --- |
| 前端层 | Web App | 用户界面（课程学习 + AI交互） |
| 接口层 | API Gateway | 统一接口入口 |
| 业务层 | 用户服务 / 课程服务 / 学习服务 / AI服务 | 核心业务逻辑 |
| AI层 | Prompt + Agent逻辑 | 控制学习流程（讲解/出题/提示） |
| 数据层 | PostgreSQL + Redis | 数据存储与缓存 |
| 外部服务 | AI API | 大模型能力支持 |

#### 架构图：

![image.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/Yvenve5ZPye81loy/img/53db2b86-1bff-4931-ba1a-ad0de6965583.png)

# 6. 数据设计

## 6.1 核心数据模型

#### 用户表（users）

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | char(36) | 用户ID（uuid） |
| email | varchar(255) | 邮箱（唯一） |
| role | tinyint | 角色（0- 普通用户 1- 管理员） |
| password | varchar(255) | 加密密码 |
| nickname | varchar(50) | 昵称 |
| avatar | varchar(500) | 头像 |
| sex | tinyint | 性别 |
| occupation | varchar(100) | 职业 |
| score | bigint | 成绩积分 |
| level | tinyint | 用户等级（0-青铜 / 1 -黄金 / 2-钻石） |
| created\_at | datetime | 创建时间 |
| updated\_at | datetime | 更新时间 |
| is\_delete | tinyint | 是否删除（0/1），默认为0 |

##### sql语句：

```sql
CREATE TABLE users (
    id char(36) NOT NULL COMMENT '用户ID(UUID)',

    email varchar(255) NOT NULL COMMENT '邮箱',

    password varchar(255) NOT NULL COMMENT '加密密码',

    role tinyint DEFAULT 0 COMMENT '角色 0-普通用户 1-管理员',

    nickname varchar(50) NOT NULL COMMENT '昵称',

    avatar varchar(500) DEFAULT NULL COMMENT '头像',

    sex tinyint DEFAULT 0 COMMENT '性别 0未知 1男 2女',

    occupation varchar(100) DEFAULT NULL COMMENT '职业',

    score bigint DEFAULT 0 COMMENT '成绩积分',

    level tinyint DEFAULT 0  COMMENT '用户等级 0-青铜  1 -黄金  2-钻石',

    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    is_delete tinyint DEFAULT 0 COMMENT '是否删除（0否 1是）',

    PRIMARY KEY (id),

    UNIQUE KEY uk_email (email),

    INDEX idx_level (level),
    INDEX idx_created_at (created_at)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='用户表';
```

#### 课程表（courses）

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | char(36) | 课程ID（uuid） |
| cover\_url | varchar(500) | 课程封面 |
| title | varchar(100) | 课程名称 |
| description | text | 课程简介 |
| level | tinyint | 难度（0-easy /1-medium /2- hard） |
| created\_at | datetime | 创建时间 |
| updated\_at | datetime | 更新时间 |
| is\_delete | tinyint | 是否删除（0/1），默认为0 |

##### sql语句：

```sql
CREATE TABLE courses (
    id char(36) NOT NULL COMMENT '课程ID(UUID)',

    cover_url varchar(500) DEFAULT NULL COMMENT '课程封面',

    title varchar(100) NOT NULL COMMENT '课程名称',

    description text COMMENT '课程简介',

    level tinyint DEFAULT 0 COMMENT '难度 0-easy 1-medium 2-hard',

    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    is_delete tinyint DEFAULT 0 COMMENT '是否删除（0否 1是）',

    PRIMARY KEY (id),

    INDEX idx_level (level),
    INDEX idx_created_at (created_at)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='课程表';
```

#### 课程进度表（course\_progress）

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | char(36) | 主键（uuid） |
| user\_id | char(36) | 用户ID |
| course\_id | char(36) | 课程ID |
| completed\_lessons | int | 已完成小节数 |
| total\_lessons | int | 小节总数 |
| status | tinyint | 状态（0- not\_started / 1- in\_progress / 2- completed） |
| last\_learned\_at | datetime | 最近学习时间 |
| created\_at | datetime | 创建时间 |
| updated\_at | datetime | 更新时间 |
| is\_delete | tinyint | 是否删除（0/1），默认为0 |

##### sql语句：

```sql
CREATE TABLE user_course_progress (
    id char(36) NOT NULL COMMENT '主键(UUID)',

    user_id char(36) NOT NULL COMMENT '用户ID',

    course_id char(36) NOT NULL COMMENT '课程ID',

    completed_lessons int DEFAULT 0 COMMENT '已完成小节数',

    total_lessons int DEFAULT 0 COMMENT '小节总数',

    status tinyint DEFAULT 0 COMMENT '状态 0- not_started  1- in_progress  2- completed',

    last_learned_at datetime DEFAULT NULL COMMENT '最近学习时间',

    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    is_delete tinyint DEFAULT 0 COMMENT '是否删除（0否 1是）',

    PRIMARY KEY (id),

    UNIQUE KEY uk_user_course (user_id, course_id),

    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    INDEX idx_status (status)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='用户课程进度表';
```

#### 章节表（chapters）

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | char(36) | 章节ID（uuid） |
| course\_id | char(36) | 所属课程ID |
| title | varchar(255) | 章节名称 |
| order | int | 排序 |
| created\_at | datetime | 创建时间 |
| updated\_at | datetime | 更新时间 |
| is\_delete | tinyint | 是否删除（0/1），默认为0 |

##### sql语句：

```sql
CREATE TABLE chapters (
    id char(36) NOT NULL COMMENT '章节ID(UUID)',

    course_id char(36) NOT NULL COMMENT '所属课程ID',

    title varchar(255) NOT NULL COMMENT '章节名称',

    `order` int NOT NULL DEFAULT 0 COMMENT '排序',

    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    is_delete tinyint DEFAULT 0 COMMENT '是否删除（0否 1是）',

    PRIMARY KEY (id),

    INDEX idx_course_id (course_id),
    INDEX idx_order (`order`)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='课程章节表';
```

#### 小节表（lessons）

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | char(36) | 小节ID（uuid） |
| chapter\_id | char(36) | 所属章节ID |
| title | varchar(255) | 小节标题 |
| content | text | 小节内容（Markdown） |
| difficulty | tinyint | 难度（0-easy /1- medium /2- hard） |
| score\_avg | int | 平均得分 |
| estimated\_time | int | 预计学习时长（分钟） |
| order | int | 排序 |
| created\_at | datetime | 创建时间 |
| updated\_at | datetime | 更新时间 |
| is\_delete | tinyint | 是否删除（0/1），默认为0 |

##### sql语句：

```sql
CREATE TABLE lessons (
    id char(36) NOT NULL COMMENT '小节ID',

    chapter_id char(36) NOT NULL COMMENT '所属章节ID',

    title varchar(255) NOT NULL COMMENT '小节标题',

    content text COMMENT '小节内容（markdown）',

    difficulty tinyint DEFAULT 0 COMMENT '难度 0-easy 1- medium 2- hard',

    score_avg int DEFAULT 0 COMMENT '平均得分',

    estimated_time int DEFAULT 0 COMMENT '预计学习时长（分钟）',

    `order` int DEFAULT 0 COMMENT '排序',

    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    is_delete tinyint DEFAULT 0 COMMENT '是否删除（0否 1是）',

    PRIMARY KEY (id),

    INDEX idx_chapter_id (chapter_id),
    INDEX idx_order (`order`),
    INDEX idx_difficulty (difficulty)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='课程小节表';
```

#### 小节进度表（lesson\_progress）

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | char(36) | 主键（uuid） |
| user\_id | char(36) | 用户ID |
| lesson\_id | char(36) | 小节ID |
| status | tinyint | 状态（0-not\_started / 1-in\_progress / 2-completed） |
| mastery\_level | int | 掌握程度（0-100） |
| last\_learned\_at | datetime | 最近学习时间 |
| created\_at | datetime | 创建时间 |
| updated\_at | datetime | 更新时间 |
| is\_delete | tinyint | 是否删除（0/1），默认为0 |

##### sql语句：

```sql
CREATE TABLE user_lesson_progress (
    id char(36) NOT NULL COMMENT '主键(UUID)',

    user_id char(36) NOT NULL COMMENT '用户ID',

    lesson_id char(36) NOT NULL COMMENT '小节ID',

    status tinyint DEFAULT 0 COMMENT '状态 0-未开始 1-进行中 2-已完成',

    mastery_level int DEFAULT 0 COMMENT '掌握程度（0-100）',

    last_learned_at datetime DEFAULT NULL COMMENT '最近学习时间',

    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    is_delete tinyint DEFAULT 0 COMMENT '是否删除（0否 1是）',

    PRIMARY KEY (id),

    INDEX idx_user_id (user_id),
    INDEX idx_lesson_id (lesson_id),
    INDEX idx_status (status),

    UNIQUE KEY uk_user_lesson (user_id, lesson_id)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='用户学习进度表';
```

#### 题目表（exercises）

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | char(36) | 题目ID（uuid） |
| lesson\_id | char(36) | 所属小节 |
| type | varchar(20) | 类型（choice / judge / fill / code） |
| knowledge | text | 前置知识 markdown（可选） |
| content | text | 题目内容 |
| answer | text | 标准答案 |
| analysis | text | 解析 |
| difficulty | tinyint | 难度（1-5） |
| source | varchar(20) | 来源（AI / STATIC） |
| metadata | json | 扩展数据（如测试用例） |
| created\_at | datetime | 创建时间 |
| updated\_at | datetime | 更新时间 |
| is\_delete | tinyint | 是否删除（0/1），默认为0 |

##### sql语句：

```sql
CREATE TABLE exercises (
    id char(36) NOT NULL COMMENT '题目ID',

    lesson_id char(36) NOT NULL COMMENT '所属小节',

    type varchar(20) NOT NULL COMMENT '类型（choice/judge/fill/code）',

    knowledge text COMMENT '前置知识 markdown',

    content text NOT NULL COMMENT '题目内容',

    answer text NOT NULL COMMENT '标准答案',

    analysis text COMMENT '解析',

    difficulty tinyint NOT NULL DEFAULT 1 COMMENT '难度（1-5）',

    source varchar(20) DEFAULT 'ai' COMMENT '来源（ai/static）',

    metadata json COMMENT '扩展数据（如测试用例）',

    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    is_delete tinyint DEFAULT 0 COMMENT '是否删除（0否 1是）',

    PRIMARY KEY (id),

    INDEX idx_lesson_id (lesson_id),
    INDEX idx_type (type),
    INDEX idx_difficulty (difficulty),
    INDEX idx_created_at (created_at)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='题目表';
```

#### 用户答案表（answers）

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | char(36) | 主键（uuid） |
| user\_id | char(36) | 用户ID |
| exercise\_id | char(36) | 题目ID |
| answer | text | 用户答案 |
| submission\_count | int | 提交次数 |
| feedback | text | AI反馈 |
| hint\_level\_used | int | 使用的提示等级（1-3） |
| score | int | 得分（0-100） |
| created\_at | datetime | 创建时间 |
| updated\_at | datetime | 更新时间 |
| is\_delete | tinyint | 是否删除（0/1），默认为0 |

##### sql语句：

```sql
CREATE TABLE answers (
    id char(36) NOT NULL COMMENT '主键(UUID)',

    user_id char(36) NOT NULL COMMENT '用户ID',

    exercise_id char(36) NOT NULL COMMENT '题目ID',

    answer text COMMENT '用户答案',

    submission_count int DEFAULT 1 COMMENT '提交次数',

    feedback text COMMENT 'AI反馈',

    hint_level_used int DEFAULT 0 COMMENT '使用的提示等级（1-3）',

    score int DEFAULT 0 COMMENT '得分（0-100）',

    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    is_delete tinyint DEFAULT 0 COMMENT '是否删除（0否 1是）',

    PRIMARY KEY (id),

    INDEX idx_user_id (user_id),
    INDEX idx_exercise_id (exercise_id),
    INDEX idx_user_exercise (user_id, exercise_id),
    INDEX idx_created_at (created_at)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='题目提交记录表';
```

#### Agent会话表（agent\_sessions）

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | char(36) | 会话ID（uuid） |
| user\_id | char(36) | 用户ID |
| lesson\_id | char(36) | 小节ID |
| state | tinyint | 当前状态（0- INIT /1-  EXPLAIN / 2- QUESTION /3-  WAIT\_ANSWER / 4- EVALUATE / 5- HINT / 6- REVIEW） |
| current\_exercise\_id | UUID | 当前题目ID |
| hint\_level | int | 当前提示等级（1-3） |
| context | json | 上下文（AI用） |
| created\_at | datetime | 创建时间 |
| updated\_at | datetime | 更新时间 |
| is\_delete | tinyint | 是否删除（0/1），默认为0 |

##### sql语句：

```sql
CREATE TABLE agent_sessions (
    id char(36) NOT NULL COMMENT '会话ID（uuid）',

    user_id char(36) NOT NULL COMMENT '用户ID',

    lesson_id char(36) NOT NULL COMMENT '小节ID',

    state tinyint DEFAULT 0  COMMENT '当前状态 0- INIT 1-  EXPLAIN  2- QUESTION 3-  WAIT_ANSWER  4- EVALUATE  5- HINT  6- REVIEW',

    current_exercise_id char(36) DEFAULT NULL COMMENT '当前题目ID',

    hint_level int DEFAULT 0 COMMENT '当前提示等级（1-3）',

    context json COMMENT '上下文（AI使用）',

    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    is_delete tinyint DEFAULT 0 COMMENT '是否删除（0否 1是）',

    PRIMARY KEY (id),

    INDEX idx_user_id (user_id),
    INDEX idx_lesson_id (lesson_id),
    INDEX idx_state (state),
    INDEX idx_created_at (created_at)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='AI Agent 会话表';
```

#### 微信表（未来拓展）

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | char(36) | 主键ID |
| user\_id | char(36) | 关联用户ID |
| openid | varchar(100) | 微信 openid（唯一） |
| unionid | varchar(100) | 微信 unionid（同一主体唯一） |
| nickname | varchar(100) | 微信昵称 |
| avatar | varchar(500) | 微信头像 |
| gender | tinyint | 性别（0未知 1男 2女） |
| created\_at | datetime | 创建时间 |
| updated\_at | datetime | 更新时间 |
| is\_delete | tinyint | 是否删除（0/1），默认为0 |

##### sql语句：

```sql
CREATE TABLE user_wechat (
    id char(36) NOT NULL COMMENT '主键ID',

    user_id char(36) NOT NULL COMMENT '用户ID',

    openid varchar(100) NOT NULL COMMENT '微信openid',

    unionid varchar(100) DEFAULT NULL COMMENT '微信unionid',

    nickname varchar(100) DEFAULT NULL COMMENT '微信昵称',

    avatar varchar(500) DEFAULT NULL COMMENT '微信头像',

    gender tinyint DEFAULT 0 COMMENT '性别 0未知 1男 2女',

    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    is_delete tinyint DEFAULT 0 COMMENT '是否删除（0否 1是）',

    PRIMARY KEY (id),

    UNIQUE KEY uk_openid (openid),

    INDEX idx_user_id (user_id),
    INDEX idx_unionid (unionid)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='微信用户表';
```

## 6.2 ER图

![ChatGPT Image 2026年5月2日 16_06_59.png](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/Yvenve5ZPye81loy/img/18ead475-db80-49b0-bc46-dce4ba0eff2f.png)

# 7. MVP

| **版本** | **周期** | **核心内容** |
| --- | --- | --- |
| V1.0 | 2天 | 用户系统 + 课程系统 + 学习页面 + 基础练习 |
| V1.1 | 3天 | AI对话 + 代码分析 + 基础提示 |
| V2.1 | 5天 | 测试系统 + 社群 + 多端适配 |

# 8. 风险与应对

| **风险类型** | **风险描述** | **应对措施** |
| --- | --- | --- |
| 技术风险 | AI返回不稳定或错误 | 增加兜底逻辑与重试机制 |
| 成本风险 | AI调用成本过高 | 控制调用频率与上下文长度 |
| 性能风险 | 并发高导致响应慢 | 使用缓存与异步队列 |
| 安全风险 | 用户数据泄露 | 加密存储 + 权限控制 |
| 需求风险 | 功能范围过大 | 严格按MVP推进 |
| 体验风险 | AI回答质量不稳定 | 优化Prompt与提示策略 |
