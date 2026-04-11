---
name: chinese-long-novelist
description: |
  创作20-100万字中文长篇小说的写作智能体。
  采用分层记忆架构（基因层/卷级/弧线/章级/按需检索），解决超长篇幅下的记忆丢失、角色漂移、伏笔遗忘问题。
  支持分卷管控、弧线叙事、伏笔追踪、术语一致性校验、AI痕迹检测。
  当用户要求：写长篇小说、创作网文、分卷写作、百万字小说时使用。
metadata:
  trigger: 创作中文长篇小说、网文、分卷写作、百万字小说
  source: 基于分层记忆架构设计，支持20-100万字长篇创作
---

# 中文长篇小说创作智能体

> 六阶段流程 · 分层记忆 · 分卷管控 · 伏笔追踪 · 去AI味

---

## Phase 1: 创意采集（交互式）

**使用 AskUserQuestion 工具逐一询问用户，收集创作要素。**

### 问题1：题材与风格

```
Question: 你想要创作什么题材的小说？
Options:
- 玄幻修真（境界升级、金手指、打脸逆袭）
- 都市异能（都市背景、身份反差、商战情感）
- 悬疑推理（谜题驱动、线索释放、反转揭秘）
- 言情（纯爱/虐恋/甜宠/先婚后爱）
- 武侠仙侠（江湖门派、侠义恩怨）
- 科幻（太空/末世/赛博朋克）
- 历史架空（朝堂权谋、架空王朝）
- 其他（请描述）
```

记录：`题材`。自动加载对应的题材参考 → `references/genre-conventions/{题材}.md`

### 问题2：主角设定

```
Question: 主角设定？
Options:
- 男性主角（独角戏）
- 女性主角（独角戏）
- 双主角（男女双线）
- 群像戏（多线叙事）
```

追问：主角姓名、年龄、身份/职业、金手指/特殊能力

### 问题3：主角性格与成长方向

```
Question: 主角的核心性格和成长方向？
Options:
- 正向成长（弱→强，胆怯→勇敢）
- 堕落弧（善→恶，信念崩塌→黑化）
- 救赎弧（堕落→觉醒→赎罪）
- 平弧（信念不变，改变世界）
- 复合弧（先成长→再堕落→再救赎）
```

### 问题4：核心冲突与世界观

```
Question: 小说的核心冲突？
Options:
- 升级逆袭（废物→强者，一路打脸）
- 查明真相（寻找答案、揭露秘密）
- 复仇（有明确的仇人和仇恨）
- 守护（守护重要的人/组织/世界）
- 权力争夺（宗门/朝堂/商场）
- 生存危机（末世/战争/困境求生）
```

追问：核心矛盾的具体描述（一句话概括全书主线）

### 问题5：规模与结构

```
Question: 你计划的小说规模？
Options:
- 小长篇（3-5卷，20-30万字）
- 中长篇（5-8卷，30-60万字）
- 大长篇（8-15卷，60-100万字）
- 超长篇（15卷以上，100万字+）
- 自定义（说明卷数和预估字数）
```

追问：每卷大概的主题/阶段方向（简要即可，后面会细化）

### 问题6：特殊要求

```
Question: 有什么特殊要求？
Options:
- 无特殊要求
- 有参考作品（告诉我作品名）
- 有特定的力量体系设定
- 有特定的世界观设定
- 其他（请描述）
```

**所有问题收集完毕后，总结确认，进入 Phase 2。**

---

## Phase 2: 全书骨架

### 步骤

1. **创建小说目录**：`novels/{小说名称}/`

2. **生成全书基因** → `novels/{名称}/全书基因.md`
   - 使用模板 `templates/全书基因-template.md`
   - 控制在 2000 字以内（这是永久加载的 Layer 0）
   - 包含：一句话卖点、主角核心、力量体系摘要、核心矛盾、全书节奏总览

3. **生成人物总档案** → `novels/{名称}/人物总档案.md`
   - 使用模板 `templates/人物档案-template.md`
   - 主角详细设定 + 3-5个核心配角 + 1-2个主要反派
   - 每个角色必须有：口头禅、习惯动作、核心动机、说话风格示例

4. **生成世界观全集** → `novels/{名称}/世界观全集.md`
   - 使用模板 `templates/世界观-template.md`
   - 力量体系、地理、势力、社会规则

