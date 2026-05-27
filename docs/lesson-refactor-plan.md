# 小节重构方案：从单题模式到边学边练模式

## 一、背景与目标

### 现状问题
- 每个小节只有一道练习题
- 模式单一，像刷题一样生硬
- 用户体验差，与开发初衷背道而驰

### 重构目标
- 小节中间部分先让用户学习知识（通过 Tiptap MD 编辑器创建内容）
- 学习过程中嵌入练习按钮，用户点击后弹出题目弹窗
- 一个小节支持多道题目
- 用户需要完成所有题目，小节状态才会变成"已完成"
- 后台管理员可以通过 Tiptap MD 编辑器新建和编辑学习内容

---

## 二、现有架构分析

### 数据库模型（schema.prisma）

```prisma
model lessons {
  id               String             @id @default(uuid()) @db.Char(36)
  chapter_id       String             @db.Char(36)
  title            String             @db.VarChar(255)
  content          String?            // 存储学习内容
  difficulty       Int                @default(0) @db.SmallInt
  estimated_time   Int                @default(0)
  order            Int                @default(0)
  // ... 其他字段
  exercises        exercises[]        // 已支持一对多关系
}

model exercises {
  id         String   @id @default(uuid()) @db.Char(36)
  lesson_id  String   @db.Char(36)           // 属于哪个小节
  type       String   @db.VarChar(20)         // 题目类型
  content    String                           // 题目内容
  answer     String                           // 答案
  analysis   String?                          // 解析
  metadata   Json?    @db.Json                // 元数据（选项等）
  hints      Json?    @db.Json                // 提示
  order      Int      @default(0)             // 新增：题目顺序
  // ... 其他字段
}
```

### 后端现状
- `lesson.service.ts`：查询时用 `take: 1`，只取一道题
- `lesson-manage.ts`：创建小节时只创建一道题

### 前端现状
- `LessonPage.tsx`：主页面，包含三个面板（目录、题目、AI聊天）
- `Question.tsx`：只显示一道题
- `MarkdownContent.tsx`：使用 ReactMarkdown 渲染内容
- **未使用 Tiptap 编辑器**

---

## 三、重构方案

### 方案选择：内嵌触发点模式（方案二）

**核心思路**：题目按钮直接嵌入在 Tiptap 渲染的学习内容中，用户边学边练

**交互流程**：
```
1. 用户打开小节页面
   ↓
2. 看到 Tiptap 渲染的学习内容
   ↓
3. 阅读内容，遇到第一个练习按钮
   ↓
4. 点击按钮 → 弹窗打开
   ↓
5. 完成题目 → 弹窗关闭，按钮变绿
   ↓
6. 继续阅读，遇到第二个练习按钮
   ↓
7. 点击按钮 → 弹窗打开
   ↓
8. 完成题目 → 弹窗关闭，按钮变绿
   ↓
9. 所有题目完成 → 小节状态变为"已完成"
```

### 页面布局变化

**现在的布局**：
```
┌─────────┬──────────────────┬─────────┐
│  目录   │     题目区域     │  AI聊天 │
│ Content │    Question      │  Chat   │
└─────────┴──────────────────┴─────────┘
```

**重构后的布局**：
```
┌─────────┬────────────────────────────┬─────────┐
│  目录   │       学习内容区域         │  AI聊天 │
│ Content │  ┌─────────────────────┐   │  Chat   │
│         │  │ Tiptap 渲染的内容   │   │         │
│         │  │                     │   │         │
│         │  │ [请完成练习1] 按钮   │   │         │
│         │  │                     │   │         │
│         │  │ [请完成练习2] 按钮   │   │         │
│         │  └─────────────────────┘   │         │
│         │  ┌─────────────────────┐   │         │
│         │  │  完成状态：2/3      │   │         │
│         │  │  [标记为已完成]     │   │         │
│         │  └─────────────────────┘   │         │
└─────────┴────────────────────────────┴─────────┘
```

---

## 四、数据库层改动

### 需要添加的字段

在 `exercises` 表添加 `order` 字段：

```prisma
model exercises {
  id           String   @id @default(uuid()) @db.Char(36)
  lesson_id    String   @db.Char(36)
  type         String   @db.VarChar(20)
  knowledge    String?
  content      String
  answer       String
  analysis     String?
  difficulty   Int      @default(1) @db.SmallInt
  source       String?  @db.VarChar(20)
  metadata     Json?    @db.Json
  hints        Json?    @db.Json
  order        Int      @default(0)  // 新增：题目顺序
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
  is_delete    Int      @default(0) @db.SmallInt
  lessons      lessons  @relation(fields: [lesson_id], references: [id], onDelete: Cascade)
}
```

