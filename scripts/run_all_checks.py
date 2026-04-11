#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一键质量检查 — 统一调度器

运行所有质量检查脚本，生成统一报告：
1. 字数检查 (check_wordcount.py)
2. 术语一致性 (consistency_check.py)
3. AI痕迹检测 (anti_ai_lint.py)
4. 伏笔审计 (foreshadow_audit.py)

用法:
  python run_all_checks.py <小说目录>
  python run_all_checks.py <小说目录> --volume 卷一
  python run_all_checks.py <小说目录> --quick          # 只跑字数和AI味
"""

import sys
import os
from pathlib import Path
from datetime import datetime

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 将 scripts 目录加入 path
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from check_wordcount import count_chinese_words, extract_body
from consistency_check import parse_terminology, check_chapter
from anti_ai_lint import analyze_chapter
from foreshadow_audit import parse_foreshadow_table, audit as audit_foreshadows


def find_novel_files(novel_dir: Path, volume: str = None):
    """查找小说的章节文件"""
    if volume:
        # 查找匹配卷名的目录
        for d in novel_dir.iterdir():
            if d.is_dir() and volume in d.name:
                return sorted(d.rglob('第*.md'))
        print(f'⚠️ 未找到卷目录: {volume}')
        return []
    else:
        return sorted(novel_dir.rglob('第*.md'))


def run_wordcount_check(chapter_files: list, min_words: int = 3000) -> dict:
    """运行字数检查"""
    results = {
        'total_chapters': 0,
        'passed': 0,
        'failed': 0,
        'total_words': 0,
        'details': [],
    }

    for f in chapter_files:
        body = extract_body(f)
        count = count_chinese_words(body)
        passed = count >= min_words
        results['total_chapters'] += 1
        results['total_words'] += count
        if passed:
            results['passed'] += 1
        else:
            results['failed'] += 1
            results['details'].append({
                'file': f.name,
                'count': count,
                'deficit': min_words - count,
            })

    return results


def run_consistency_check(chapter_files: list, term_file: Path) -> dict:
    """运行一致性检查"""
    results = {
        'total_issues': 0,
        'files_with_issues': 0,
        'details': [],
    }

    if not term_file.exists():
        results['skipped'] = True
        results['reason'] = f'术语表不存在: {term_file}'
        return results

    terminology = parse_terminology(str(term_file))

    for f in chapter_files:
        issues = check_chapter(str(f), terminology)
        if issues:
            results['files_with_issues'] += 1
            results['total_issues'] += len(issues)
            results['details'].append({
                'file': f.name,
                'issues': issues,
            })

    return results


def run_ai_lint_check(chapter_files: list) -> dict:
    """运行AI痕迹检测"""
    results = {
        'total_chapters': 0,
        'excellent': 0,     # <=5
        'ok': 0,            # <=15
        'poor': 0,          # <=30
        'severe': 0,        # >30
        'avg_score': 0,
        'details': [],
    }

    total_score = 0
    for f in chapter_files:
        result = analyze_chapter(str(f))
        if 'error' in result:
            continue

        results['total_chapters'] += 1
        score = result['ai_score']
        total_score += score

        if score <= 5:
            results['excellent'] += 1
        elif score <= 15:
            results['ok'] += 1
        elif score <= 30:
            results['poor'] += 1
        else:
            results['severe'] += 1

        if score > 15:
            results['details'].append({
                'file': Path(result['file']).name,
                'score': score,
                'blacklist_count': sum(i['count'] for i in result['blacklist']),
                'feeling_count': result['feeling_total'],
            })

    if results['total_chapters'] > 0:
        results['avg_score'] = round(total_score / results['total_chapters'], 1)

    return results


def run_foreshadow_audit(novel_dir: Path) -> dict:
    """运行伏笔审计"""
    foreshadow_file = novel_dir / '伏笔追踪表.md'
    if not foreshadow_file.exists():
        return {'skipped': True, 'reason': '伏笔追踪表不存在'}

    foreshadows = parse_foreshadow_table(str(foreshadow_file))
    if not foreshadows:
        return {'skipped': True, 'reason': '伏笔追踪表为空或格式不正确'}

    analysis = audit_foreshadows(foreshadows)
    # 规范化字段名供报告使用
    stats = analysis.get('stats', {})
    return {
        'skipped': False,
        'total': analysis.get('total', 0),
        'planted': stats.get('🔴', 0),
        'partial': stats.get('🟡', 0),
        'recovered': stats.get('🟢', 0),
        'abandoned': stats.get('⚫', 0),
        'overdue': [f'{f["id"]}: {f["description"]}（计划{f["planned_harvest"]}）'
                    for f in analysis.get('overdue', [])],
    }


def print_unified_report(novel_dir: Path, wc: dict, cs: dict, ai: dict, fs: dict):
    """打印统一报告"""
    print(f'\n{"=" * 70}')
    print(f'  质量检查统一报告')
    print(f'  小说目录: {novel_dir}')
    print(f'  检查时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'{"=" * 70}')

    # 1. 字数检查
    print(f'\n┌─ 1. 字数检查 {"─" * 50}')
    print(f'│  总章节: {wc["total_chapters"]}  |  通过: {wc["passed"]}  |  未达标: {wc["failed"]}')
    print(f'│  总字数: {wc["total_words"]:,} 字')
    if wc['details']:
        print(f'│  未达标章节:')
        for d in wc['details']:
            print(f'│    ❌ {d["file"]}: {d["count"]}字（差{d["deficit"]}字）')
    else:
        print(f'│  ✅ 全部达标')
    status_wc = '✅' if wc['failed'] == 0 else '❌'
    print(f'└─ 结果: {status_wc}')

    # 2. 术语一致性
    print(f'\n┌─ 2. 术语一致性 {"─" * 48}')
    if cs.get('skipped'):
        print(f'│  ⏭️  跳过: {cs["reason"]}')
        status_cs = '⏭️'
    elif cs['total_issues'] == 0:
        print(f'│  ✅ 未发现术语不一致')
        status_cs = '✅'
    else:
        print(f'│  发现 {cs["total_issues"]} 个问题（{cs["files_with_issues"]} 个文件）')
        for d in cs['details'][:5]:  # 最多显示5个文件
            print(f'│  📄 {d["file"]}:')
            for issue in d['issues'][:3]:  # 每文件最多3个问题
                print(f'│    ❌ {issue["message"]}')
            if len(d['issues']) > 3:
                print(f'│    ... 还有 {len(d["issues"]) - 3} 个问题')
        status_cs = '❌'
    print(f'└─ 结果: {status_cs}')

    # 3. AI痕迹
    print(f'\n┌─ 3. AI痕迹检测 {"─" * 48}')
    if ai['total_chapters'] > 0:
        print(f'│  平均AI味评分: {ai["avg_score"]}')
        print(f'│  🟢优秀: {ai["excellent"]}  🟡一般: {ai["ok"]}  🟠较差: {ai["poor"]}  🔴严重: {ai["severe"]}')
        if ai['details']:
            print(f'│  需关注章节:')
            for d in ai['details'][:5]:
                print(f'│    🟠 {d["file"]}: 评分{d["score"]}（黑名单{d["blacklist_count"]}次，感受词{d["feeling_count"]}次）')
        else:
            print(f'│  ✅ 全部章节AI味评分良好')
        status_ai = '✅' if ai['severe'] == 0 and ai['poor'] == 0 else ('⚠️' if ai['severe'] == 0 else '❌')
    else:
        print(f'│  ⏭️  无章节可检查')
        status_ai = '⏭️'
    print(f'└─ 结果: {status_ai}')

    # 4. 伏笔审计
    print(f'\n┌─ 4. 伏笔审计 {"─" * 50}')
    if fs.get('skipped'):
        print(f'│  ⏭️  跳过: {fs["reason"]}')
        status_fs = '⏭️'
    else:
        total = fs.get('total', 0)
        planted = fs.get('planted', 0)
        partial = fs.get('partial', 0)
        recovered = fs.get('recovered', 0)
        abandoned = fs.get('abandoned', 0)
        overdue = fs.get('overdue', [])

        print(f'│  总伏笔: {total}')
        print(f'│  🔴已埋设: {planted}  🟡部分回收: {partial}  🟢已回收: {recovered}  ⚫已废弃: {abandoned}')

        if total > 0:
            rate = round((recovered + abandoned) / total * 100, 1)
            print(f'│  回收率: {rate}%')

        if overdue:
            print(f'│  ⚠️ 逾期未回收: {len(overdue)} 个')
            for item in overdue[:3]:
                print(f'│    🔴 {item}')
            status_fs = '⚠️'
        else:
            print(f'│  ✅ 无逾期伏笔')
            status_fs = '✅'
    print(f'└─ 结果: {status_fs}')

    # 汇总
    print(f'\n{"=" * 70}')
    print(f'  汇总: 字数{status_wc}  术语{status_cs}  AI味{status_ai}  伏笔{status_fs}')

    all_pass = all(s in ('✅', '⏭️') for s in [status_wc, status_cs, status_ai, status_fs])
    if all_pass:
        print(f'  🎉 全部检查通过！')
    else:
        print(f'  ⚠️ 部分检查未通过，请查看上方详情')
    print(f'{"=" * 70}\n')


def main():
    if len(sys.argv) < 2:
        print('用法:')
        print('  python run_all_checks.py <小说目录>')
        print('  python run_all_checks.py <小说目录> --volume 卷一')
        print('  python run_all_checks.py <小说目录> --quick')
        print('')
        print('选项:')
        print('  --volume <卷名>  只检查指定卷')
        print('  --quick          快速模式（只跑字数和AI味）')
        return

    novel_dir = Path(sys.argv[1])
    if not novel_dir.exists():
        print(f'错误: 目录不存在 - {novel_dir}')
        return

    # 解析参数
    volume = None
    quick = False
    args = sys.argv[2:]
    i = 0
    while i < len(args):
        if args[i] == '--volume' and i + 1 < len(args):
            volume = args[i + 1]
            i += 2
        elif args[i] == '--quick':
            quick = True
            i += 1
        else:
            i += 1

    # 查找章节文件
    chapter_files = find_novel_files(novel_dir, volume)
    if not chapter_files:
        print(f'⚠️ 未找到章节文件（第*.md）')
        print(f'   搜索目录: {novel_dir}')
        return

    print(f'\n🔍 开始质量检查...')
    print(f'   目录: {novel_dir}')
    print(f'   章节: {len(chapter_files)} 个')
    if volume:
        print(f'   范围: {volume}')
    if quick:
        print(f'   模式: 快速检查')

    # 1. 字数检查
    print(f'\n  [1/4] 字数检查...')
    wc_results = run_wordcount_check(chapter_files)

    # 2. 术语一致性
    if quick:
        cs_results = {'skipped': True, 'reason': '快速模式跳过', 'total_issues': 0}
    else:
        print(f'  [2/4] 术语一致性检查...')
        term_file = novel_dir / '术语表.md'
        cs_results = run_consistency_check(chapter_files, term_file)

    # 3. AI痕迹检测
    print(f'  [3/4] AI痕迹检测...')
    ai_results = run_ai_lint_check(chapter_files)

    # 4. 伏笔审计
    if quick:
        fs_results = {'skipped': True, 'reason': '快速模式跳过'}
    else:
        print(f'  [4/4] 伏笔审计...')
        fs_results = run_foreshadow_audit(novel_dir)

    # 打印报告
    print_unified_report(novel_dir, wc_results, cs_results, ai_results, fs_results)


if __name__ == '__main__':
    main()
