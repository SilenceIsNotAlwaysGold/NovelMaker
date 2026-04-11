#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
章节字数检查脚本
检查指定章节文件的中文字数，低于3000字时提示需要扩充。
支持单文件检查、目录批量检查、自定义最小字数。
"""

import os
import re
import sys
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def count_chinese_words(text: str) -> int:
    """统计中文字数（排除Markdown标记和元数据）"""
    # 移除Markdown标记
    text = re.sub(r'#{1,6}\s*', '', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'~~(.*?)~~', r'\1', text)
    text = re.sub(r'`(.*?)`', r'\1', text)
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    # 移除表格分隔线
    text = re.sub(r'\|[-:]+\|', '', text)

    return len(re.findall(r'[\u4e00-\u9fff]', text))


def extract_body(filepath: Path) -> str:
    """提取章节正文部分（## 正文 到下一个 ## 之间）"""
    content = filepath.read_text(encoding='utf-8')

    match = re.search(r'## 正文\s*\n(.*?)(\n## |\Z)', content, re.DOTALL)
    if match:
        return match.group(1).strip()

    # 如果没有 ## 正文 标记，尝试跳过开头元数据
    lines = content.split('\n')
    body_start = 0
    for i, line in enumerate(lines):
        if line.startswith('#') and '章' in line:
            body_start = i + 1
            break

    return '\n'.join(lines[body_start:])


def check_chapter(filepath: str, min_words: int = 3000) -> dict:
    """检查单个章节"""
    path = Path(filepath)
    if not path.exists():
        return {'file': str(path), 'exists': False, 'word_count': 0,
                'status': 'error', 'message': f'文件不存在: {filepath}'}

    body = extract_body(path)
    wc = count_chinese_words(body)
    status = 'pass' if wc >= min_words else 'fail'
    mark = '✓ 达标' if status == 'pass' else f'✗ 不足，需至少 {min_words} 字'

    return {'file': str(path), 'exists': True, 'word_count': wc,
            'status': status, 'message': f'字数: {wc} ({mark})'}


def check_all(directory: str, min_words: int = 3000) -> list:
    """检查目录下所有章节文件"""
    dir_path = Path(directory)
    if not dir_path.exists():
        print(f'错误: 目录不存在 - {directory}')
        return []

    results = []
    # 递归查找所有章节文件
    for chapter_file in sorted(dir_path.rglob('第*.md')):
        results.append(check_chapter(str(chapter_file), min_words))
    return results


def print_results(results: list, min_words: int = 3000):
    """打印结果"""
    if not results:
        print('没有找到章节文件')
        return

    total_words = 0
    passed = 0
    failed = 0

    print(f'\n{"=" * 60}')
    print('章节字数检查报告')
    print(f'{"=" * 60}')

    for r in results:
        if not r['exists']:
            print(f'\n❌ {r["file"]}')
            print(f'   {r["message"]}')
            continue

        total_words += r['word_count']
        if r['status'] == 'pass':
            passed += 1
            icon = '✅'
        else:
            failed += 1
            icon = '⚠️ '
        print(f'\n{icon} {Path(r["file"]).name}')
        print(f'   {r["message"]}')

    print(f'\n{"-" * 60}')
    print(f'总计: {len(results)} 章 | {passed} 达标 | {failed} 不足 | 总字数: {total_words:,}')
    print(f'{"-" * 60}')

    if failed > 0:
        print(f'\n⚠️  {failed} 章不足 {min_words} 字，参考 references/content-expansion.md 扩充')


def main():
    min_words = 3000
    if len(sys.argv) < 2:
        print('用法:')
        print('  python check_wordcount.py <章节文件>  [最小字数]')
        print('  python check_wordcount.py --all <目录> [最小字数]')
        return

    if sys.argv[1] == '--all':
        directory = sys.argv[2] if len(sys.argv) > 2 else '.'
        min_words = int(sys.argv[3]) if len(sys.argv) > 3 else 3000
        print_results(check_all(directory, min_words), min_words)
    else:
        min_words = int(sys.argv[2]) if len(sys.argv) > 2 else 3000
        print_results([check_chapter(sys.argv[1], min_words)], min_words)


if __name__ == '__main__':
    main()