### 迁移命令

```bash
npx prisma migrate dev --add-order-to-exercises
npx prisma generate
```

---

## 五、后端层改动

### 5.1 修改 lesson.service.ts

**改动点**：
- 返回所有题目而不是一道题
- 按 `order` 字段排序

```typescript
// 返回多个题目
const exercises = await prisma.exercises.findMany({
  where: { lesson_id: resolvedLessonId, is_delete: 0 },
  orderBy: { order: 'asc' },
});

return {
  // ... 其他字段
  exercises: exercises.map(ex => ({
    id: uuidToShortId(ex.id),
    type: ex.type,
    content: ex.content,
    order: ex.order,
    // ...
  })),
};
```

### 5.2 修改 lesson-manage.ts（后台管理）

**改动点**：
- 创建/编辑小节时支持多题目
- 支持 Tiptap JSON 内容存储
- 支持设置题目顺序

---

## 六、前端层改动

### 6.1 Tiptap 编辑器集成（后台管理）

**需要安装的依赖**：
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-image @tiptap/extension-code-block
```

**创建组件**：
- `TiptapEditor.tsx`：富文本编辑器组件
- `ExerciseButtonExtension.tsx`：自定义练习按钮节点

### 6.2 前台学习页面重构

**新增组件**：
- `ExerciseModal.tsx`：题目弹窗组件

**修改组件**：
- `Question.tsx`：改为内容展示 + 题目按钮
- `LessonPage.tsx`：调整布局，移除独立题目区域

### 6.3 Tiptap 自定义节点

```typescript
// extensions/ExerciseButton.ts
import { Node, mergeAttributes } from '@tiptap/core'

export const ExerciseButton = Node.create({
  name: 'exerciseButton',
  group: 'block',
  atom: true,  // 不可编辑

  addAttributes() {
    return {
      exerciseId: { default: null },
      label: { default: '请完成练习' },
      status: { default: 'pending' },  // pending | completed
    }
  },

  parseHTML() {
    return [{
      tag: 'exercise-button',
    }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['exercise-button', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ({ node }) => {
      const button = document.createElement('button')
      button.className = `exercise-trigger ${node.attrs.status}`
      button.textContent = node.attrs.label
      button.onclick = () => {
        const event = new CustomEvent('openExercise', {
          detail: { exerciseId: node.attrs.exerciseId }
        })
        document.dispatchEvent(event)
      }
      return { dom: button }
    }
  },
})
```

### 6.4 前台渲染组件

```tsx
// components/lessons/LessonContent.tsx
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ExerciseButton } from '@/extensions/ExerciseButton'
import ExerciseModal from './ExerciseModal'

export default function LessonContent({ content }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [currentExerciseId, setCurrentExerciseId] = useState(null)
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      ExerciseButton,
    ],
    content: content,
  })

  useEffect(() => {
    const handleOpenExercise = (e) => {
      setCurrentExerciseId(e.detail.exerciseId)
      setModalOpen(true)
    }
    
    document.addEventListener('openExercise', handleOpenExercise)
    return () => document.removeEventListener('openExercise', handleOpenExercise)
  }, [])

  return (
    <div>
      <EditorContent editor={editor} />
      
      <ExerciseModal
        isOpen={modalOpen}
        exerciseId={currentExerciseId}
        onClose={() => setModalOpen(false)}
        onComplete={(id) => {
          updateExerciseStatus(editor, id, 'completed')
        }}
      />
    </div>
  )
}
```

### 6.5 题目弹窗组件

```tsx
// components/lessons/ExerciseModal.tsx
interface ExerciseModalProps {
  exerciseId: string
  isOpen: boolean
  onClose: () => void
  onComplete: (exerciseId: string) => void
}