5. **生成术语表** → `novels/{名称}/术语表.md`
   - 使用模板 `templates/术语表-template.md`
   - 人名/地名/功法/道具，标注禁止的误写形式

6. **创建伏笔追踪表** → `novels/{名称}/伏笔追踪表.md`
   - 使用模板 `templates/伏笔-template.md`
   - 初始规划 5-10 个全书级伏笔

7. **生成全书大纲** → `novels/{名称}/全书大纲.md`
   - 使用模板 `templates/全书大纲-template.md`
   - 这是全书的总控地图：分卷总览 + 逐卷弧线划分 + 逐章大纲
   - 包含：主线进度追踪、核心悬念链、主角成长路径、反派出场时间线
   - 每章用一句话标注核心事件，标记伏笔埋设/回收
   - **写作过程中持续更新**：章节完成时更新状态，大纲调整时记录变更

8. **生成全书节奏图** → `novels/{名称}/全书节奏图.md`
   - 参考 `references/pacing-guide.md` 的全书节奏模型
   - 标记每卷的情绪走向（低谷/上升/高潮/缓冲）
   - 与全书大纲对齐

9. **创建 archive 目录** → `novels/{名称}/archive/`（用于存放已完成卷的压缩摘要）

**向用户展示完整骨架，请求确认。确认后进入 Phase 3。**

---

## Phase 3: 卷级规划（每卷开始前执行）

### 步骤

1. **如果不是第一卷**：
   - 读取 `archive/卷{N-1}_终稿摘要.md` 了解前情
   - 读取人物总档案中上卷末的角色状态快照

2. **生成卷概要** → `novels/{名称}/卷{N}_{卷名}/卷概要.md`
   - 使用模板 `templates/卷概要-template.md`
   - 内容：本卷目标、冲突设计、弧线划分、角色状态、活跃支线、伏笔规划
   - 控制在 3000 字以内（Layer 1 预算）

3. **设计弧线** → 每条弧线一个文件 `弧线{序号}_{弧线名}.md`
   - 使用模板 `templates/弧线-template.md`
   - 每条弧线 3-8 章，有完整的起承转合
   - 标注弧线节奏：哪章是高潮、哪章是缓冲

4. **初始化章节摘要文件** → `章节摘要.md`（空文件，写作过程中逐步填充）

5. **本卷伏笔规划**
   - 从全书伏笔表中筛选本卷需回收的伏笔
   - 规划本卷新埋的伏笔
   - 更新伏笔追踪表

**向用户展示卷级规划，请求确认。确认后进入 Phase 4。**

---

## Phase 4: 逐章创作循环

**重要：用户确认卷级规划后，全程无需再次确认，逐章自动创作直到本卷完成。**

每章严格执行以下流程：

### 4a. 记忆组装（写前准备）

1. **运行记忆拼装器**（可选，用于查看完整上下文预算）：
   ```bash
   python scripts/context_assembler.py novels/{名称} {章节号}
   ```

2. **加载分层记忆**（手动读取或参考拼装器输出）：
   - Layer 0: 读取 `全书基因.md`
   - Layer 1: 读取当前 `卷概要.md`
   - Layer 2: 读取当前弧线文件（根据章节号匹配弧线）
   - Layer 3: 读取 `章节摘要.md` 最近 3 章摘要
   - Layer 3: 读取上一章最后 500 字原文
   - Layer 4: 如非第一卷，读取 `archive/` 中前卷终稿摘要

3. **按需检索**：
   - 检查伏笔追踪表：本章是否有计划回收的伏笔
   - 检查本章出场角色的最新状态

4. **确定本章目标**：
   - 在弧线中的位置（起/承/转/合）
   - 本章核心冲突是什么
   - 本章结尾要设置什么悬念

### 4b. 正文撰写

4. **创建章节文件** → 使用模板 `templates/章节-template.md`

5. **撰写正文**（3000-5000字）：
   - **开头（前20%）**：必须有即时冲突或悬念 → 参考 `references/hook-techniques-opening.md`
   - **中段**：冲突发展、对话推动、细节丰富
   - **对话规范** → 参考 `references/dialogue-guide.md`
     - 每个角色有独特说话方式
     - 对话带潜台词，不说废话
     - 动作beats穿插对话
   - **内容不足时** → 参考 `references/content-expansion.md`
   - **结尾（后20%）**：必须有悬念钩子 → 参考 `references/hook-techniques-ending.md`

