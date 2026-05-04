#!/usr/bin/env python3
"""
Replace placeholder text in a Word .doc (OLE2) file.
Finds all replacements first, applies them in one sorted pass, then updates the piece table.
Ensures Unicode pieces remain word-aligned (even byte offset) after modifications.
Usage: python3 replace_doc.py template.doc output.doc '{"COMPANY NAME":"ACME",...}'
"""
import struct, sys, json

def build_fat(data, ss):
    dif_start = struct.unpack_from('<I', data, 68)[0]
    fat_secs = []
    for i in range(109):
        idx = struct.unpack_from('<I', data, 76 + i*4)[0]
        if idx >= 0xFFFFFFF0: break
        fat_secs.append(idx)
    if dif_start < 0xFFFFFFF0:
        cur = dif_start
        while cur < 0xFFFFFFF0:
            off = 512 + cur * ss
            for i in range(127):
                idx2 = struct.unpack_from('<I', data, off + i*4)[0]
                if idx2 < 0xFFFFFFF0: fat_secs.append(idx2)
            cur = struct.unpack_from('<I', data, off + 127*4)[0]
    fat = []
    for fs in fat_secs:
        fat.extend(struct.unpack_from('<' + 'I' * (ss//4), data, 512 + fs*ss))
    return fat

def chain(fat, start):
    s=[]; c=int(start)&0xFFFFFFFF; v=set()
    while c < 0xFFFFFFF0 and c not in v and c < len(fat):
        v.add(c); s.append(c); c=fat[c]
    return s

def read_stream(data, fat, start, size, ss):
    secs = chain(fat, start)
    raw = b''.join(data[512+s*ss:512+(s+1)*ss] for s in secs)
    return bytearray(raw[:size])

def write_stream(data, fat, start, stream_ba, ss):
    secs = chain(fat, start)
    for i, s in enumerate(secs):
        off = 512 + s * ss
        chunk = stream_ba[i*ss:(i+1)*ss]
        data[off:off+ss] = chunk + bytearray(ss - len(chunk))

def replace_doc(template_path, output_path, replacements):
    with open(template_path, 'rb') as f:
        data = bytearray(f.read())

    ss = 2 ** struct.unpack_from('<H', data, 30)[0]
    fat = build_fat(data, ss)

    root_start = struct.unpack_from('<I', data, 48)[0]
    dir_secs = chain(fat, root_start)
    dir_data = bytearray(b''.join(data[512+s*ss:512+(s+1)*ss] for s in dir_secs))

    streams = {}
    for i in range(len(dir_data)//128):
        e = dir_data[i*128:(i+1)*128]
        nlen = struct.unpack_from('<H', e, 64)[0]
        if nlen >= 2:
            name = e[:nlen-2].decode('utf-16-le', errors='ignore')
            streams[name] = {
                'idx': i,
                'start': struct.unpack_from('<I', e, 116)[0],
                'size': struct.unpack_from('<I', e, 120)[0]
            }

    wd = read_stream(data, fat, streams['WordDocument']['start'], streams['WordDocument']['size'], ss)
    tbl = read_stream(data, fat, streams['1Table']['start'], streams['1Table']['size'], ss)

    # Parse FIB
    csw = struct.unpack_from('<H', wd, 32)[0]
    cslw_off = 34 + csw * 2
    cslw = struct.unpack_from('<H', wd, cslw_off)[0]
    rglw_start = cslw_off + 2
    ccpText_off = rglw_start + 3 * 4
    cbRgFcLcb_off = rglw_start + cslw * 4
    fcLcb_start = cbRgFcLcb_off + 2
    fcClx_off = fcLcb_start + 33 * 8
    fcClx = struct.unpack_from('<I', wd, fcClx_off)[0]
    lcbClx = struct.unpack_from('<I', wd, fcClx_off + 4)[0]

    # Parse Clx / piece table
    clx = tbl[fcClx:fcClx+lcbClx]
    pos = 0
    prc_bytes = bytearray()
    while pos < len(clx) and clx[pos] == 0x01:
        cbG = struct.unpack_from('<H', clx, pos+1)[0]
        prc_bytes.extend(clx[pos:pos+3+cbG])
        pos += 3 + cbG
    lcb_pcdt = struct.unpack_from('<I', clx, pos+1)[0]
    pcdt_data = bytearray(clx[pos+5:pos+5+lcb_pcdt])
    n = (lcb_pcdt - 4) // 12
    cps = list(struct.unpack_from('<' + 'I'*(n+1), pcdt_data, 0))
    pcd_base = (n+1) * 4

    pieces = []
    for i in range(n):
        poff = pcd_base + i * 8
        fc_raw = struct.unpack_from('<I', pcdt_data, poff + 2)[0]
        is_ansi = bool(fc_raw & 0x40000000)
        fc = (fc_raw & ~0x40000000) >> 1 if is_ansi else fc_raw
        pieces.append({'fc': fc, 'is_ansi': is_ansi, 'poff': poff,
                       'cp0': cps[i], 'cp1': cps[i+1]})

    # PHASE 1: Find ALL replacement positions in the ORIGINAL stream
    all_reps = []
    for old_str, new_str in replacements:
        old_b = old_str.encode('cp1252')
        new_b = new_str.encode('cp1252')
        p2 = 0
        while True:
            idx = wd.find(old_b, p2)
            if idx == -1: break
            all_reps.append((idx, old_b, new_b))
            p2 = idx + len(old_b)
    all_reps.sort(key=lambda x: x[0])

    # PHASE 2: Build new stream and track deltas per piece
    piece_deltas = [0] * n
    new_wd = bytearray()
    prev_end = 0
    for (orig_pos, old_b, new_b) in all_reps:
        delta = len(new_b) - len(old_b)
        new_wd.extend(wd[prev_end:orig_pos])
        new_wd.extend(new_b)
        prev_end = orig_pos + len(old_b)
        if delta != 0:
            for pi in range(n):
                p = pieces[pi]
                if not p['is_ansi']: continue
                be = p['fc'] + (p['cp1'] - p['cp0'])
                if p['fc'] <= orig_pos < be:
                    piece_deltas[pi] += delta
                    break
    new_wd.extend(wd[prev_end:])

    # PHASE 2b: Unicode alignment fix
    # For each Unicode piece, the cumulative delta from all prior pieces must be even
    # (Unicode chars are 2 bytes; odd offset breaks 16-bit alignment)
    cumulative = 0
    for pi in range(n):
        if not pieces[pi]['is_ansi']:
            if cumulative % 2 != 0:
                # Find the last ANSI piece before this Unicode piece
                for pi_prev in range(pi-1, -1, -1):
                    if pieces[pi_prev]['is_ansi']:
                        break
                else:
                    pi_prev = -1
                adjusted = False
                if pi_prev >= 0:
                    p_prev = pieces[pi_prev]
                    # Compute the actual byte range of pi_prev in new_wd
                    # fc is unchanged for this piece (it's only shifted by prior deltas,
                    # but cumulative = prior deltas, and p_prev.fc + cumulative_before_p_prev
                    # points to where the piece starts in new_wd)
                    cum_before_prev = sum(piece_deltas[j] for j in range(pi_prev))
                    p_start = p_prev['fc'] + cum_before_prev
                    p_end = p_start + (p_prev['cp1'] - p_prev['cp0']) + piece_deltas[pi_prev]
                    # Try to find a double-space to remove (delta += 1)
                    for k in range(int(p_start), int(p_end) - 1):
                        if new_wd[k] == 0x20 and new_wd[k+1] == 0x20:
                            new_wd = new_wd[:k+1] + new_wd[k+2:]
                            piece_deltas[pi_prev] += 1
                            cumulative += 1
                            adjusted = True
                            break
                    if not adjusted:
                        # Insert a space before the last \r in the piece
                        for k in range(int(p_end)-1, int(p_start)-1, -1):
                            if new_wd[k] == 0x0D:
                                new_wd = new_wd[:k] + b' ' + new_wd[k:]
                                piece_deltas[pi_prev] -= 1
                                cumulative -= 1
                                adjusted = True
                                break
                if not adjusted:
                    print(f"Warning: could not fix Unicode alignment for piece {pi}", file=sys.stderr)
        cumulative += piece_deltas[pi]

    total_delta = sum(piece_deltas)

    if total_delta != 0:
        # PHASE 3: Update piece table
        # Update CPs: for each piece that had changes, shift all subsequent CPs
        for pi in range(n):
            d = piece_deltas[pi]
            if d != 0:
                for ci in range(pi+1, n+1):
                    cps[ci] += d

        # Update fcs: each piece's fc shifts by the cumulative delta of all PRIOR pieces
        prior_delta = 0
        for pi in range(n):
            p = pieces[pi]
            if prior_delta != 0:
                new_fc = p['fc'] + prior_delta
                if p['is_ansi']:
                    new_fc_raw = (new_fc << 1) | 0x40000000
                else:
                    new_fc_raw = new_fc
                struct.pack_into('<I', pcdt_data, p['poff'] + 2, new_fc_raw)
            prior_delta += piece_deltas[pi]

        # Write CPs back
        for ci in range(n+1):
            struct.pack_into('<I', pcdt_data, ci*4, cps[ci])

        # Update cbMac in FIB (FibRgLw97[0] = WD stream byte count, Word validates this)
        struct.pack_into('<I', new_wd, rglw_start, len(new_wd))
        # Update ccpText in FIB
        old_ccp = struct.unpack_from('<i', new_wd, ccpText_off)[0]
        struct.pack_into('<i', new_wd, ccpText_off, old_ccp + total_delta)

        # Rebuild Clx in 1Table
        new_pcdt_payload = bytes([0x02]) + struct.pack('<I', len(pcdt_data)) + bytes(pcdt_data)
        new_clx = bytes(prc_bytes) + new_pcdt_payload
        tbl[fcClx:fcClx+lcbClx] = new_clx[:lcbClx]

        # Update stream size in directory
        wd_dir_idx = streams['WordDocument']['idx']
        struct.pack_into('<I', dir_data, wd_dir_idx*128 + 120, len(new_wd))
        write_stream(data, fat, root_start, dir_data, ss)
        write_stream(data, fat, streams['1Table']['start'], tbl, ss)

    write_stream(data, fat, streams['WordDocument']['start'], new_wd, ss)

    with open(output_path, 'wb') as f:
        f.write(bytes(data))
    print(f"Done: {output_path} ({len(new_wd)} bytes wd, delta={total_delta})", file=sys.stderr)

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: replace_doc.py template.doc output.doc '{\"KEY\":\"val\"}'")
        sys.exit(1)
    reps = json.loads(sys.argv[3])
    replace_doc(sys.argv[1], sys.argv[2], list(reps.items()))
