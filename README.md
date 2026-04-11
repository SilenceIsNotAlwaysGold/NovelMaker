# NovelMaker — 中文长篇小说写作智能体

> 支撑 20万–100万字 长篇网文创作，解决超长篇幅下的记忆丢失、角色漂移、伏笔遗忘问题。

---

## 核心设计

### 分层记忆架构

```
Layer 0  全书基因       <2000字  每章必读
Layer 1  卷概要         <3000字  每章必读
Layer 2  当前弧线       <2000字  每章必读
Layer 3  近3章摘要      <2000字  每章必读
Layer 4  伏笔/角色/历史         按需加载
```

每章写作时上下文预算约 **9000字**，无论写到第几十万字都不会爆上下文。

### 六阶段工作流

```
Phase 1  创意采集（交互式问答）
Phase 2  全书骨架（基因/大纲/人物/世界观）
Phase 3  卷级规划（弧线划分/伏笔计划）
Phase 4  逐章创作（记忆组装→写作→三审→归档）
Phase 5  卷末收尾（角色快照/伏笔审计/压缩摘要）
Phase 6  全书收尾（伏笔清零/导出定稿）
```

---

## 项目结构

```
NovelMaker/
├── SKILL.md                     # Claude Code Skill 定义（六阶段流程）
├── design.md                    # 架构设计文档
│
├── templates/                   # 创作模板（10个）
│   ├── 全书基因-template.md
│   ├── 全书大纲-template.md
│   ├── 卷概要-template.md
│   ├── 弧线-template.md
│   ├── 章节-template.md
│   ├── 人物档案-template.md
│   ├── 世界观-template.md
│   ├── 伏笔-template.md
│   ├── 术语表-template.md
│   └── 卷终稿摘要-template.md
│
├── references/                  # 写作参考资料（16个）
│   ├── hook-techniques-opening.md   # 10种开头钩子
│   ├── hook-techniques-ending.md    # 10种结尾悬念
│   ├── dialogue-guide.md            # 对话写作指南
│   ├── content-expansion.md         # 内容扩充技巧
│   ├── consistency.md               # 一致性保证
│   ├── anti-ai-checklist.md         # 去AI味清单
│   ├── pacing-guide.md              # 节奏控制
│   ├── character-building.md        # 人物塑造
│   ├── character-arc-patterns.md    # 角色弧线模式
│   ├── plot-structures.md           # 情节结构
│   ├── quality-checklist.md         # 质量检查清单
│   ├── subplot-weaving.md           # 多线叙事
│   └── genre-conventions/           # 题材套路（7个）
│       ├── xuanhuan.md              # 玄幻/修真
│       ├── dushi.md                 # 都市
│       ├── xuanyi.md                # 悬疑/推理
│       ├── yanqing.md               # 言情
│       ├── wuxia.md                 # 武侠/仙侠
│       ├── kehuan.md                # 科幻
│       └── lishi.md                 # 历史/架空
│
├── scripts/                     # 质量控制脚本（7个）
│   ├── run_all_checks.py            # 一键全检调度器
│   ├── check_wordcount.py           # 字数检查
│   ├── consistency_check.py         # 术语一致性校验
│   ├── anti_ai_lint.py              # AI味检测
│   ├── ai_blacklist.yaml            # AI味检测黑名单（可自定义）
│   ├── foreshadow_audit.py          # 伏笔回收审计
│   ├── context_assembler.py         # 分层记忆拼装器
│   └── export_text.py               # 导出纯文本定稿
│
└── novels/                      # 小说存放目录
    └── {小说名}/
        ├── 全书基因.md
        ├── 全书大纲.md
        ├── 人物总档案.md
        ├── 世界观全集.md
        ├── 伏笔追踪表.md
        ├── 术语表.md
        ├── 卷一_{卷名}/
        │   ├── 卷概要.md
        │   ├── 弧线A_{名称}.md
        │   ├── 章节摘要.md
        │   ├── 第01章.md
        │   └── ...
        └── archive/             # 已完成卷的压缩摘要
```

---

## 快速开始

### 使用 Claude Code Skill

将 `SKILL.md` 放入你的 Claude Code 配置目录，之后直接说：

```
帮我创作一部玄幻小说
```

智能体会自动引导完成创意采集 → 骨架搭建 → 逐章创作的完整流程。

### 手动使用脚本

```bash
# 一键全检（字数+术语+AI味+伏笔）
python scripts/run_all_checks.py novels/小说名

# 只检查某一卷
python scripts/run_all_checks.py novels/小说名 --volume 卷一

# 快速模式（只跑字数和AI味）
python scripts/run_all_checks.py novels/小说名 --quick

# 单独检查
python scripts/check_wordcount.py novels/小说名/卷一/第01章.md
python scripts/anti_ai_lint.py novels/小说名/卷一/第01章.md
python scripts/consistency_check.py novels/小说名/术语表.md novels/小说名/卷一/
python scripts/foreshadow_audit.py novels/小说名/伏笔追踪表.md

# 组装当前章节上下文
python scripts/context_assembler.py novels/小说名 15

# 导出纯文本定稿
python scripts/export_text.py novels/小说名
```

---

## 质量控制

### 章级红线

| 项目 | 标准 |
|------|------|
| 每章字数 | 3000–5000字 |
| AI黑名单词 | 每章 < 3次 |
| "他感到/她觉得" | 每章 < 3次 |
| 冲突点 | 每章 ≥ 1个 |
| 悬念结尾 | 每章必须 |
| 术语一致 | 0偏差 |

### AI味评分

| 分数 | 等级 | 处理建议 |
|------|------|----------|
| ≤ 5 | 🟢 优秀 | 可直接使用 |
| ≤ 15 | 🟡 一般 | 小幅修改 |
| ≤ 30 | 🟠 较差 | 需要修改 |
| > 30 | 🔴 严重 | 大幅重写 |

### 伏笔状态

| 标记 | 含义 |
|------|------|
| 🔴 | 已埋设，待回收 |
| 🟡 | 部分回收 |
| 🟢 | 已回收 |
| ⚫ | 已废弃 |

全书完结条件：伏笔追踪表中不允许存在 🔴 状态。

---

## 自定义配置

**AI味检测黑名单** — 编辑 `scripts/ai_blacklist.yaml` 即可增删词条，无需修改代码：

```yaml
华丽空洞词:
  - 璀璨
  - 瑰丽
  # 在此添加你想检测的词...

AI连接词:
  - 此外
  - 然而
  # ...
```

---

## 支持题材

| 题材 | 参考文件 |
|------|----------|
| 玄幻/修真 | `references/genre-conventions/xuanhuan.md` |
| 都市 | `references/genre-conventions/dushi.md` |
| 悬疑/推理 | `references/genre-conventions/xuanyi.md` |
| 言情 | `references/genre-conventions/yanqing.md` |
| 武侠/仙侠 | `references/genre-conventions/wuxia.md` |
| 科幻 | `references/genre-conventions/kehuan.md` |
| 历史/架空 | `references/genre-conventions/lishi.md` |
