#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一致性校验脚本

读取术语表，扫描章节正文，检测：
1. 人名/地名/功法等是否使用了禁止的误写形式
2. 同一角色是否出现了不在术语表中的称呼
3. 章节中出现的专有名词是否在术语表中有记录
"""

import re
import sys
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


HEADER_KEYWORDS = {'全名', '正确名称', '术语', '名称', '地名', 'ID', '序号'}


def parse_terminology(term_file: str) -> dict:
    """解析术语表，提取正确名称和禁止误写

    支持的表格格式：
    | 全名 | 常用称呼 | 绰号 | 常见误写（禁止）| 备注 |
    | 林远 | 小远     | 灰衣 | 林渊、林原       | 主角 |
    """
    content = Path(term_file).read_text(encoding='utf-8')
    tables = {}

    current_section = None
    forbidden_col_idx = None  # 动态检测"误写/禁止"列的位置

    for line in content.split('\n'):
        if line.startswith('## '):
            current_section = line.strip('# ').strip()
            tables[current_section] = []
            forbidden_col_idx = None
            continue

        if not current_section or '|' not in line:
            continue

        # 跳过分隔线
        if re.match(r'\s*\|[\s\-:]+\|', line):
            continue

        cells = [c.strip() for c in line.split('|')[1:-1]]
        if len(cells) < 2:
            continue

        # 检测表头行，找到"误写/禁止"列的位置
        if cells[0] in HEADER_KEYWORDS or any(k in cells[0] for k in HEADER_KEYWORDS):
            for i, cell in enumerate(cells):
                if '误写' in cell or '禁止' in cell:
                    forbidden_col_idx = i
                    break
            continue

        # 数据行
        if not cells[0]:
            continue

        # 提取禁止误写
        forbidden = []
        if forbidden_col_idx is not None and forbidden_col_idx < len(cells):
            forbidden = [f.strip() for f in cells[forbidden_col_idx].split('、') if f.strip() and f.strip() != '-']

        # 提取别名（第二列，如果不是禁止列）
        aliases = []
        if len(cells) > 1 and 1 != forbidden_col_idx:
            aliases = [a.strip() for a in cells[1].split('、') if a.strip() and a.strip() != '-']

        tables[current_section].append({
            'name': cells[0],
            'aliases': aliases,
            'forbidden': forbidden,
        })

    return tables


def extract_proper_nouns(text: str) -> set:
    """从正文中提取疑似专有名词（2-4字的中文人名/地名模式）"""
    # 提取正文部分（跳过元数据）
    body_match = re.search(r'## 正文\s*\n(.*?)(\n## |\Z)', text, re.DOTALL)
    body = body_match.group(1) if body_match else text

    nouns = set()
    # 人名模式：姓+名（2-3字），前后有对话标记或动作词
    # 简单策略：提取被引号/对话包围的名字，以及"X说/道/笑/叹"中的X
    name_patterns = [
        r'([\u4e00-\u9fff]{2,4})(?:说道|说|道|笑道|喝道|叹道|怒道|冷道|淡道|问道|答道)',
        r'"[^"]*"([\u4e00-\u9fff]{2,4})(?:说|道)',
        r'([\u4e00-\u9fff]{2,4})(?:点了点头|摇了摇头|皱眉|微笑|沉声|冷笑)',
    ]
    for pattern in name_patterns:
        for m in re.finditer(pattern, body):
            name = m.group(1)
            # 排除常见非人名词
            if name not in {'这样', '那样', '什么', '怎么', '为什么', '不过', '但是',
                           '然后', '于是', '这时', '那时', '不禁', '只是', '只见',
                           '忽然', '突然', '原来', '果然', '竟然', '居然'}:
                nouns.add(name)

    return nouns


def check_undefined_terms(chapter_file: str, terminology: dict) -> list:
    """检查正文中出现但术语表中未登记的疑似专有名词"""
    content = Path(chapter_file).read_text(encoding='utf-8')
    issues = []

    # 收集术语表中所有已知名称和别名
    known_names = set()
    for section, terms in terminology.items():
        for term in terms:
            known_names.add(term['name'])
            for alias in term.get('aliases', []):
                known_names.add(alias)

    # 提取正文中的疑似专有名词
    found_nouns = extract_proper_nouns(content)

    # 找出未登记的
    undefined = found_nouns - known_names
    for noun in sorted(undefined):
        issues.append({
            'type': 'undefined_term',
            'severity': 'WARN',
            'found': noun,
            'section': '未知',
            'message': f'疑似未登记术语: "{noun}"（出现在正文中但不在术语表里）'
        })

    return issues


def check_chapter(chapter_file: str, terminology: dict, check_undefined: bool = False) -> list:
    """检查单个章节的术语一致性"""
    content = Path(chapter_file).read_text(encoding='utf-8')
    issues = []

    for section, terms in terminology.items():
        for term in terms:
            # 检查禁止的误写
            for forbidden in term.get('forbidden', []):
                if not forbidden:
                    continue
                matches = [(m.start(), m.group()) for m in re.finditer(re.escape(forbidden), content)]
                for pos, match_text in matches:
                    # 计算行号
                    line_no = content[:pos].count('\n') + 1
                    issues.append({
                        'type': 'forbidden_term',
                        'severity': 'ERROR',
                        'line': line_no,
                        'found': match_text,
                        'correct': term['name'],
                        'section': section,
                        'message': f'第{line_no}行: 发现禁止用词 "{match_text}"，应为 "{term["name"]}"'
                    })

    # 未定义术语检测
    if check_undefined:
        undefined_issues = check_undefined_terms(chapter_file, terminology)
        issues.extend(undefined_issues)

    return issues


def check_directory(directory: str, term_file: str, check_undefined: bool = False) -> dict:
    """检查目录下所有章节"""
    terminology = parse_terminology(term_file)
    results = {}

    dir_path = Path(directory)
    for chapter_file in sorted(dir_path.rglob('第*.md')):
        issues = check_chapter(str(chapter_file), terminology, check_undefined=check_undefined)
        if issues:
            results[str(chapter_file)] = issues

    return results


def print_results(results: dict):
    """打印检查结果"""
    if not results:
        print('\n✅ 所有章节术语一致性检查通过！')
        return

    total_issues = sum(len(v) for v in results.values())
    print(f'\n{"=" * 60}')
    print(f'术语一致性检查报告 — 发现 {total_issues} 个问题')
    print(f'{"=" * 60}')

    for filepath, issues in results.items():
        print(f'\n📄 {Path(filepath).name} ({len(issues)} 个问题)')
        for issue in issues:
            icon = '❌' if issue['severity'] == 'ERROR' else '⚠️'
            print(f'  {icon} {issue["message"]}')

    print(f'\n{"-" * 60}')
    print(f'总计: {len(results)} 个文件有问题，共 {total_issues} 处错误')
    print(f'请参照术语表修正以上问题')


def main():
    if len(sys.argv) < 3:
        print('用法:')
        print('  python consistency_check.py <术语表路径> <章节文件或目录>')
        print('  python consistency_check.py <术语表路径> <章节文件或目录> --check-undefined')
        print('')
        print('选项:')
        print('  --check-undefined  检测正文中出现但术语表未登记的疑似专有名词')
        print('')
        print('示例:')
        print('  python consistency_check.py novels/小说/术语表.md novels/小说/卷一/')
        print('  python consistency_check.py novels/小说/术语表.md novels/小说/卷一/ --check-undefined')
        return

    term_file = sys.argv[1]
    target = sys.argv[2]
    check_undefined = '--check-undefined' in sys.argv

    if not Path(term_file).exists():
        print(f'错误: 术语表不存在 - {term_file}')
        return

    target_path = Path(target)
    if target_path.is_dir():
        results = check_directory(target, term_file, check_undefined=check_undefined)
    elif target_path.is_file():
        terminology = parse_terminology(term_file)
        issues = check_chapter(target, terminology, check_undefined=check_undefined)
        results = {target: issues} if issues else {}
    else:
        print(f'错误: 路径不存在 - {target}')
        return

    print_results(results)


if __name__ == '__main__':
    main()