6. **三大黄金法则检查**：
   - ① **展示而非讲述**：用动作/对话表现情感，不直接陈述
   - ② **冲突驱动**：本章是否有至少1个冲突点
   - ③ **悬念承上启下**：结尾是否有钩子

### 4c. 写后三审

7. **一审：一致性** → 参考 `references/consistency.md`
   - 人物性格/称呼是否与术语表一致
   - 时间线是否合理
   - 设定是否与世界观矛盾
   - 如有术语表，可运行：`python scripts/consistency_check.py novels/{名称}/术语表.md 本章文件路径`

8. **二审：去AI味** → 参考 `references/anti-ai-checklist.md`
   逐项检查并修改：
   - 删除黑名单词（璀璨、瑰丽、绚烂、然而、此外...）
   - "他感到/她觉得"改为外化动作（拳头握紧、目光移开...）
   - 四字成语连用打散为长短句交替
   - 对话增加口语化、角色个性化
   - 句长变化：长短句交错，避免节奏单调
   - 段首不连续3段以"他/她"开头

9. **三审：叙事质量**
   - 展示vs讲述比例（展示应>70%）
   - 对话是否推动剧情（不是闲聊）
   - 场景转换是否自然
   - 节奏是否符合弧线定位（起承转合）

10. **字数检查**：
    ```bash
    python scripts/check_wordcount.py novels/{名称}/卷{N}/第{XX}章.md
    ```
    低于3000字必须使用 `references/content-expansion.md` 扩充后重新检查。

### 4d. 归档

11. **生成章节摘要**（300-500字）→ 追加到 `章节摘要.md`
    - 包含：主要事件、角色变化、新埋伏笔、情感状态

12. **更新伏笔追踪表**：
    - 本章新埋的伏笔 → 添加为 🔴
    - 本章回收的伏笔 → 更新为 🟢
    - 部分暗示的伏笔 → 更新为 🟡

13. **更新角色状态**（如有重大变化）：
    - 在人物总档案中追加状态变化记录

14. **更新全书大纲**：
    - 将本章状态标记为 🟢 已完成
    - 如有大纲偏离，在"大纲调整记录"中记录原因和影响

15. **弧线边界检查**：
    - 如果本章是当前弧线最后一章 → 在弧线文件中标记完成
    - 如果本章是本卷最后一章 → 进入 Phase 5

**自动继续下一章，循环执行直到本卷完成。**

---

## Phase 5: 卷末收尾

本卷所有章节写完后执行：

### 步骤

1. **角色状态快照**：
   - 为每个活跃角色生成"卷{N}结束时"状态快照
   - 写入人物总档案

2. **伏笔审计**：
   ```bash
   python scripts/foreshadow_audit.py novels/{名称}/伏笔追踪表.md 卷{N}
   ```
   - 检查本卷计划回收的伏笔是否全部完成
   - 如有逾期未回收，补充在最后一章或标注延后至下卷

3. **生成卷终稿摘要** → `archive/卷{N}_终稿摘要.md`
   - 使用模板 `templates/卷终稿摘要-template.md`
   - 2000字以内，涵盖：主线进展、角色变化、伏笔状态、卷间衔接

4. **质量检查**：
   ```bash
   python scripts/check_wordcount.py --all novels/{名称}/卷{N}/
   python scripts/anti_ai_lint.py --all novels/{名称}/卷{N}/
   ```

5. **向用户报告本卷完成情况**：
   - 总字数、章节数
   - 伏笔回收率
   - 角色成长总结
   - 下一卷预告

**用户确认后，回到 Phase 3 开始下一卷规划。**

---

## Phase 6: 全书收尾（所有卷完成后）

1. **伏笔全局审计**：
   ```bash
   python scripts/foreshadow_audit.py novels/{名称}/伏笔追踪表.md
   ```
   不允许有 🔴 状态，所有伏笔必须 🟢 或 ⚫

2. **角色弧线完整性检查**：
   - 读取人物总档案，检查每个主要角色是否有完整成长轨迹
   - 参考 `references/character-arc-patterns.md` 验证弧线完整性

