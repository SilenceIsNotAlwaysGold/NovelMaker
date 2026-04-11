#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分层记忆拼装器 - 小说写作智能体的核心引擎

为每一章的写作组装上下文，实现分层记忆机制：
- Layer 0: 基因层（永久加载，<2000字）
- Layer 1: 卷级记忆（当前卷，<3000字）
- Layer 2: 弧线记忆（当前弧线，<2000字）
- Layer 3: 章级记忆（最近3章摘要+上章尾段，<2000字）
- Layer 4: 按需检索（伏笔/角色详情）
"""

import os
import re
import sys
import json
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def count_chars(text: str) -> int:
    """统计中文字符数"""
    return len(re.findall(r'[\u4e00-\u9fff]', text))


def read_file_safe(filepath: str) -> str:
    """安全读取文件"""
    path = Path(filepath)
    if not path.exists():
        return ""
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def find_novel_dir(novel_name: str, base_dir: str = "novels") -> Path:
    """查找小说目录"""
    novel_dir = Path(base_dir) / novel_name
    if not novel_dir.exists():
        print(f"错误: 小说目录不存在 - {novel_dir}")
        sys.exit(1)
    return novel_dir


def find_current_volume(novel_dir: Path) -> Path:
    """查找当前卷目录（最后一个有未完成章节的卷）"""
    vol_dirs = sorted([
        d for d in novel_dir.iterdir()
        if d.is_dir() and d.name.startswith("卷")
    ])
    if not vol_dirs:
        print("错误: 没有找到任何卷目录")
        sys.exit(1)
    # 返回最后一个卷目录
    return vol_dirs[-1]


def find_current_arc(vol_dir: Path, current_chapter: int = None) -> str:
    """查找当前弧线文件

    如果提供了 current_chapter，尝试从弧线文件中解析章节范围来匹配。
    否则返回最后一个未标记完成的弧线，兜底返回最后一个弧线。
    """
    arc_files = sorted([
        f for f in vol_dir.iterdir()
        if f.is_file() and f.name.startswith("弧线") and f.suffix == '.md'
    ])
    if not arc_files:
        return ""

    # 如果有章节号，尝试从弧线文件内容中匹配
    if current_chapter:
        for arc_file in arc_files:
            content = read_file_safe(str(arc_file))
            # 查找弧线中的章节范围（如 "第5章-第8章" 或 "第5-8章"）
            range_match = re.search(r'第(\d+)[章\s]*[-~到至]\s*第?(\d+)章', content)
            if range_match:
                start = int(range_match.group(1))
                end = int(range_match.group(2))
                if start <= current_chapter <= end:
                    return arc_file.name
            # 也检查逐章规划表中是否包含该章节号
            if f'第{current_chapter}章' in content or f'第{current_chapter:02d}章' in content:
                return arc_file.name

    # 兜底：尝试找未标记完成的弧线
    for arc_file in reversed(arc_files):
        content = read_file_safe(str(arc_file))
        if '已完成' not in content and '✅' not in content:
            return arc_file.name

    # 最终兜底：最后一个弧线
    return arc_files[-1].name


def get_chapter_files(vol_dir: Path) -> list:
    """获取当前卷的所有章节文件，按章节号排序"""
    chapter_files = []
    for f in vol_dir.iterdir():
        if f.is_file() and f.suffix == '.md':
            match = re.match(r'第(\d+)章', f.name)
            if match:
                chapter_files.append((int(match.group(1)), f))
    return sorted(chapter_files, key=lambda x: x[0])


def get_recent_summaries(vol_dir: Path, n: int = 3) -> str:
    """获取最近n章的摘要"""
    summary_file = vol_dir / "章节摘要.md"
    if not summary_file.exists():
        return ""

    content = read_file_safe(str(summary_file))
    # 按 ### 分割章节摘要
    sections = re.split(r'\n### ', content)
    recent = sections[-n:] if len(sections) > n else sections[1:]  # 跳过文件头

    if not recent:
        return ""

    result = "## 最近章节摘要\n\n"
    for section in recent:
        if section.strip():
            result += f"### {section.strip()}\n\n"
    return result


def get_chapter_tail(vol_dir: Path, chars: int = 500) -> str:
    """获取上一章最后N个字符"""
    chapters = get_chapter_files(vol_dir)
    if not chapters:
        return ""

    last_chapter_path = chapters[-1][1]
    content = read_file_safe(str(last_chapter_path))

    # 提取正文部分（## 正文 之后的内容）
    match = re.search(r'## 正文\s*\n(.*?)(\n## |\Z)', content, re.DOTALL)
    if match:
        body = match.group(1).strip()
    else:
        body = content

    if len(body) > chars:
        body = body[-chars:]

    return f"## 上一章结尾（衔接用）\n\n...{body}"


def get_due_foreshadows(novel_dir: Path, current_chapter: int, current_vol: str) -> str:
    """获取本章需要回收的伏笔"""
    foreshadow_file = novel_dir / "伏笔追踪表.md"
    if not foreshadow_file.exists():
        return ""

    content = read_file_safe(str(foreshadow_file))
    lines = content.split('\n')

    due_items = []
    for line in lines:
        # 查找状态为 🔴 且计划回收位置包含当前章节的行
        if '🔴' in line or '🟡' in line:
            # 简单匹配：如果行中包含当前卷名和章节号附近
            if f'第{current_chapter}章' in line or f'第{current_chapter+1}章' in line:
                due_items.append(line.strip())

    if not due_items:
        return ""

    result = "## 本章需回收的伏笔\n\n"
    for item in due_items:
        result += f"- {item}\n"
    return result


def get_chapter_characters(novel_dir: Path, vol_dir: Path, current_chapter: int) -> str:
    """获取本章出场角色的最新状态"""
    # 读取卷概要中的角色状态（已包含在 Layer 1 中）
    # 这里额外检查人物总档案中的速查表
    char_file = novel_dir / "人物总档案.md"
    if not char_file.exists():
        return ""

    content = read_file_safe(str(char_file))

    # 提取角色速查表部分
    match = re.search(r'## 角色速查表.*?\n\n(.*?)\n\n---', content, re.DOTALL)
    if match:
        return f"## 角色速查表\n\n{match.group(1)}"
    return ""


def assemble_context(novel_dir: Path, current_chapter: int = None) -> str:
    """为当前章节组装完整的写作上下文"""
    context_parts = []
    char_budget = {}

    # === Layer 0: 基因层（永久加载）===
    gene_file = novel_dir / "全书基因.md"
    gene_content = read_file_safe(str(gene_file))
    if gene_content:
        context_parts.append(("Layer 0: 全书基因", gene_content))
        char_budget['L0'] = count_chars(gene_content)

    # === Layer 1: 卷级记忆 ===
    vol_dir = find_current_volume(novel_dir)
    vol_summary = read_file_safe(str(vol_dir / "卷概要.md"))
    if vol_summary:
        context_parts.append(("Layer 1: 卷级记忆", vol_summary))
        char_budget['L1'] = count_chars(vol_summary)

    # === Layer 2: 弧线记忆 ===
    arc_name = find_current_arc(vol_dir, current_chapter)
    if arc_name:
        arc_content = read_file_safe(str(vol_dir / arc_name))
        if arc_content:
            context_parts.append(("Layer 2: 弧线记忆", arc_content))
            char_budget['L2'] = count_chars(arc_content)

    # === Layer 3: 章级记忆 ===
    # 最近3章摘要
    summaries = get_recent_summaries(vol_dir, n=3)
    if summaries:
        context_parts.append(("Layer 3a: 最近章节摘要", summaries))

    # 上一章结尾
    tail = get_chapter_tail(vol_dir, chars=500)
    if tail:
        context_parts.append(("Layer 3b: 上章结尾", tail))

    l3_chars = count_chars(summaries) + count_chars(tail)
    char_budget['L3'] = l3_chars

    # === Layer 4: 按需检索 ===
    l4_chars = 0

    # 4a: 历史卷摘要（非第一卷时加载）
    archive_dir = novel_dir / "archive"
    if archive_dir.exists():
        archive_files = sorted(archive_dir.glob("*终稿摘要*.md"))
        for af in archive_files:
            # 不加载当前卷的摘要
            if vol_dir.name.split('_')[0] not in af.name:
                archive_content = read_file_safe(str(af))
                if archive_content:
                    context_parts.append((f"Layer 4: 历史卷摘要 - {af.stem}", archive_content))
                    l4_chars += count_chars(archive_content)

    # 4b: 待回收伏笔
    if current_chapter:
        vol_name = vol_dir.name
        foreshadows = get_due_foreshadows(novel_dir, current_chapter, vol_name)
        if foreshadows:
            context_parts.append(("Layer 4: 待回收伏笔", foreshadows))
            l4_chars += count_chars(foreshadows)

    # 4c: 角色速查
    characters = get_chapter_characters(novel_dir, vol_dir, current_chapter or 0)
    if characters:
        context_parts.append(("Layer 4: 角色速查", characters))
        l4_chars += count_chars(characters)

    if l4_chars > 0:
        char_budget['L4'] = l4_chars

    # === 组装输出 ===
    output = []
    output.append("=" * 60)
    output.append("📖 写作上下文 - 分层记忆拼装结果")
    output.append("=" * 60)

    total_chars = 0
    for label, content in context_parts:
        chars = count_chars(content)
        total_chars += chars
        output.append(f"\n{'─' * 40}")
        output.append(f"## {label}（{chars}字）")
        output.append(f"{'─' * 40}\n")
        output.append(content)

    output.append(f"\n{'=' * 60}")
    output.append(f"📊 上下文预算统计")
    output.append(f"{'=' * 60}")
    for layer, chars in char_budget.items():
        output.append(f"  {layer}: {chars}字")
    output.append(f"  总计: {total_chars}字")
    output.append(f"{'=' * 60}")

    return '\n'.join(output)


def main():
    if len(sys.argv) < 2:
        print("用法:")
        print("  python context_assembler.py <小说目录路径> [当前章节号]")
        print("")
        print("示例:")
        print("  python context_assembler.py novels/我的小说")
        print("  python context_assembler.py novels/我的小说 15")
        return

    novel_path = Path(sys.argv[1])
    current_chapter = int(sys.argv[2]) if len(sys.argv) > 2 else None

    if not novel_path.exists():
        print(f"错误: 目录不存在 - {novel_path}")
        return

    result = assemble_context(novel_path, current_chapter)
    print(result)


if __name__ == '__main__':
    main()
