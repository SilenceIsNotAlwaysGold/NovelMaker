#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI痕迹检测脚本

扫描章节正文，检测常见的AI写作痕迹：
1. 黑名单词汇（华丽空洞词、AI高频连接词）
2. 四字成语连用
3. "他感到/她觉得" 模式过多
4. 段落首句重复开头（连续以"他/她"开头）
5. 句长单调（连续多句长度相近）
"""

import re
import sys
from pathlib import Path
from collections import Counter

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


# === 外部配置加载 ===
def _load_config():
    """尝试从 ai_blacklist.yaml 加载配置，失败则用内置默认值"""
    config_path = Path(__file__).parent / 'ai_blacklist.yaml'
    if config_path.exists():
        try:
            import yaml
            with open(config_path, 'r', encoding='utf-8') as f:
                cfg = yaml.safe_load(f)
            blacklist = {}
            for key in ['华丽空洞词', 'AI连接词', '过度修饰', '抽象情感']:
                if key in cfg:
                    blacklist[key] = cfg[key]
            feelings = cfg.get('feeling_patterns', None)
            thresholds = cfg.get('thresholds', None)
            return blacklist, feelings, thresholds
        except ImportError:
            # 没有 pyyaml，尝试简单解析
            pass
        except Exception:
            pass

    # 尝试简单行解析（无需 pyyaml）
    if config_path.exists():
        try:
            return _parse_yaml_simple(config_path)
        except Exception:
            pass

    return None, None, None


def _parse_yaml_simple(config_path: Path):
    """不依赖 pyyaml 的简单解析器"""
    content = config_path.read_text(encoding='utf-8')
    blacklist = {}
    feelings = []
    thresholds = {}
    current_section = None

    for line in content.split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue

        # 顶级 key
        if not line.startswith(' ') and not line.startswith('-') and stripped.endswith(':'):
            current_section = stripped[:-1]
            if current_section not in blacklist and current_section in ['华丽空洞词', 'AI连接词', '过度修饰', '抽象情感']:
                blacklist[current_section] = []
            continue

        # 列表项
        if stripped.startswith('- '):
            value = stripped[2:].strip().strip('"').strip("'")
            if current_section in blacklist:
                blacklist[current_section].append(value)
            elif current_section == 'feeling_patterns':
                feelings.append(value)
            continue

        # key: value（thresholds）
        if ':' in stripped and current_section == 'thresholds':
            k, v = stripped.split(':', 1)
            k = k.strip()
            v = v.strip().split('#')[0].strip()  # 去掉注释
            try:
                thresholds[k] = int(v)
            except ValueError:
                pass

    return blacklist or None, feelings or None, thresholds or None


_ext_blacklist, _ext_feelings, _ext_thresholds = _load_config()


# === 黑名单词汇 ===
BLACKLIST_WORDS = _ext_blacklist or {
    '华丽空洞词': [
        '璀璨', '瑰丽', '绚烂', '绚丽', '斑斓', '熠熠生辉', '流光溢彩',
        '美轮美奂', '波光粼粼', '星光璀璨', '如梦如幻', '宛若仙境',
    ],
    'AI连接词': [
        '此外', '然而', '尽管如此', '值得注意的是', '不可否认',
        '毫无疑问', '事实上', '总而言之', '综上所述', '换言之',
        '不言而喻', '显而易见',
    ],
    '过度修饰': [
        '深邃的眼眸', '如墨的长发', '精致的五官', '修长的手指',
        '挺拔的身姿', '温润如玉', '清冷如霜', '剑眉星目',
    ],
    '抽象情感': [
        '心中涌起一股复杂的情感', '内心深处泛起层层涟漪',
        '一种说不清道不明的感觉', '心里五味杂陈',
        '心中百感交集', '内心翻涌',
    ],
}

# "他感到/她觉得" 类模式
FEELING_PATTERNS = _ext_feelings or [
    r'[他她]感到', r'[他她]觉得', r'[他她]感觉到',
    r'[他她]意识到', r'[他她]不禁',
    r'心中涌起', r'心头一[紧颤震]',
]

# 评分阈值
THRESHOLDS = _ext_thresholds or {'excellent': 5, 'ok': 15, 'poor': 30}

# 四字成语连用模式（连续2个以上四字词，支持多种分隔符）
FOUR_CHAR_PATTERN = re.compile(r'[\u4e00-\u9fff]{4}[，、；·\s]+[\u4e00-\u9fff]{4}[，、；·\s]+[\u4e00-\u9fff]{4}')


def extract_body(filepath: Path) -> str:
    """提取正文"""
    content = filepath.read_text(encoding='utf-8')
    match = re.search(r'## 正文\s*\n(.*?)(\n## |\Z)', content, re.DOTALL)
    if match:
        return match.group(1).strip()
    return content


def check_blacklist(text: str) -> list:
    """检查黑名单词汇"""
    issues = []
    for category, words in BLACKLIST_WORDS.items():
        for word in words:
            count = text.count(word)
            if count > 0:
                issues.append({
                    'type': 'blacklist',
                    'category': category,
                    'word': word,
                    'count': count,
                    'severity': 'ERROR' if count >= 3 else 'WARN',
                })
    return issues


def check_feeling_patterns(text: str) -> list:
    """检查"他感到"类模式"""
    issues = []
    total = 0
    for pattern in FEELING_PATTERNS:
        matches = re.findall(pattern, text)
        total += len(matches)
        if matches:
            issues.append({
                'type': 'feeling_pattern',
                'pattern': pattern,
                'count': len(matches),
            })

    return issues, total


def check_four_char_chains(text: str) -> list:
    """检查四字成语连用"""
    matches = FOUR_CHAR_PATTERN.findall(text)
    return [{'type': 'four_char_chain', 'text': m, 'severity': 'WARN'} for m in matches]


def check_paragraph_starts(text: str) -> list:
    """检查段落首字重复"""
    paragraphs = [p.strip() for p in text.split('\n') if p.strip() and not p.startswith('#')]
    issues = []

    consecutive_he = 0
    consecutive_she = 0
    for i, para in enumerate(paragraphs):
        if para.startswith('他') or para.startswith('"他'):
            consecutive_he += 1
            consecutive_she = 0
        elif para.startswith('她') or para.startswith('"她'):
            consecutive_she += 1
            consecutive_he = 0
        else:
            if consecutive_he >= 3:
                issues.append({
                    'type': 'repetitive_start',
                    'char': '他',
                    'count': consecutive_he,
                    'near_paragraph': i - consecutive_he + 1,
                })
            if consecutive_she >= 3:
                issues.append({
                    'type': 'repetitive_start',
                    'char': '她',
                    'count': consecutive_she,
                    'near_paragraph': i - consecutive_she + 1,
                })
            consecutive_he = 0
            consecutive_she = 0

    return issues


def check_sentence_monotony(text: str) -> list:
    """检查句长单调性"""
    sentences = re.split(r'[。！？]', text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 2]

    issues = []
    window_size = 5
    for i in range(len(sentences) - window_size + 1):
        window = sentences[i:i + window_size]
        lengths = [len(s) for s in window]
        avg_len = sum(lengths) / len(lengths)
        # 如果5句话长度标准差很小，说明节奏单调
        variance = sum((l - avg_len) ** 2 for l in lengths) / len(lengths)
        std_dev = variance ** 0.5
        if std_dev < 3 and avg_len > 15:  # 长句且节奏单调
            issues.append({
                'type': 'monotone_rhythm',
                'position': i,
                'avg_length': round(avg_len, 1),
                'std_dev': round(std_dev, 1),
                'sample': window[0][:20] + '...',
            })
            break  # 只报告第一处

    return issues


def analyze_chapter(filepath: str) -> dict:
    """分析单个章节的AI痕迹"""
    path = Path(filepath)
    if not path.exists():
        return {'error': f'文件不存在: {filepath}'}

    text = extract_body(path)

    blacklist_issues = check_blacklist(text)
    feeling_issues, feeling_total = check_feeling_patterns(text)
    four_char_issues = check_four_char_chains(text)
    para_start_issues = check_paragraph_starts(text)
    rhythm_issues = check_sentence_monotony(text)

    # 计算AI味评分（越低越好）
    score = 0
    score += sum(i['count'] for i in blacklist_issues) * 2
    score += feeling_total * 1.5
    score += len(four_char_issues) * 3
    score += sum(i['count'] for i in para_start_issues) * 2
    score += len(rhythm_issues) * 5

    return {
        'file': filepath,
        'blacklist': blacklist_issues,
        'feeling_patterns': feeling_issues,
        'feeling_total': feeling_total,
        'four_char_chains': four_char_issues,
        'paragraph_starts': para_start_issues,
        'rhythm': rhythm_issues,
        'ai_score': round(score, 1),
    }


def print_report(result: dict):
    """打印检测报告"""
    if 'error' in result:
        print(f'❌ {result["error"]}')
        return

    print(f'\n{"=" * 60}')
    print(f'AI痕迹检测报告: {Path(result["file"]).name}')
    print(f'{"=" * 60}')

    score = result['ai_score']
    t = THRESHOLDS
    if score <= t.get('excellent', 5):
        grade = '🟢 优秀（AI味很低）'
    elif score <= t.get('ok', 15):
        grade = '🟡 一般（有轻微AI味）'
    elif score <= t.get('poor', 30):
        grade = '🟠 较差（AI味明显）'
    else:
        grade = '🔴 严重（AI味浓重，需要大幅修改）'

    print(f'\nAI味评分: {score} — {grade}')

    # 黑名单词
    if result['blacklist']:
        print(f'\n📌 黑名单词汇（{len(result["blacklist"])}类）:')
        for item in result['blacklist']:
            icon = '❌' if item['severity'] == 'ERROR' else '⚠️'
            print(f'  {icon} [{item["category"]}] "{item["word"]}" 出现 {item["count"]} 次')

    # 感受模式
    if result['feeling_total'] > 3:
        print(f'\n📌 "他感到/她觉得"类模式（共{result["feeling_total"]}次）:')
        for item in result['feeling_patterns']:
            print(f'  ⚠️ "{item["pattern"]}" 出现 {item["count"]} 次')
        print(f'  建议: 每章不超过3次，改用外化动作表现')

    # 四字成语连用
    if result['four_char_chains']:
        print(f'\n📌 四字成语连用（{len(result["four_char_chains"])}处）:')
        for item in result['four_char_chains']:
            print(f'  ⚠️ "{item["text"]}"')
        print(f'  建议: 打散为长短句交替')

    # 段落开头重复
    if result['paragraph_starts']:
        print(f'\n📌 段落开头重复:')
        for item in result['paragraph_starts']:
            print(f'  ⚠️ 连续{item["count"]}段以"{item["char"]}"开头（第{item["near_paragraph"]}段起）')

    # 节奏单调
    if result['rhythm']:
        print(f'\n📌 句长单调:')
        for item in result['rhythm']:
            print(f'  ⚠️ 连续5句平均长度{item["avg_length"]}字，标准差仅{item["std_dev"]}字')
            print(f'     示例: "{item["sample"]}"')
        print(f'  建议: 穿插短句制造节奏变化')

    if not any([result['blacklist'], result['feeling_total'] > 3,
                result['four_char_chains'], result['paragraph_starts'], result['rhythm']]):
        print('\n✅ 未检测到明显AI痕迹！')

    print(f'\n{"-" * 60}')


def main():
    if len(sys.argv) < 2:
        print('用法:')
        print('  python anti_ai_lint.py <章节文件>')
        print('  python anti_ai_lint.py --all <目录>')
        return

    if sys.argv[1] == '--all':
        directory = sys.argv[2] if len(sys.argv) > 2 else '.'
        dir_path = Path(directory)
        for chapter_file in sorted(dir_path.rglob('第*.md')):
            result = analyze_chapter(str(chapter_file))
            print_report(result)
    else:
        result = analyze_chapter(sys.argv[1])
        print_report(result)


if __name__ == '__main__':
    main()