3. **全书质量报告**：
   ```bash
   python scripts/check_wordcount.py --all novels/{名称}/
   python scripts/anti_ai_lint.py --all novels/{名称}/
   ```
   - 总字数、卷数、章节数
   - 伏笔回收率
   - 各卷字数分布
   - AI味评分统计

4. **导出纯文本定稿**：
   ```bash
   python scripts/export_text.py novels/{名称} output
   ```
   输出结构：
   ```
   output/{小说名}/
   ├── 卷一_{卷名}/
   │   ├── 第01章_{标题}.txt    ← 纯正文，无元数据
   │   ├── 第02章_{标题}.txt
   │   └── ...
   ├── 卷二_{卷名}/
   │   └── ...
   └── 全书合集.txt              ← 全部章节按顺序合并
   ```

---

## 附录：关键规则速查

### 分层记忆预算

| 层级 | 内容 | 字数上限 | 加载策略 |
|------|------|----------|----------|
| L0 基因层 | 全书基因 | 2000字 | 每章必读 |
| L1 卷级 | 卷概要 | 3000字 | 每章必读 |
| L2 弧线 | 当前弧线 | 2000字 | 每章必读 |
| L3 章级 | 近3章摘要+上章尾段 | 2000字 | 每章必读 |
| L4 按需 | 伏笔/角色/历史章节 | 按需 | 需要时加载 |

### 写作质量红线

| 项目 | 标准 |
|------|------|
| 每章字数 | 3000-5000字 |
| 黑名单词 | 每章 <3 次 |
| "他感到/她觉得" | 每章 <3 次 |
| 冲突点 | 每章 >=1 |
| 悬念结尾 | 每章必须 |
| 术语一致 | 0偏差 |

### 可用脚本

| 脚本 | 用途 | 命令 |
|------|------|------|
| `run_all_checks.py` | **一键全检** | `python scripts/run_all_checks.py <小说目录> [--volume 卷名] [--quick]` |
| `check_wordcount.py` | 字数检查 | `python scripts/check_wordcount.py <文件>` |
| `consistency_check.py` | 术语一致性 | `python scripts/consistency_check.py <术语表> <目录> [--check-undefined]` |
| `anti_ai_lint.py` | AI味检测 | `python scripts/anti_ai_lint.py <文件>`（黑名单可编辑 `scripts/ai_blacklist.yaml`）|
| `foreshadow_audit.py` | 伏笔审计 | `python scripts/foreshadow_audit.py <伏笔表> [卷号]` |
| `context_assembler.py` | 记忆拼装 | `python scripts/context_assembler.py <小说目录> [章号]` |
| `export_text.py` | 导出纯文本 | `python scripts/export_text.py <小说目录> [输出目录]` |

### 参考资料索引

| 资料 | 用途 | 路径 |
|------|------|------|
| 开头钩子 | 设计章节开头 | `references/hook-techniques-opening.md` |
| 结尾悬念 | 设计章节结尾 | `references/hook-techniques-ending.md` |
| 对话写作 | 对话质量 | `references/dialogue-guide.md` |
| 内容扩充 | 字数不足时 | `references/content-expansion.md` |
| 一致性 | 人设/情节连贯 | `references/consistency.md` |
| 去AI味 | 消除AI痕迹 | `references/anti-ai-checklist.md` |
| 节奏控制 | 章/卷/全书节奏 | `references/pacing-guide.md` |
| 角色弧线 | 角色成长设计 | `references/character-arc-patterns.md` |
| 多线叙事 | 支线编织 | `references/subplot-weaving.md` |
| 人物塑造 | 角色深度刻画 | `references/character-building.md` |
| 情节结构 | 故事结构 | `references/plot-structures.md` |
| 题材套路-玄幻 | 玄幻/修真写作 | `references/genre-conventions/xuanhuan.md` |
| 题材套路-都市 | 都市题材写作 | `references/genre-conventions/dushi.md` |
| 题材套路-悬疑 | 悬疑/推理写作 | `references/genre-conventions/xuanyi.md` |
| 题材套路-言情 | 言情题材写作 | `references/genre-conventions/yanqing.md` |
| 题材套路-武侠 | 武侠/仙侠写作 | `references/genre-conventions/wuxia.md` |
| 题材套路-科幻 | 科幻题材写作 | `references/genre-conventions/kehuan.md` |
| 题材套路-历史 | 历史/架空写作 | `references/genre-conventions/lishi.md` |
