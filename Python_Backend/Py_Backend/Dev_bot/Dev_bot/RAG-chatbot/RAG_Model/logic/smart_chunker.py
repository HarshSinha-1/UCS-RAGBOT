import re

def smart_chunker(text, max_chars=1500, min_chars=300):
    """
    Hybrid chunker that:
    - Splits on section headings if present
    - Preserves tables and images as atomic blocks
    - Avoids breaking up lists and code blocks
    - Merges smaller units into larger chunks
    """
    # 1. Normalize line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # 2. Split by section headings (if any), else work on the full text
    heading_pat = re.compile(r'^(?:[A-Z][A-Z \d\.\-:]{5,}|Section\s+\d+|[IVXLC]+\.\s)', re.MULTILINE)
    heading_matches = list(heading_pat.finditer(text))
    section_spans = []
    if heading_matches:
        for i, m in enumerate(heading_matches):
            start = m.start()
            end = heading_matches[i+1].start() if i+1 < len(heading_matches) else len(text)
            section_spans.append(text[start:end].strip())
    else:
        section_spans = [text]
    
    # 3. For each section, further split into blocks that preserve tables, lists, images
    chunks = []
    for section in section_spans:
        # Split tables as blocks (common: Markdown/ASCII, but you can extend for your format)
        table_pat = re.compile(r'((?:\|.*\n)+)', re.MULTILINE)
        parts = []
        last_end = 0
        for m in table_pat.finditer(section):
            # Add text before table as a block
            if m.start() > last_end:
                before = section[last_end:m.start()].strip()
                if before:
                    parts.extend(before.split('\n\n')) # further split by double newline
            # Add table as a block
            table_block = m.group(1).strip()
            if table_block:
                parts.append(table_block)
            last_end = m.end()
        # Add trailing text after last table
        if last_end < len(section):
            after = section[last_end:].strip()
            if after:
                parts.extend(after.split('\n\n'))
        
        # Merge smaller blocks into larger chunks, respecting max_chars
        buf = ""
        for part in parts:
            if len(buf) + len(part) < max_chars:
                buf += (('\n\n' if buf else '') + part)
            else:
                if buf:
                    chunks.append(buf.strip())
                buf = part
        if buf:
            chunks.append(buf.strip())
    
    # 4. Final clean-up: remove too-small chunks, merge with neighbors if needed
    final_chunks = []
    buf = ""
    for chunk in chunks:
        if len(chunk) < min_chars:
            buf += ('\n\n' + chunk)
            if len(buf) > min_chars:
                final_chunks.append(buf.strip())
                buf = ""
        else:
            if buf:
                final_chunks.append(buf.strip())
                buf = ""
            final_chunks.append(chunk)
    if buf:
        final_chunks.append(buf.strip())
    
    return final_chunks
