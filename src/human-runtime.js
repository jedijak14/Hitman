// HumanForge runtime bundle (MIT), pinned to 2226df1f50a04c5a8e1c02ea33780d28337dfbb1.
// The upstream MIT text and CC0 asset provenance are in assets/humanforge/.
import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  FrontSide,
  Group,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Skeleton,
  SkinnedMesh,
  TextureLoader,
  Vector3
} from "three";

// ../../../tmp/humanforge-build/node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var gzs = function(d) {
  if (d[0] != 31 || d[1] != 139 || d[2] != 8)
    err(6, "invalid gzip data");
  var flg = d[3];
  var st = 10;
  if (flg & 4)
    st += (d[10] | d[11] << 8) + 2;
  for (var zs = (flg >> 3 & 1) + (flg >> 4 & 1); zs > 0; zs -= !d[st++])
    ;
  return st + (flg & 2);
};
var gzl = function(d) {
  var l = d.length;
  return (d[l - 4] | d[l - 3] << 8 | d[l - 2] << 16 | d[l - 1] << 24) >>> 0;
};
function gunzipSync(data, opts) {
  var st = gzs(data);
  if (st + 8 > data.length)
    err(6, "invalid gzip data");
  return inflt(data.subarray(st, -8), { i: 2 }, opts && opts.out || new u8(gzl(data)), opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}

// ../../../tmp/humanforge-build/src/human/sliders.ts
var lr = (dir, name) => [`${dir}/l-${name}`, `${dir}/r-${name}`];
var pair = (id, label, group, dir, base, n = "decr", p = "incr") => ({ id, label, group, neg: [`${dir}/${base}-${n}`], pos: [`${dir}/${base}-${p}`] });
var pairLR = (id, label, group, dir, base, n = "decr", p = "incr") => ({ id, label, group, neg: lr(dir, `${base}-${n}`), pos: lr(dir, `${base}-${p}`) });
var one = (id, label, group, target) => ({ id, label, group, neg: [], pos: [target] });
var DETAIL_SLIDERS = [
  // head & face shape
  pair("headWidth", "Head width", "head", "head", "head-scale-horiz"),
  pair("headHeight", "Head height", "head", "head", "head-scale-vert"),
  pair("headDepth", "Head depth", "head", "head", "head-scale-depth"),
  pair("faceFat", "Face fullness", "head", "head", "head-fat"),
  one("headOval", "Oval face", "head", "head/head-oval"),
  one("headRound", "Round face", "head", "head/head-round"),
  one("headSquare", "Square face", "head", "head/head-square"),
  one("headHeart", "Heart face", "head", "head/head-invertedtriangular"),
  pair("foreheadHeight", "Forehead height", "head", "forehead", "forehead-scale-vert"),
  pair("foreheadSlope", "Forehead slope", "head", "forehead", "forehead-trans", "backward", "forward"),
  pair("jaw", "Jaw width", "head", "chin", "chin-bones"),
  pair("chinWidth", "Chin width", "head", "chin", "chin-width"),
  pair("chinHeight", "Chin height", "head", "chin", "chin-height"),
  pair("chinProminence", "Chin prominence", "head", "chin", "chin-prominent"),
  pair("chinCleft", "Chin cleft", "head", "chin", "chin-cleft"),
  pairLR("cheekBones", "Cheekbones", "head", "cheek", "cheek-bones"),
  pairLR("cheekVolume", "Cheek volume", "head", "cheek", "cheek-volume"),
  // eyes & brows
  pairLR("eyeSize", "Eye size", "eyes", "eyes", "eye-scale"),
  pairLR("eyeOpening", "Eye opening", "eyes", "eyes", "eye-height2"),
  pairLR("eyeSpacing", "Eye spacing", "eyes", "eyes", "eye-trans", "in", "out"),
  pairLR("eyeHeight", "Eye height", "eyes", "eyes", "eye-trans", "down", "up"),
  pairLR("eyeTilt", "Eye tilt", "eyes", "eyes", "eye-corner1", "down", "up"),
  pairLR("eyeFold", "Eyelid fold", "eyes", "eyes", "eye-epicanthus", "in", "out"),
  pairLR("eyeBags", "Eye bags", "eyes", "eyes", "eye-bag"),
  pair("browHeight", "Brow height", "eyes", "eyebrows", "eyebrows-trans", "down", "up"),
  pair("browAngle", "Brow angle", "eyes", "eyebrows", "eyebrows-angle", "down", "up"),
  pair("browDepth", "Brow ridge", "eyes", "eyebrows", "eyebrows-trans", "backward", "forward"),
  // nose
  pair("noseWidth", "Nose width", "nose", "nose", "nose-scale-horiz"),
  pair("noseLength", "Nose length", "nose", "nose", "nose-scale-vert"),
  pair("noseDepth", "Nose projection", "nose", "nose", "nose-scale-depth"),
  pair("noseBridge", "Bridge width", "nose", "nose", "nose-width1"),
  pair("noseHump", "Nose hump", "nose", "nose", "nose-hump"),
  pair("noseTip", "Tip up/down", "nose", "nose", "nose-point", "down", "up"),
  pair("noseTipWidth", "Tip width", "nose", "nose", "nose-point-width"),
  pair("nostrils", "Nostril width", "nose", "nose", "nose-nostrils-width"),
  pair("noseFlare", "Nostril flare", "nose", "nose", "nose-flaring"),
  // mouth
  pair("mouthWidth", "Mouth width", "mouth", "mouth", "mouth-scale-horiz"),
  pair("mouthHeight", "Mouth position", "mouth", "mouth", "mouth-trans", "down", "up"),
  pair("upperLip", "Upper lip", "mouth", "mouth", "mouth-upperlip-volume"),
  pair("lowerLip", "Lower lip", "mouth", "mouth", "mouth-lowerlip-volume"),
  pair("cupidsBow", "Cupid's bow", "mouth", "mouth", "mouth-cupidsbow"),
  pair("mouthCorners", "Mouth corners", "mouth", "mouth", "mouth-angles", "down", "up"),
  pair("mouthDepth", "Mouth depth", "mouth", "mouth", "mouth-scale-depth"),
  pair("dimples", "Dimples", "mouth", "mouth", "mouth-dimples", "in", "out"),
  // ears
  pairLR("earSize", "Ear size", "ears", "ears", "ear-scale"),
  pairLR("earAngle", "Ear angle", "ears", "ears", "ear-rot", "backward", "forward"),
  pairLR("earLobe", "Ear lobe", "ears", "ears", "ear-lobe"),
  { id: "earPointed", label: "Pointed ears", group: "ears", neg: [], pos: lr("ears", "ear-shape-pointed") },
  // body detail
  pair("neckWidth", "Neck width", "body", "neck", "neck-scale-horiz"),
  pair("neckLength", "Neck length", "body", "neck", "neck-scale-vert"),
  pair("shoulders", "Shoulders", "body", "torso", "measure-shoulder-dist"),
  pair("chest", "Chest", "body", "torso", "measure-bust-circ"),
  pair("waist", "Waist", "body", "torso", "measure-waist-circ"),
  pair("hips", "Hips", "body", "torso", "measure-hips-circ"),
  pair("vShape", "V-shape", "body", "torso", "torso-vshape"),
  pair("belly", "Belly", "body", "stomach", "stomach-pregnant"),
  pair("buttocks", "Buttocks", "body", "buttocks", "buttocks-volume")
];

// ../../../tmp/humanforge-build/src/human/glb.ts
var TYPES = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
};
var SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function ascii(bytes) {
  let s = "";
  for (let i2 = 0; i2 < bytes.length; i2 += 8192) s += String.fromCharCode(...bytes.subarray(i2, i2 + 8192));
  return s;
}
function readGlb(buffer) {
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== 1179937895) throw new Error("not a GLB");
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(decodeURIComponent(escape(ascii(new Uint8Array(buffer, 20, jsonLen)))));
  const binStart = 20 + jsonLen + 8;
  const read = (i2) => {
    const acc = json.accessors[i2];
    const view = json.bufferViews[acc.bufferView];
    const T = TYPES[acc.componentType];
    const size = SIZES[acc.type];
    const out = new T(acc.count * size);
    const start = binStart + (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
    const stride = view.byteStride ?? size * T.BYTES_PER_ELEMENT;
    if (stride === size * T.BYTES_PER_ELEMENT && start % T.BYTES_PER_ELEMENT === 0) {
      out.set(new T(buffer, start, acc.count * size));
    } else {
      const getter = { 5120: "getInt8", 5121: "getUint8", 5122: "getInt16", 5123: "getUint16", 5125: "getUint32", 5126: "getFloat32" }[acc.componentType];
      for (let e = 0; e < acc.count; e++) for (let k = 0; k < size; k++) {
        out[e * size + k] = dv[getter](start + e * stride + k * T.BYTES_PER_ELEMENT, true);
      }
    }
    return { array: out, itemSize: size, normalized: !!acc.normalized };
  };
  const prim = json.meshes[0].primitives[0];
  const attributes = {};
  for (const [name, idx] of Object.entries(prim.attributes)) attributes[name] = read(idx);
  const index = read(prim.indices).array;
  return { attributes, index };
}
function toFloat(a) {
  if (a.array instanceof Float32Array) return a.array;
  const out = new Float32Array(a.array.length);
  const max2 = a.normalized ? a.array instanceof Uint8Array ? 255 : a.array instanceof Uint16Array ? 65535 : a.array instanceof Int8Array ? 127 : a.array instanceof Int16Array ? 32767 : 1 : 1;
  for (let i2 = 0; i2 < out.length; i2++) out[i2] = a.normalized && max2 !== 1 ? Math.max(-1, a.array[i2] / max2) : a.array[i2];
  return out;
}