export default function ExerciseModal({ exerciseId, isOpen, onClose, onComplete }: ExerciseModalProps) {
  const [exercise, setExercise] = useState(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (isOpen && exerciseId) {
      setLoading(true)
      fetchExerciseDetail(exerciseId)
        .then(setExercise)
        .finally(() => setLoading(false))
    }
  }, [isOpen, exerciseId])
  
  const handleSubmit = async (answer) => {
    const result = await submitExercise(exerciseId, answer)
    
    if (result.correct) {
      onComplete(exerciseId)
      showToast.success('练习完成！')
      onClose()
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {loading ? (
        <Loading />
      ) : exercise ? (
        <>
          <h2>{exercise.title}</h2>
          
          {exercise.type === 'single_choice' && (
            <ChoiceQuestion exercise={exercise} onSubmit={handleSubmit} />
          )}
          {exercise.type === 'code' && (
            <CodeQuestion exercise={exercise} onSubmit={handleSubmit} />
          )}
        </>
      ) : (
        <div>题目加载失败</div>
      )}
    </Modal>
  )
}
```

### 6.6 按钮样式

```css
/* 未完成状态 */
.exercise-trigger {
  display: block;
  padding: 12px 16px;
  margin: 16px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  text-align: center;
  border: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.exercise-trigger:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.exercise-trigger::before {
  content: '💡';
  margin-right: 8px;
}

/* 已完成状态 */
.exercise-trigger.completed {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  cursor: default;
}

.exercise-trigger.completed:hover {
  transform: none;
  box-shadow: none;
}

.exercise-trigger.completed::before {
  content: '✅';
}
```

---

## 七、进度追踪逻辑

### 7.1 前端状态管理

```typescript
// hooks/useExerciseProgress.ts
export function useExerciseProgress(lessonId: string) {
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [totalExercises, setTotalExercises] = useState(0)
  
  const markAsCompleted = (exerciseId: string) => {
    setCompletedExercises(prev => new Set([...prev, exerciseId]))
  }
  
  const allCompleted = completedExercises.size === totalExercises && totalExercises > 0
  
  return {
    completedExercises,
    totalExercises,
    allCompleted,
    markAsCompleted,
    progress: totalExercises > 0 ? completedExercises.size / totalExercises : 0,
  }
}
```

### 7.2 小节完成条件

```typescript
// 只有所有题目都完成，才能标记小节为已完成
const handleLessonComplete = () => {
  if (allCompleted) {
    markLessonAsCompleted(lessonId)
  } else {
    showToast.warning(`还有 ${totalExercises - completedExercises.size} 道题目未完成`)
  }
}
```

---

## 八、实施步骤

### 阶段一：数据库和后端（1-2天）
1. 在 `exercises` 表增加 `order` 字段
2. 修改 `lesson.service.ts` 返回所有题目
3. 修改 `lesson-manage.ts` 支持多题目 CRUD

### 阶段二：后台管理（2-3天）
1. 安装 Tiptap 依赖
2. 创建 `TiptapEditor` 组件
3. 创建 `ExerciseButtonExtension` 扩展
4. 修改 `LessonModel.tsx` 支持富文本编辑和多题目管理

### 阶段三：前台学习页面（2-3天）
1. 创建 `ExerciseModal` 弹窗组件
2. 修改 `Question.tsx` 为内容展示+题目按钮
3. 实现题目完成状态追踪
4. 修改进度计算逻辑

### 阶段四：测试和优化（1-2天）
1. 功能测试
2. 用户体验优化
3. 性能优化

---

## 九、技术要点

### 9.1 Tiptap 内容存储格式

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Python 变量是存储数据的容器..." }]
    },
    {
      "type": "exerciseButton",
      "attrs": {
        "exerciseId": "abc123",
        "label": "请完成练习1：变量命名判断",
        "status": "pending"
      }
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "变量赋值使用 = 运算符..." }]
    },
    {
      "type": "exerciseButton",
      "attrs": {
        "exerciseId": "def456",
        "label": "请完成练习2：变量赋值练习",
        "status": "completed"
      }
    }
  ]
}
```

### 9.2 后台编辑器工具栏

```
┌─────────────────────────────────────────────────────────────┐
│  标题 ▼  |  B  |  I  |  代码块  |  图片  |  [插入练习按钮]  │
└─────────────────────────────────────────────────────────────┘
```

点击"插入练习按钮"后弹出选择框，选择要关联的题目。

---

## 十、注意事项

1. **数据迁移**：现有数据需要兼容处理
2. **向后兼容**：旧的小节内容需要能正常显示
3. **性能优化**：大量题目时的加载性能
4. **错误处理**：题目加载失败的降级方案

---

## 十一、预期效果

**用户体验提升**：
- 从"刷题模式"变为"边学边练模式"
- 学习过程更自然、更有趣
- 即时反馈，提高学习效率

**管理员体验提升**：
- 通过 Tiptap 编辑器可视化编辑内容
- 灵活控制练习位置和顺序
- 支持丰富的文本格式
