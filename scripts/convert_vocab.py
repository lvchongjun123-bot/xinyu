"""
词库数据转换脚本

将 kajweb/dict 格式的 JSONL 词库文件转换为项目 JS 格式。

用法:
  python scripts/convert_vocab.py data/cet4_raw/CET4_3.json cet4
  python scripts/convert_vocab.py data/cet6_raw/CET6_3.json cet6
  python scripts/convert_vocab.py data/ielts_raw/IELTS_3.json ielts

数据来源: https://github.com/kajweb/dict
"""

import json
import sys
import os

WORDS_PER_UNIT = 30  # 每单元单词数


def extract_phonetic(content):
    """提取音标，优先美音"""
    usp = content.get('usphone', '')
    ukp = content.get('ukphone', '')
    ph = usp or ukp
    if ph:
        return f"[{ph}]"
    return ""


def extract_definition(content):
    """提取释义，合并所有词性"""
    trans = content.get('trans', [])
    if not trans:
        return ""
    parts = []
    for t in trans:
        if not isinstance(t, dict):
            continue
        pos = t.get('pos', '')
        cn = t.get('tranCn', '') or t.get('descCn', '')
        if cn:
            parts.append(f"{pos}.{cn}" if pos else cn)
    return '；'.join(parts) if parts else ""


def extract_sentence(content):
    """提取第一个例句（英文 + 中文翻译）"""
    sent_obj = content.get('sentence', {})
    if not isinstance(sent_obj, dict):
        return "", ""
    sents = sent_obj.get('sentences', [])
    if not sents:
        return "", ""
    s = sents[0]
    en = s.get('sContent', '')
    cn = s.get('sCn', '')
    return en, cn


def convert_file(input_path, output_name):
    """转换单个 JSONL 词库文件"""
    print(f"[*] 读取: {input_path}")

    converted_words = []
    skipped = 0
    word_id = 0

    with open(input_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue

            try:
                obj = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"  [WARN] 第{line_num}行解析失败: {e}")
                skipped += 1
                continue

            if not isinstance(obj, dict):
                skipped += 1
                continue

            word_text = obj.get('headWord', '').strip()
            if not word_text:
                skipped += 1
                continue

            # 提取 content.word.content 中的数据
            try:
                inner = obj['content']['word']['content']
            except (KeyError, TypeError):
                skipped += 1
                continue

            phonetic = extract_phonetic(inner)
            definition = extract_definition(inner)
            sentence_en, sentence_cn = extract_sentence(inner)

            # 清理过长的释义
            if len(definition) > 200:
                definition = definition[:197] + '...'

            word_id += 1
            converted_words.append({
                'id': word_id,
                'word': word_text,
                'phonetic': phonetic,
                'definition': definition or '(释义缺失)',
                'sentence': sentence_en,
                'sentence_cn': sentence_cn
            })

    # 分组到单元
    units = []
    for i in range(0, len(converted_words), WORDS_PER_UNIT):
        chunk = converted_words[i:i + WORDS_PER_UNIT]
        unit_id = len(units) + 1
        units.append({
            'id': unit_id,
            'name': f'Word List {unit_id}',
            'words': chunk
        })

    # 生成 JS 文件
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f'{output_name}.js')

    js_content = f"export default {json.dumps(units, ensure_ascii=False, indent=2)}\n"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)

    total_words = sum(len(u['words']) for u in units)
    print(f"[OK] {output_path}")
    print(f"     {len(units)} 个单元, {total_words} 个单词 (跳过 {skipped} 行)")
    return True


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        print("用法: python scripts/convert_vocab.py <JSONL文件> <输出名>")
        print("示例: python scripts/convert_vocab.py data/cet4_raw/CET4_3.json cet4")
        sys.exit(1)

    input_file = sys.argv[1]
    output_name = sys.argv[2]

    if not os.path.exists(input_file):
        print(f"[ERR] 文件不存在: {input_file}")
        sys.exit(1)

    success = convert_file(input_file, output_name)
    sys.exit(0 if success else 1)