// ../../../tmp/humanforge-build/src/human/catalog.ts
var CLOTHES = {
  female_casualsuit01: { label: "Casual tee", fit: "female", slot: "outfit" },
  female_casualsuit02: { label: "Casual layers", fit: "female", slot: "outfit" },
  female_elegantsuit01: { label: "Elegant", fit: "female", slot: "outfit" },
  female_sportsuit01: { label: "Sport", fit: "female", slot: "outfit" },
  male_casualsuit01: { label: "Casual 1", fit: "male", slot: "outfit" },
  male_casualsuit02: { label: "Casual 2", fit: "male", slot: "outfit" },
  male_casualsuit03: { label: "Casual 3", fit: "male", slot: "outfit" },
  male_casualsuit04: { label: "Casual 4", fit: "male", slot: "outfit" },
  male_casualsuit05: { label: "Casual 5", fit: "male", slot: "outfit" },
  male_casualsuit06: { label: "Casual 6", fit: "male", slot: "outfit" },
  male_elegantsuit01: { label: "Suit", fit: "male", slot: "outfit" },
  male_worksuit01: { label: "Workwear", fit: "male", slot: "outfit" },
  // MakeHuman community clothes (CC0, see LICENSE.ASSETS.md)
  toigo_camisole_dress_with_full_skirt: { label: "Camisole dress", fit: "female", slot: "outfit" },
  toigo_halter_dress_knee_length: { label: "Halter dress", fit: "female", slot: "outfit" },
  toigo_halter_dress_midi: { label: "Halter midi", fit: "female", slot: "outfit" },
  toigo_halter_dress_with_fluted_skirt: { label: "Halter gown", fit: "female", slot: "outfit" },
  toigo_shift_dress: { label: "Shift dress", fit: "female", slot: "outfit" },
  toigo_keyhole_neck_dress: { label: "Keyhole dress", fit: "female", slot: "outfit" },
  toigo_dress_with_tiered_skirt: { label: "Tiered dress", fit: "female", slot: "outfit" },
  toigo_bodice_dress_with_lace_ruffle_skirt: { label: "Lace ruffle dress", fit: "female", slot: "outfit" },
  toigo_strapless_ruffle_top_dress: { label: "Strapless dress", fit: "female", slot: "outfit" },
  toigo_cut_out_dress: { label: "Cut-out dress", fit: "female", slot: "outfit" },
  toigo_female_suit: { label: "Skirt suit", fit: "female", slot: "outfit" },
  toigo_female_suit_2: { label: "Trouser suit", fit: "female", slot: "outfit" },
  "toigo_female_double-breasted_suit": { label: "Double-breasted suit", fit: "female", slot: "outfit" },
  toigo_male_suit_3: { label: "Suit and tie", fit: "male", slot: "outfit" },
  "toigo_male_double-breasted_suit": { label: "Double-breasted suit", fit: "male", slot: "outfit" },
  toigo_suit_with_dinner_jacket: { label: "Dinner jacket", fit: "male", slot: "outfit" },
  shoes01: { label: "Shoes 1", fit: "unisex", slot: "shoes" },
  shoes02: { label: "Shoes 2", fit: "unisex", slot: "shoes" },
  shoes03: { label: "Shoes 3", fit: "unisex", slot: "shoes" },
  shoes04: { label: "Shoes 4", fit: "unisex", slot: "shoes" },
  shoes05: { label: "Shoes 5", fit: "unisex", slot: "shoes" },
  shoes06: { label: "Shoes 6", fit: "unisex", slot: "shoes" },
  fedora01: { label: "Fedora", fit: "unisex", slot: "hat" },
  fedora_cocked: { label: "Fedora (tilted)", fit: "unisex", slot: "hat" },
  // Generated by tools/build-garments.ts (original, CC0): tintable, see GARMENT_COLORS.
  abaya01: { label: "Abaya", fit: "female", slot: "outfit" },
  jalabiya01: { label: "Jalabiya", fit: "female", slot: "outfit" },
  dress_knee01: { label: "Day dress", fit: "female", slot: "outfit" },
  dress_maxi01: { label: "Maxi dress", fit: "female", slot: "outfit" },
  gown01: { label: "Evening gown", fit: "female", slot: "outfit" },
  hijab01: { label: "Hijab", fit: "female", slot: "headwear" },
  amira01: { label: "Al-amira", fit: "female", slot: "headwear" }
};
var words = (s) => s.replace(/_/g, " ").replace(/(\d+)$/, " $1").replace(/\s+/g, " ").trim();
var cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function clothingInfo(id) {
  if (CLOTHES[id]) return CLOTHES[id];
  const slot = id.startsWith("shoes") ? "shoes" : /hijab|amira|shayla|scarf|turban/.test(id) ? "headwear" : /hat|fedora|cap|helmet/.test(id) ? "hat" : "outfit";
  const fit = id.startsWith("female") ? "female" : id.startsWith("male") ? "male" : "unisex";
  return { label: cap(words(id.replace(/^(fe)?male_/, ""))), fit, slot };
}

