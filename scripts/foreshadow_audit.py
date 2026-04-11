#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
伏笔回收审计脚本

读取伏笔追踪表，统计各状态伏笔数量，
检查是否有逾期未回收的伏笔，生成审计报告。
"""

import re
import sys
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


STATUS_MAP = {
    '🔴': '已埋设（待回收）',
    '🟡': '部分回收',
    '🟢': '已回收',
    '⚫': '已废弃',
}

# 中文数字→阿拉伯数字映射
CN_NUM = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7,
          '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12, '十三': 13,
          '十四': 14, '十五': 15, '十六': 16, '十七': 17, '十八': 18,
          '十九': 19, '二十': 20}


def parse_volume_number(text: str) -> int:
    """从文本中提取卷号，支持中文和阿拉伯数字"""
    # 先尝试阿拉伯数字: 卷1, 卷12
    m = re.search(r'卷(\d+)', text)
    if m:
        return int(m.group(1))
    # 再尝试中文数字: 卷一, 卷十二
    m = re.search(r'卷(十?[一二三四五六七八九十]+)', text)
    if m:
        return CN_NUM.get(m.group(1), 0)
    # 最后尝试纯数字或纯中文（用户传入 "3" 或 "三"）
    text = text.strip()
    if text.isdigit():
        return int(text)
    return CN_NUM.get(text, 0)


def parse_foreshadow_table(filepath: str) -> list:
    """解析伏笔追踪表"""
    content = Path(filepath).read_text(encoding='utf-8')
    foreshadows = []

    current_category = None
    for line in content.split('\n'):
        # 检测类别标题
        if line.startswith('## ') and '伏笔' in line:
            current_category = line.strip('# ').strip()
            continue

        # 解析表格行
        if '|' in line and '---' not in line:
            cells = [c.strip() for c in line.split('|')[1:-1]]
            if len(cells) >= 6 and cells[0] and not cells[0].startswith('ID'):
                # 检测状态
                status = None
                for emoji, desc in STATUS_MAP.items():
                    if emoji in line:
                        status = emoji
                        break

                if status:
                    foreshadows.append({
                        'id': cells[0],
                        'description': cells[1],
                        'planted_at': cells[2],
                        'planned_harvest': cells[3],
                        'actual_harvest': cells[4] if len(cells) > 4 else '-',
                        'status': status,
                        'status_desc': STATUS_MAP.get(status, '未知'),
                        'category': current_category or '未分类',
                        'characters': cells[5] if len(cells) > 5 else '',
                    })

    return foreshadows


def audit(foreshadows: list, current_volume: str = None) -> dict:
    """执行审计"""
    stats = {'🔴': 0, '🟡': 0, '🟢': 0, '⚫': 0}
    overdue = []
    by_category = {}

    for f in foreshadows:
        stats[f['status']] = stats.get(f['status'], 0) + 1

        cat = f['category']
        if cat not in by_category:
            by_category[cat] = {'🔴': 0, '🟡': 0, '🟢': 0, '⚫': 0}
        by_category[cat][f['status']] += 1

        # 检查是否逾期（计划回收位置在当前卷之前但仍未回收）
        if current_volume and f['status'] == '🔴':
            planned_vol = parse_volume_number(f['planned_harvest'])
            current_vol = parse_volume_number(current_volume)
            if planned_vol > 0 and current_vol > 0 and planned_vol < current_vol:
                overdue.append(f)

    total = sum(stats.values())
    harvest_rate = (stats['🟢'] / total * 100) if total > 0 else 0

    return {
        'total': total,
        'stats': stats,
        'harvest_rate': round(harvest_rate, 1),
        'overdue': overdue,
        'by_category': by_category,
    }


def print_report(audit_result: dict, foreshadows: list):
    """打印审计报告"""
    r = audit_result

    print(f'\n{"=" * 60}')
    print(f'伏笔回收审计报告')
    print(f'{"=" * 60}')

    print(f'\n📊 总览:')
    print(f'  总伏笔数: {r["total"]}')
    print(f'  🔴 待回收: {r["stats"]["🔴"]}')
    print(f'  🟡 部分回收: {r["stats"]["🟡"]}')
    print(f'  🟢 已回收: {r["stats"]["🟢"]}')
    print(f'  ⚫ 已废弃: {r["stats"]["⚫"]}')
    print(f'  📈 回收率: {r["harvest_rate"]}%')

    # 分类统计
    if r['by_category']:
        print(f'\n📂 分类统计:')
        for cat, stats in r['by_category'].items():
            print(f'  {cat}: 🔴{stats["🔴"]} 🟡{stats["🟡"]} 🟢{stats["🟢"]} ⚫{stats["⚫"]}')

    # 逾期未回收
    if r['overdue']:
        print(f'\n⚠️  逾期未回收（{len(r["overdue"])}个）:')
        for f in r['overdue']:
            print(f'  ❌ {f["id"]}: {f["description"]}')
            print(f'     埋设于 {f["planted_at"]}，计划 {f["planned_harvest"]} 回收')

    # 待回收清单
    pending = [f for f in foreshadows if f['status'] in ('🔴', '🟡')]
    if pending:
        print(f'\n📋 待回收清单:')
        for f in pending:
            icon = f['status']
            print(f'  {icon} {f["id"]}: {f["description"]} (计划: {f["planned_harvest"]})')

    # 全书完结检查
    if r['stats']['🔴'] == 0 and r['stats']['🟡'] == 0:
        print(f'\n✅ 所有伏笔均已回收或废弃，可以安全完结！')
    else:
        remaining = r['stats']['🔴'] + r['stats']['🟡']
        print(f'\n⚠️  仍有 {remaining} 个伏笔未完全回收，完结前请处理')

    print(f'\n{"-" * 60}')


def main():
    if len(sys.argv) < 2:
        print('用法:')
        print('  python foreshadow_audit.py <伏笔追踪表路径> [当前卷名]')
        print('')
        print('示例:')
        print('  python foreshadow_audit.py novels/小说/伏笔追踪表.md')
        print('  python foreshadow_audit.py novels/小说/伏笔追踪表.md 卷三')
        print('  python foreshadow_audit.py novels/小说/伏笔追踪表.md 3')
        return

    filepath = sys.argv[1]
    current_vol = sys.argv[2] if len(sys.argv) > 2 else None

    if not Path(filepath).exists():
        print(f'错误: 文件不存在 - {filepath}')
        return

    foreshadows = parse_foreshadow_table(filepath)
    if not foreshadows:
        print('未找到伏笔记录（请检查文件格式是否正确）')
        return

    result = audit(foreshadows, current_vol)
    print_report(result, foreshadows)


if __name__ == '__main__':
    main()
