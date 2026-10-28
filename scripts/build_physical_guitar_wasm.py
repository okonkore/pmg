"""Build a tiny Float64 SIMD kernel without a compiler/toolchain dependency.
The generated module exports memory, matrix-vector dot, and per-sample modal flow.
SIMD is only a vectorization of paired doubles, not a change in model precision.
"""
from pathlib import Path
import struct
ROOT=Path(__file__).resolve().parents[1]
def u(n):
 b=[]
 while n>=128:b.append((n&127)|128);n>>=7
 return bytes(b+[n])
def vec(items):return u(len(items))+b''.join(items)
def section(i,p):return bytes([i])+u(len(p))+p
def get(i):return b'\x20'+u(i)
def set_(i):return b'\x21'+u(i)
def const(i):return b'\x41'+u(i)
def op(*a):return b''.join(a)
def addr(base,index):return get(base)+index+const(8)+b'\x6c\x6a'
def load(base,index):return addr(base,index)+b'\x2b\x03\x00'
def store(base,index,value):return addr(base,index)+value+b'\x39\x03\x00'
# dot(matrix, vector, output, rows, paddedEvenColumns), local row5 col6 acc7(v128).
# f64x2 add/mul opcodes 0xf0 / 0xf2, load 0, extract_lane 33.
simd=lambda code:b'\xfd'+u(code)
zero=simd(12)+bytes(16)
matindex=get(5)+get(4)+b'\x6c'+get(6)+b'\x6a'
body=const(0)+set_(5)+b'\x02\x40\x03\x40'+get(5)+get(3)+b'\x4e\x0d\x01'
body+=zero+set_(7)+const(0)+set_(6)+b'\x02\x40\x03\x40'+get(6)+get(4)+b'\x4e\x0d\x01'
body+=get(7)+addr(0,matindex)+simd(0)+b'\x03\x00'+addr(1,get(6))+simd(0)+b'\x03\x00'+simd(242)+simd(240)+set_(7)
body+=get(6)+const(2)+b'\x6a'+set_(6)+b'\x0c\x00\x0b\x0b'
body+=store(2,get(5),get(7)+simd(33)+b'\x00'+get(7)+simd(33)+b'\x01\xa0')
body+=get(5)+const(1)+b'\x6a'+set_(5)+b'\x0c\x00\x0b\x0b\x0b'
dot=vec([u(2)+b'\x7f',u(1)+b'\x7b'])+body
# Vectorized complex flow, two Float64 lanes per mode.
def vload(base):return addr(base,get(7))+simd(0)+b'\x03\x00'
def shuffle(a,b,lanes):return a+b+simd(13)+bytes(lanes)
def cmul(a,b):
 re=shuffle(a,a,list(range(8))*2);im=shuffle(a,a,list(range(8,16))*2)
 swap=shuffle(b,b,list(range(8,16))+list(range(8)))
 sign=simd(12)+struct.pack('<dd',-1,1)
 return re+b+simd(242)+im+swap+simd(242)+sign+simd(242)+simd(240)
body=zero+set_(8)+const(0)+set_(6)+b'\x02\x40\x03\x40'+get(6)+get(5)+b'\x4e\x0d\x01'+get(6)+const(2)+b'\x6c'+set_(7)
body+=vload(0)+set_(9)+vload(1)+set_(10)+vload(2)+set_(11)+vload(3)+set_(12)
body+=get(8)+get(9)+vload(4)+simd(242)+simd(12)+struct.pack('<dd',1,-1)+simd(242)+simd(240)+set_(8)
body+=cmul(get(10),get(9))+cmul(get(11),get(12))+simd(241)+set_(13)
# Flush magnitudes below 1e-200: avoid subnormal slowdowns in already-vanished states.
body+=addr(0,get(7))+get(13)+get(13)+simd(236)+simd(12)+struct.pack('<dd',1e-200,1e-200)+simd(74)+simd(78)+simd(11)+b'\x03\x00'
body+=get(6)+const(1)+b'\x6a'+set_(6)+b'\x0c\x00\x0b\x0b'+get(8)+simd(33)+b'\x00'+get(8)+simd(33)+b'\x01\xa0\x0b'
flow=vec([u(2)+b'\x7f',u(6)+b'\x7b'])+body
# Block-CSR dot: each nonzero is two adjacent Float64 values.
start=get(2)+get(6)+const(4)+b'\x6c\x6a'+b'\x28\x02\x00'
end=get(2)+get(6)+const(1)+b'\x6a'+const(4)+b'\x6c\x6a'+b'\x28\x02\x00'
index=get(1)+get(7)+const(4)+b'\x6c\x6a'+b'\x28\x02\x00'
body=const(0)+set_(6)+b'\x02\x40\x03\x40'+get(6)+get(5)+b'\x4e\x0d\x01'+start+set_(7)+end+set_(8)+zero+set_(9)
body+=b'\x02\x40\x03\x40'+get(7)+get(8)+b'\x4e\x0d\x01'+get(9)
body+=get(0)+get(7)+const(16)+b'\x6c\x6a'+simd(0)+b'\x03\x00'+addr(3,index)+simd(0)+b'\x03\x00'+simd(242)+simd(240)+set_(9)
body+=get(7)+const(1)+b'\x6a'+set_(7)+b'\x0c\x00\x0b\x0b'
body+=store(4,get(6),get(9)+simd(33)+b'\x00'+get(9)+simd(33)+b'\x01\xa0')+get(6)+const(1)+b'\x6a'+set_(6)+b'\x0c\x00\x0b\x0b\x0b'
csr=vec([u(3)+b'\x7f',u(1)+b'\x7b'])+body
types=vec([b'\x60'+vec([b'\x7f']*5)+b'\x00',b'\x60'+vec([b'\x7f']*6)+vec([b'\x7c']),b'\x60'+vec([b'\x7f']*6)+b'\x00'])
exports=vec([u(6)+b'memory'+b'\x02\x00',u(3)+b'dot'+b'\x00\x00',u(4)+b'flow'+b'\x00\x01',u(3)+b'csr'+b'\x00\x02'])
wasm=b'\x00asm\x01\x00\x00\x00'+section(1,types)+section(3,vec([u(0),u(1),u(2)]))+section(5,vec([b'\x01'+u(512)+u(2048)]))+section(7,exports)+section(10,vec([u(len(dot))+dot,u(len(flow))+flow,u(len(csr))+csr]))
p=ROOT/'synth-demo/instruments/physical-guitar/kernel.wasm';p.write_bytes(wasm);print(p,len(wasm))