// ../../../tmp/humanforge-build/src/human/runtime.ts
var DEFAULT_HUMAN = {
  gender: 0.5,
  age: 0.15,
  muscle: 0.5,
  weight: 0.5,
  height: 0.5,
  proportions: 0.5,
  cupSize: 0.5,
  firmness: 0.5,
  african: 1 / 3,
  asian: 1 / 3,
  caucasian: 1 / 3,
  detail: {},
  skin: "young_caucasian_female",
  skinTint: "#ffffff",
  eyes: "brownlight",
  eyebrows: "eyebrow001",
  eyebrowColor: "#3b2a1e",
  eyelashes: "eyelashes01",
  hair: "bob02",
  hairColor: "#3b2a1e",
  clothes: ["female_casualsuit01", "shoes01"]
};
var TIER_PX = { "512": 512, "1k": 1024, "2k": 2048 };
var tierFor = (px) => px >= 2048 ? "2k" : px >= 1024 ? "1k" : "512";
var webTextureLoader = async (url) => new TextureLoader().loadAsync(url);
function unplane16(src, at, n, signed) {
  const out = signed ? new Int16Array(n) : new Uint16Array(n);
  let acc = 0;
  for (let i2 = 0; i2 < n; i2++) {
    acc = acc + (src[at + i2] | src[at + n + i2] << 8) & 65535;
    out[i2] = acc;
  }
  return out;
}
function unplane8(src, at, n) {
  const out = new Int16Array(n);
  let acc = 0;
  for (let i2 = 0; i2 < n; i2++) {
    acc = acc + src[at + i2] & 255;
    out[i2] = acc > 127 ? acc - 256 : acc;
  }
  return out;
}
async function loadHumanPackage(baseUrl, opts = {}) {
  const root = baseUrl.replace(/\/$/, "");
  const rawFetch = opts.fetch ?? (async (u) => (await fetch(u)).arrayBuffer());
  const fetchBinary = async (u) => {
    const buf = new Uint8Array(await rawFetch(u));
    const raw = u.endsWith(".gz") && buf[0] === 31 && buf[1] === 139 ? gunzipSync(buf) : buf;
    return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  };
  const manifestBytes = new Uint8Array(await rawFetch(`${root}/manifest.json`));
  let text = "";
  for (let i2 = 0; i2 < manifestBytes.length; i2 += 8192) text += String.fromCharCode(...manifestBytes.subarray(i2, i2 + 8192));
  const manifest = JSON.parse(text);
  const [bin, bodyBuf] = await Promise.all([fetchBinary(`${root}/${manifest.shapes.file}`), fetchBinary(`${root}/${manifest.body.file}`)]);
  const bytes = new Uint8Array(bin);
  const N = manifest.vertexCount, sh = manifest.shapes;
  const base = new Float32Array(N * 3);
  for (let k = 0; k < 3; k++) {
    const q = unplane16(bytes, sh.baseOffset + k * N * 2, N, false);
    for (let i2 = 0; i2 < N; i2++) base[i2 * 3 + k] = sh.baseMin[k] + q[i2] * sh.baseScale[k];
  }
  const morphs = /* @__PURE__ */ new Map();
  for (const m of sh.morphs) {
    const idx = unplane16(bytes, m.offset, m.count, false);
    const d = new Int16Array(m.count * 3);
    let at = m.offset + m.count * 2;
    for (let k = 0; k < 3; k++) {
      const v = m.bits === 8 ? unplane8(bytes, at, m.count) : unplane16(bytes, at, m.count, true);
      at += m.count * (m.bits === 8 ? 1 : 2);
      for (let i2 = 0; i2 < m.count; i2++) d[i2 * 3 + k] = v[i2];
    }
    morphs.set(m.name, { idx, d, scale: m.scale });
  }
  const loadTexture = opts.loadTexture ?? webTextureLoader;
  const mobile = manifest.mobileTextures;
  const textureFormat = opts.textureFormat === "mobile" && mobile ? "mobile" : "webp";
  if (opts.textureFormat === "mobile" && !mobile) console.warn("humanforge: this asset package has no mobile texture pack (npm run build:mobile); using WebP");
  const mobileBase = (opts.mobileBaseUrl ?? mobile?.baseUrl ?? `${root}/${mobile?.dir ?? "mobile"}`).replace(/\/$/, "");
  const textureCache = /* @__PURE__ */ new Map();
  const resolveTexture = (key, tier, nativeSize) => {
    const entry = textureFormat === "mobile" ? mobile.files[key] : void 0;
    if (entry) {
      const px = Math.min(TIER_PX[tier], entry.max, nativeSize);
      return { url: `${mobileBase}/${key}_${tierFor(px)}.${entry.ext}`, size: px };
    }
    if (key.startsWith("skins/")) return tier === "2k" ? { url: `${root}/${key}_2k.webp`, size: manifest.textureSizes.skin2k } : { url: `${root}/${key}_1k.webp`, size: manifest.textureSizes.skin1k };
    return { url: `${root}/${key}.webp`, size: nativeSize };
  };
  const getTexture = (key, tier, nativeSize) => {
    const { url, size } = resolveTexture(key, tier, nativeSize);
    let t = textureCache.get(url);
    if (!t) {
      t = loadTexture(url, size).then((tex) => {
        tex.colorSpace = key.endsWith("_n") ? "" : SRGBColorSpace;
        tex.flipY = false;
        tex.needsUpdate = true;
        return tex;
      });
      textureCache.set(url, t);
      t.catch(() => textureCache.delete(url));
    }
    return t;
  };
  return {
    baseUrl: root,
    manifest,
    base,
    morphs,
    body: readGlb(bodyBuf),
    loadTexture,
    fetchBinary,
    proxyCache: /* @__PURE__ */ new Map(),
    textureCache,
    textureFormat,
    resolveTexture,
    getTexture
  };
}
var keyOf = (file) => file.replace(/\.(webp|png|jpe?g)$/, "");
var clamp01 = (v) => Math.min(1, Math.max(0, v));
function macroWeights(c) {
  const w = {};
  const g = clamp01(c.gender);
  w["macro/sexF"] = Math.max(0, 1 - 2 * g);
  w["macro/sexM"] = Math.max(0, 2 * g - 1);
  const split = (v, up, down) => {
    const x2 = clamp01(v);
    const [k, amt] = x2 >= 0.5 ? [up, 2 * x2 - 1] : [down, 1 - 2 * x2];
    w[`macro/${k}F`] = (w[`macro/${k}F`] ?? 0) + amt * (1 - g);
    w[`macro/${k}M`] = (w[`macro/${k}M`] ?? 0) + amt * g;
  };
  split(c.muscle, "muscleUp", "muscleDown");
  split(c.weight, "weightUp", "weightDown");
  split(0.5 + (clamp01(c.height) - 0.5) * 0.36, "heightUp", "heightDown");
  split(c.proportions, "proportionsUp", "proportionsDown");
  split(c.cupSize, "cupUp", "cupDown");
  split(c.firmness, "firmUp", "firmDown");
  const years = 18 + 72 * clamp01(c.age);
  if (years < 25) {
    const t = (25 - years) / 7;
    w["macro/ageYoungF"] = t * (1 - g);
    w["macro/ageYoungM"] = t * g;
  } else {
    const t = (years - 25) / 65;
    w["macro/ageOldF"] = t * (1 - g);
    w["macro/ageOldM"] = t * g;
  }
  const rs = c.african + c.asian + c.caucasian || 1;
  for (const r of ["african", "asian", "caucasian"]) {
    const x2 = c[r] / rs;
    w[`macro/${r}F`] = x2 * (1 - g);
    w[`macro/${r}M`] = x2 * g;
  }
  return w;
}
function evaluateShape(pkg, c, out = new Float32Array(pkg.base.length)) {
  out.set(pkg.base);
  const add = (name, weight) => {
    const m = pkg.morphs.get(name);
    if (!m || Math.abs(weight) < 1e-4) return;
    const s = m.scale * weight;
    for (let i2 = 0; i2 < m.idx.length; i2++) {
      const o = m.idx[i2] * 3;
      out[o] += m.d[i2 * 3] * s;
      out[o + 1] += m.d[i2 * 3 + 1] * s;
      out[o + 2] += m.d[i2 * 3 + 2] * s;
    }
  };
  for (const [k, v] of Object.entries(macroWeights(c))) add(k, v);
  for (const s of DETAIL_SLIDERS) {
    const v = c.detail[s.id] ?? 0;
    if (v > 0) s.pos.forEach((t) => add(t, v));
    else if (v < 0) s.neg.forEach((t) => add(t, -v));
  }
  return out;
}
function morphDeltas(pkg, name) {
  const m = pkg.morphs.get(name);
  if (!m) return null;
  const d = new Float32Array(pkg.base.length);
  for (let i2 = 0; i2 < m.idx.length; i2++) {
    const o = m.idx[i2] * 3;
    d[o] = m.d[i2 * 3] * m.scale;
    d[o + 1] = m.d[i2 * 3 + 1] * m.scale;
    d[o + 2] = m.d[i2 * 3 + 2] * m.scale;
  }
  return d;
}
var tmpA = new Vector3();
var tmpB = new Vector3();
var tmpC = new Vector3();
var asU16 = (a) => a.array instanceof Uint16Array ? a.array : Uint16Array.from(a.array);
function geometryFrom(prim, joints, weights) {
  const g = new BufferGeometry();
  const n = prim.attributes.POSITION.array.length / 3;
  g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("uv", new BufferAttribute(toFloat(prim.attributes.TEXCOORD_0), 2));
  g.setAttribute("skinIndex", new BufferAttribute(asU16(prim.attributes[joints]), 4));
  g.setAttribute("skinWeight", new BufferAttribute(toFloat(prim.attributes[weights]), 4));
  g.setIndex(new BufferAttribute(prim.index, 1));
  if (prim.attributes.COLOR_0) g.setAttribute("color", new BufferAttribute(toFloat(prim.attributes.COLOR_0), prim.attributes.COLOR_0.itemSize));
  return g;
}
function seamPairs(refs, refw, offs) {
  const first = /* @__PURE__ */ new Map(), pairs = [];
  for (let i2 = 0; i2 < refs.length / 3; i2++) {
    let k = "";
    for (let c = 0; c < 3; c++) k += `${refs[i2 * 3 + c]},${Math.round(refw[i2 * 3 + c] * 1e4)},${Math.round(offs[i2 * 3 + c] * 1e5)},`;
    const f = first.get(k);
    if (f === void 0) first.set(k, i2);
    else pairs.push(i2, f);
  }
  return Uint32Array.from(pairs);
}
function hairShading(m) {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <map_fragment>",
      "#include <map_fragment>\n	diffuseColor.rgb *= mix(0.35, 1.0, smoothstep(0.05, 0.85, diffuseColor.a));"
    );
  };
  m.customProgramCacheKey = () => "humanforge-hair";
}
var HumanAvatar = class {
  group = new Group();
  pkg;
  body;
  skeleton;
  mh;
  fullIndex;
  positions;
  proxies = /* @__PURE__ */ new Map();
  config = { ...DEFAULT_HUMAN };
  exprNames;
  exprDeltas;
  skinMat;
  version = 0;
  /** Texture tier; set before the first setConfig (changing it later reloads textures). */
  textureSize = "2k";
  /** Anisotropic filtering for textures (1 = off). Lower is cheaper on phones. */
  anisotropy = 4;
  /** Load clothing normal maps. Turn off for lighter mobile materials. */
  normalMaps = true;
  constructor(pkg) {
    this.pkg = pkg;
    const geo = geometryFrom(pkg.body, "JOINTS_0", "WEIGHTS_0");
    this.mh = asU16(pkg.body.attributes._MH);
    this.fullIndex = pkg.body.index.slice();
    const bones = pkg.manifest.bones.map((b) => Object.assign(new Bone(), { name: b.name }));
    pkg.manifest.bones.forEach((b, i2) => {
      if (b.parent >= 0) bones[b.parent].add(bones[i2]);
    });
    this.skeleton = new Skeleton(bones);
    this.skinMat = new MeshStandardMaterial({ roughness: 0.55, metalness: 0 });
    this.body = new SkinnedMesh(geo, this.skinMat);
    this.body.name = "body";
    this.body.frustumCulled = false;
    this.body.add(bones[0]);
    this.group.add(this.body);
    this.positions = new Float32Array(pkg.base.length);
    this.exprNames = Object.keys(pkg.manifest.expressions).filter((u) => pkg.morphs.has(`expr/${u}`));
    this.exprDeltas = this.exprNames.map((u) => morphDeltas(pkg, `expr/${u}`));
    this.attachMorphs(geo, (i2, k) => this.mh[i2] * 3 + k);
    this.body.updateMorphTargets();
    this.body.morphTargetDictionary = Object.fromEntries(this.exprNames.map((u, i2) => [this.alias(u), i2]));
  }
  get bones() {
    return this.skeleton.bones;
  }
  alias(unit) {
    return this.pkg.manifest.expressions[unit] ?? unit;
  }
  /** Expression morph attributes from full-shape deltas, either by direct lookup or via proxy refs. */
  attachMorphs(geo, lookup, refs) {
    const n = geo.getAttribute("position").count;
    geo.morphAttributes.position = this.exprDeltas.map((d) => {
      const arr = new Float32Array(n * 3);
      for (let i2 = 0; i2 < n; i2++) for (let k = 0; k < 3; k++) {
        arr[i2 * 3 + k] = refs ? refs.w[i2 * 3] * d[refs.r[i2 * 3] * 3 + k] + refs.w[i2 * 3 + 1] * d[refs.r[i2 * 3 + 1] * 3 + k] + refs.w[i2 * 3 + 2] * d[refs.r[i2 * 3 + 2] * 3 + k] : d[lookup(i2, k)];
      }
      return new BufferAttribute(arr, 3);
    });
    geo.morphTargetsRelative = true;
  }
  /** Apply a full or partial config. Loads any new hair/clothes/textures, then reshapes. */
  async setConfig(patch) {
    const prev = this.config;
    const c = this.config = { ...prev, ...patch, detail: { ...prev.detail, ...patch.detail ?? {} } };
    const v = ++this.version;
    const wanted = /* @__PURE__ */ new Map();
    wanted.set("eyes", "eyes-high-poly");
    if (c.eyebrows) wanted.set("eyebrows", `eyebrows-${c.eyebrows}`);
    if (c.eyelashes) wanted.set("eyelashes", `eyelashes-${c.eyelashes}`);
    wanted.set("teeth", "teeth-teeth_base");
    wanted.set("tongue", "tongue-tongue01");
    const meta = (id) => this.pkg.manifest.proxies.find((p) => p.kind === "clothes" && p.id === id);
    if (c.hair && !c.clothes.some((id) => meta(id)?.hidesHair)) wanted.set("hair", `hair-${c.hair}`);
    c.clothes.forEach((id) => wanted.set(`clothes:${id}`, `clothes-${id}`));
    const loads = [...wanted.entries()].map(async ([slot, id]) => {
      const cur = this.proxies.get(slot);
      if (cur && `${cur.meta.kind}-${cur.meta.id}` === id) return null;
      return [slot, await this.loadProxy(id)];
    });
    const sizes = this.pkg.manifest.textureSizes;
    const skin = this.texture(`skins/${c.skin}`, sizes.skin2k);
    const eyes = this.texture(`eyes/${c.eyes}`, sizes.eyes);
    const loaded = await Promise.all(loads);
    const [skinTex, eyeTex] = await Promise.all([skin, eyes]);
    if (v !== this.version) return;
    for (const slot of [...this.proxies.keys()]) if (!wanted.has(slot)) this.removeProxy(slot);
    for (const entry of loaded) {
      if (!entry || !entry[1]) continue;
      this.removeProxy(entry[0]);
      this.proxies.set(entry[0], entry[1]);
      this.group.add(entry[1].mesh);
      if (entry[1].soft) this.group.add(entry[1].soft);
    }
    if (this.skinMat.map !== skinTex) {
      if (!this.skinMat.map) this.skinMat.needsUpdate = true;
      this.skinMat.map = skinTex;
    }
    this.skinMat.color.set(c.skinTint);
    for (const [slot, p] of this.proxies) {
      const m = p.mesh.material;
      if (slot === "hair") {
        m.color.set(c.hairColor);
        p.soft?.material?.color.set(c.hairColor);
      }
      if (slot === "eyebrows") m.color.set(c.eyebrowColor);
      if (slot === "eyes" && m.map !== eyeTex) {
        if (!m.map) m.needsUpdate = true;
        m.map = eyeTex;
      }
      if (p.meta.kind === "clothes" && p.meta.tintable) m.color.set(c.garmentColors?.[clothingInfo(p.meta.id).slot] ?? p.meta.color ?? "#ffffff");
    }
    this.reshape();
  }
  getConfig() {
    return this.config;
  }
  /**
   * Re-apply textures after changing textureSize, anisotropy or normalMaps (meshes stay as they
   * are; already-loaded files come from the cache).
   */
  async reloadTextures() {
    const c = this.config, sizes = this.pkg.manifest.textureSizes;
    const v = this.version;
    const [skin, eyes] = await Promise.all([this.texture(`skins/${c.skin}`, sizes.skin2k), this.texture(`eyes/${c.eyes}`, sizes.eyes)]);
    const maps = await Promise.all([...this.proxies.values()].map(async (p) => [
      p,
      p.meta.texture ? await this.texture(keyOf(p.meta.texture), p.meta.textureSize) : null,
      p.meta.normalTexture && this.normalMaps ? await this.texture(keyOf(p.meta.normalTexture), 1024) : null
    ]));
    if (v !== this.version) return;
    this.skinMat.map = skin;
    for (const [p, map, normal] of maps) {
      for (const m of [p.mesh.material, p.soft?.material].filter(Boolean)) {
        const shaderChange = !!m.normalMap !== !!normal;
        if (p.meta.tileable) {
          for (const t of [map, normal]) if (t && t.wrapS !== RepeatWrapping) {
            t.wrapS = t.wrapT = RepeatWrapping;
            t.needsUpdate = true;
          }
        }
        if (p.meta.kind === "eyes") m.map = eyes;
        else if (map) m.map = map;
        m.normalMap = normal;
        if (shaderChange) m.needsUpdate = true;
      }
    }
  }
  /** Expression by ARKit-style name (e.g. 'jawOpen', 'mouthSmile') or MPFB unit name, weight 0..1. */
  setExpression(name, weight) {
    const unit = this.exprNames.findIndex((u) => u === name || this.alias(u) === name);
    if (unit < 0) return;
    for (const m of [this.body, ...[...this.proxies.values()].map((p) => p.mesh)]) {
      if (m.morphTargetInfluences && unit < m.morphTargetInfluences.length) m.morphTargetInfluences[unit] = weight;
    }
  }
  get expressionNames() {
    return this.exprNames.map((u) => this.alias(u));
  }
  texture(key, nativeSize) {
    return this.pkg.getTexture(key, this.textureSize, nativeSize).then((tex) => {
      if (tex.anisotropy !== this.anisotropy) {
        tex.anisotropy = this.anisotropy;
        tex.needsUpdate = true;
      }
      return tex;
    });
  }
  async loadProxy(fullId) {
    const meta = this.pkg.manifest.proxies.find((p2) => `${p2.kind}-${p2.id}` === fullId);
    if (!meta) return null;
    let p = this.pkg.proxyCache.get(fullId);
    if (!p) {
      p = this.pkg.fetchBinary(`${this.pkg.baseUrl}/${meta.file}`).then(readGlb);
      this.pkg.proxyCache.set(fullId, p);
    }
    const [prim, map, normalMap] = await Promise.all([
      p,
      meta.texture ? this.texture(keyOf(meta.texture), meta.textureSize) : null,
      meta.normalTexture && this.normalMaps ? this.texture(keyOf(meta.normalTexture), 1024) : null
    ]);
    const geo = geometryFrom(prim, "_JOINTS", "_WEIGHTS");
    const refs = asU16(prim.attributes._REFS), refw = toFloat(prim.attributes._REFW), offs = toFloat(prim.attributes._OFFS);
    const mat = new MeshStandardMaterial({
      map,
      normalMap,
      metalness: 0,
      roughness: meta.roughness ?? (meta.kind === "eyes" ? 0.15 : meta.kind === "hair" ? 0.55 : 0.8),
      side: meta.doubleSided ? DoubleSide : FrontSide,
      vertexColors: !!geo.getAttribute("color")
    });
    if (meta.tileable) {
      for (const t of [map, normalMap]) if (t && t.wrapS !== RepeatWrapping) {
        t.wrapS = t.wrapT = RepeatWrapping;
        t.needsUpdate = true;
      }
    }
    let soft;
    if (meta.kind === "hair") {
      mat.alphaTest = 0.5;
      mat.alphaToCoverage = true;
      mat.side = DoubleSide;
      hairShading(mat);
      const tips = mat.clone();
      hairShading(tips);
      tips.alphaTest = 0.04;
      tips.alphaToCoverage = false;
      tips.transparent = true;
      tips.depthWrite = false;
      soft = new SkinnedMesh(geo, tips);
      soft.name = `${fullId}-tips`;
      soft.userData.softPass = true;
      soft.frustumCulled = false;
      soft.renderOrder = 3;
    } else if (meta.transparent) {
      mat.transparent = true;
      mat.depthWrite = false;
    }
    const mesh = new SkinnedMesh(geo, mat);
    mesh.name = fullId;
    mesh.frustumCulled = false;
    mesh.renderOrder = meta.transparent ? 2 + meta.zDepth / 100 : 0;
    if (["eyebrows", "eyelashes", "teeth", "tongue"].includes(meta.kind)) {
      this.attachMorphs(geo, () => 0, { r: refs, w: refw });
      mesh.updateMorphTargets();
      mesh.morphTargetDictionary = this.body.morphTargetDictionary;
      mesh.morphTargetInfluences = [...this.body.morphTargetInfluences ?? []];
    }
    const seams = meta.kind === "clothes" ? seamPairs(refs, refw, offs) : void 0;
    return { meta, mesh, soft, refs, refw, offs, seams: seams?.length ? seams : void 0 };
  }
  removeProxy(slot) {
    const p = this.proxies.get(slot);
    if (!p) return;
    this.group.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();
    if (p.soft) {
      this.group.remove(p.soft);
      p.soft.material.dispose();
    }
    this.proxies.delete(slot);
  }
  /** CPU reshape: body, proxies, skeleton, faces hidden under clothes. */
  reshape() {
    const P = evaluateShape(this.pkg, this.config, this.positions);
    const man = this.pkg.manifest;
    let gy = 0;
    for (const i2 of man.groundVerts) gy += P[i2 * 3 + 1];
    gy /= man.groundVerts.length;
    for (let i2 = 1; i2 < P.length; i2 += 3) P[i2] -= gy;
    const geo = this.body.geometry;
    const pos = geo.getAttribute("position");
    const mh = this.mh;
    for (let i2 = 0; i2 < mh.length; i2++) pos.setXYZ(i2, P[mh[i2] * 3], P[mh[i2] * 3 + 1], P[mh[i2] * 3 + 2]);
    pos.needsUpdate = true;
    const hidden = new Uint8Array(man.vertexCount);
    for (const p of this.proxies.values()) p.meta.deleteVerts?.forEach(([a, b]) => hidden.fill(1, a, b + 1));
    const full = this.fullIndex;
    const kept = [];
    const nAcc = new Float32Array(P.length);
    for (let i2 = 0; i2 < full.length; i2 += 3) {
      const a = mh[full[i2]], b = mh[full[i2 + 1]], c = mh[full[i2 + 2]];
      if (!(hidden[a] || hidden[b] || hidden[c])) kept.push(full[i2], full[i2 + 1], full[i2 + 2]);
      tmpA.fromArray(P, a * 3);
      tmpB.fromArray(P, b * 3).sub(tmpA);
      tmpC.fromArray(P, c * 3).sub(tmpA);
      tmpB.cross(tmpC);
      for (const v of [a, b, c]) {
        nAcc[v * 3] += tmpB.x;
        nAcc[v * 3 + 1] += tmpB.y;
        nAcc[v * 3 + 2] += tmpB.z;
      }
    }
    geo.setIndex(kept);
    const nor = geo.getAttribute("normal");
    for (let i2 = 0; i2 < mh.length; i2++) {
      tmpA.fromArray(nAcc, mh[i2] * 3).normalize();
      nor.setXYZ(i2, tmpA.x, tmpA.y, tmpA.z);
    }
    nor.needsUpdate = true;
    geo.computeBoundingSphere();
    for (const p of this.proxies.values()) {
      const s = p.meta.scale.map(([a, b, d], k) => Math.abs(P[a * 3 + k] - P[b * 3 + k]) / d);
      const g = p.mesh.geometry;
      const pp = g.getAttribute("position");
      const r = p.refs, w = p.refw, o = p.offs;
      for (let i2 = 0; i2 < pp.count; i2++) {
        const a = r[i2 * 3] * 3, b = r[i2 * 3 + 1] * 3, c = r[i2 * 3 + 2] * 3;
        const wa = w[i2 * 3], wb = w[i2 * 3 + 1], wc = w[i2 * 3 + 2];
        pp.setXYZ(
          i2,
          wa * P[a] + wb * P[b] + wc * P[c] + o[i2 * 3] * s[0],
          wa * P[a + 1] + wb * P[b + 1] + wc * P[c + 1] + o[i2 * 3 + 1] * s[1],
          wa * P[a + 2] + wb * P[b + 2] + wc * P[c + 2] + o[i2 * 3 + 2] * s[2]
        );
      }
      pp.needsUpdate = true;
      g.computeVertexNormals();
      if (p.seams) {
        const nn = g.getAttribute("normal"), q = p.seams;
        for (let i2 = 0; i2 < q.length; i2 += 2) {
          tmpA.fromBufferAttribute(nn, q[i2]);
          tmpB.fromBufferAttribute(nn, q[i2 + 1]).add(tmpA);
          nn.setXYZ(q[i2 + 1], tmpB.x, tmpB.y, tmpB.z);
        }
        for (let i2 = q.length - 2; i2 >= 0; i2 -= 2) {
          tmpA.fromBufferAttribute(nn, q[i2 + 1]).normalize();
          nn.setXYZ(q[i2 + 1], tmpA.x, tmpA.y, tmpA.z);
          nn.setXYZ(q[i2], tmpA.x, tmpA.y, tmpA.z);
        }
      }
      g.computeBoundingSphere();
    }
    const mean = (idx, out) => {
      out.set(0, 0, 0);
      for (const i2 of idx) {
        out.x += P[i2 * 3];
        out.y += P[i2 * 3 + 1];
        out.z += P[i2 * 3 + 2];
      }
      return out.divideScalar(idx.length);
    };
    const world = man.bones.map((b) => {
      const h = mean(b.head, new Vector3()), t = mean(b.tail, new Vector3());
      const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), t.sub(h).normalize());
      return new Matrix4().compose(h, q, new Vector3(1, 1, 1));
    });
    const bones = this.skeleton.bones;
    man.bones.forEach((b, i2) => {
      const local = b.parent < 0 ? world[i2].clone() : world[b.parent].clone().invert().multiply(world[i2]);
      local.decompose(bones[i2].position, bones[i2].quaternion, bones[i2].scale);
    });
    this.group.updateMatrixWorld(true);
    this.body.bind(this.skeleton);
    for (const p of this.proxies.values()) {
      p.mesh.bind(this.skeleton, this.body.bindMatrix);
      p.soft?.bind(this.skeleton, this.body.bindMatrix);
    }
  }
  /** Head height and total height (world space at rest), for camera framing. */
  metrics() {
    const head = this.skeleton.bones.find((b) => /Head$/.test(b.name));
    const hp = head ? head.getWorldPosition(new Vector3()) : new Vector3(0, 1.5, 0);
    this.body.geometry.computeBoundingBox();
    const box = this.body.geometry.boundingBox;
    return { headY: hp.y + 0.1, height: box.max.y };
  }
  dispose() {
    for (const k of [...this.proxies.keys()]) this.removeProxy(k);
    this.body.geometry.dispose();
    this.skinMat.dispose();
  }
};
export {
  DEFAULT_HUMAN,
  HumanAvatar,
  loadHumanPackage
};
