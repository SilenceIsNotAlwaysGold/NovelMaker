#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
纯文本导出脚本

从 Markdown 章节文件中提取正文，去掉所有元数据，
按 小说/卷/章 的目录结构导出为纯 .txt 文件。

输出结构：
  output/
  └── {小说名}/
      ├── 卷一_初入江湖/
      │   ├── 第01章_标题.txt
      │   ├── 第02章_标题.txt
      │   └── ...
      ├── 卷二_风云变幻/
      │   └── ...
      └── 全书合集.txt          ← 所有卷章按顺序合并
"""

import re
import sys
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def extract_title(content: str, filename: str) -> str:
    """从文件内容或文件名中提取章节标题"""
    # 优先从 # 第X章：标题 提取
    match = re.search(r'#\s*第\d+章[：:]\s*(.+)', content)
    if match:
        return match.group(1).strip()
    # 从文件名提取
    match = re.match(r'第\d+章[_\s：:]*(.+)\.md', filename)
    if match:
        return match.group(1).strip()
    return ""


def extract_body(content: str) -> str:
    """提取 ## 正文 到下一个 ## 之间的纯正文"""
    # 方式1：有明确的 ## 正文 标记
    match = re.search(r'## 正文\s*\n(.*?)(\n## |\n---\s*\n## |\Z)', content, re.DOTALL)
    if match:
        body = match.group(1).strip()
        if body and body != '{章节正文内容 3000-5000 字}':
            return body

    # 方式2：没有 ## 正文 标记，跳过开头元数据
    # 找第一个 --- 分隔线之后的内容
    parts = re.split(r'\n---\s*\n', content)
    if len(parts) >= 2:
        # 取第二部分（跳过写前元数据），但要排除写后记录
        body_part = parts[1]
        # 如果后面还有 ---，只取到下一个 ---
        if '---' in body_part:
            body_part = body_part.split('---')[0]
        body = body_part.strip()
        # 去掉 ## 正文 标题本身
        body = re.sub(r'^## 正文\s*\n', '', body)
        if body:
            return body

    # 方式3：兜底，去掉所有 Markdown 标记行，返回剩余内容
    lines = []
    skip = True
    for line in content.split('\n'):
        if line.startswith('# 第') and '章' in line:
            skip = False
            continue
        if line.startswith('## 写前') or line.startswith('## 写后'):
            skip = True
            continue
        if line.startswith('## 正文'):
            skip = False
            continue
        if not skip and not line.startswith('---'):
            lines.append(line)

    return '\n'.join(lines).strip()


def clean_markdown(text: str) -> str:
    """清除正文中残留的 Markdown 格式标记"""
    # 去掉粗体/斜体标记
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'~~(.+?)~~', r'\1', text)
    # 去掉行内代码
    text = re.sub(r'`(.+?)`', r'\1', text)
    # 去掉链接，保留文字
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)
    # 去掉HTML注释
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
    return text


def get_chapter_number(filename: str) -> int:
    """从文件名提取章节号"""
    match = re.match(r'第(\d+)章', filename)
    return int(match.group(1)) if match else 999


def export_novel(novel_dir: str, output_base: str = "output"):
    """导出整本小说"""
    novel_path = Path(novel_dir)
    if not novel_path.exists():
        print(f'错误: 小说目录不存在 - {novel_dir}')
        return

    novel_name = novel_path.name
    output_dir = Path(output_base) / novel_name
    output_dir.mkdir(parents=True, exist_ok=True)

    # 找到所有卷目录
    vol_dirs = sorted([
        d for d in novel_path.iterdir()
        if d.is_dir() and (d.name.startswith('卷') or re.match(r'第.+卷', d.name))
    ])

    if not vol_dirs:
        print(f'错误: 未找到卷目录 - {novel_dir}')
        return

    all_chapters_text = []  # 用于合并全书
    total_chapters = 0
    total_chars = 0

    print(f'\n{"=" * 50}')
    print(f'导出小说: {novel_name}')
    print(f'{"=" * 50}')

    for vol_dir in vol_dirs:
        vol_name = vol_dir.name
        vol_output = output_dir / vol_name
        vol_output.mkdir(parents=True, exist_ok=True)

        # 找到卷内所有章节文件
        chapter_files = sorted(
            [f for f in vol_dir.iterdir()
             if f.is_file() and f.suffix == '.md' and re.match(r'第\d+章', f.name)],
            key=lambda f: get_chapter_number(f.name)
        )

        if not chapter_files:
            print(f'\n  📁 {vol_name}: 无章节文件，跳过')
            continue

        vol_chapter_count = 0
        vol_char_count = 0

        print(f'\n  📁 {vol_name}:')

        for chapter_file in chapter_files:
            content = chapter_file.read_text(encoding='utf-8')
            title = extract_title(content, chapter_file.name)
            body = extract_body(content)
            body = clean_markdown(body)

            if not body:
                print(f'    ⚠️  {chapter_file.name}: 正文为空，跳过')
                continue

            # 计算字数
            cn_chars = len(re.findall(r'[\u4e00-\u9fff]', body))

            # 构建章节标题
            chapter_num_match = re.match(r'第(\d+)章', chapter_file.name)
            chapter_num = chapter_num_match.group(0) if chapter_num_match else chapter_file.stem
            if title:
                full_title = f'{chapter_num}：{title}'
                txt_filename = f'{chapter_num}_{title}.txt'
            else:
                full_title = chapter_num
                txt_filename = f'{chapter_num}.txt'

            # 清理文件名中的非法字符
            txt_filename = re.sub(r'[<>:"/\\|?*]', '_', txt_filename)

            # 写入单章文件
            txt_path = vol_output / txt_filename
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(f'{full_title}\n\n')
                f.write(body)
                f.write('\n')

            # 追加到全书合集
            all_chapters_text.append(f'{full_title}\n\n{body}\n')

            vol_chapter_count += 1
            vol_char_count += cn_chars
            total_chapters += 1
            total_chars += cn_chars

            print(f'    ✅ {txt_filename} ({cn_chars}字)')

        print(f'    小计: {vol_chapter_count}章 / {vol_char_count:,}字')

    # 导出全书合集
    if all_chapters_text:
        merged_path = output_dir / '全书合集.txt'
        with open(merged_path, 'w', encoding='utf-8') as f:
            f.write(f'{novel_name}\n\n')
            f.write('=' * 40 + '\n\n')
            for i, chapter_text in enumerate(all_chapters_text):
                f.write(chapter_text)
                if i < len(all_chapters_text) - 1:
                    f.write('\n' + '-' * 20 + '\n\n')

        print(f'\n  📖 全书合集.txt 已生成')

    print(f'\n{"=" * 50}')
    print(f'导出完成!')
    print(f'  目录: {output_dir}')
    print(f'  总计: {total_chapters}章 / {total_chars:,}字')
    print(f'{"=" * 50}')


def main():
    if len(sys.argv) < 2:
        print('用法:')
        print('  python export_text.py <小说目录路径> [输出目录]')
        print('')
        print('示例:')
        print('  python export_text.py novels/我的小说')
        print('  python export_text.py novels/我的小说 output')
        print('')
        print('输出结构:')
        print('  output/{小说名}/')
        print('  ├── 卷一_{卷名}/')
        print('  │   ├── 第01章_{标题}.txt')
        print('  │   ├── 第02章_{标题}.txt')
        print('  │   └── ...')
        print('  ├── 卷二_{卷名}/')
        print('  │   └── ...')
        print('  └── 全书合集.txt')
        return

    novel_dir = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'output'
    export_novel(novel_dir, output_dir)


if __name__ == '__main__':
    main()
