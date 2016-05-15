/**
 * The below is an adapted version of Hyllian's code from
 * http://pastebin.com/cbH8ZQQT.
 */

'use strict';

//// *** Super-xBR code begins here - MIT LICENSE *** ///

/*

*******  Super XBR Scaler  *******

Copyright (c) 2016 Hyllian - sergiogdb@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

const wgt1 = 0.129633;
const wgt2 = 0.175068;
const w1 = -wgt1;
const w2 = wgt1 + 0.5;
const w3 = -wgt2;
const w4 = wgt2 + 0.5;

function df(a, b) {
  return Math.abs(a - b);
}

function clamp(x, floor, ceil) {
	return Math.max(Math.min(x, ceil), floor);
}

function matrix4() {
  // Surprisingly, using Uint8Arrays ends up being slower.
	return [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
}

/*
                         P1
|P0|B |C |P1|         C     F4          |a0|b1|c2|d3|
|D |E |F |F4|      B     F     I4       |b0|c1|d2|e3|   |e1|i1|i2|e2|
|G |H |I |I4|   P0    E  A  I     P3    |c0|d1|e2|f3|   |e3|i3|i4|e4|
|P2|H5|I5|P3|      D     H     I5       |d0|e1|f2|g3|
                      G     H5
                         P2

sx, sy
-1  -1 | -2  0   (x+y) (x-y)    -3  1  (x+y-1)  (x-y+1)
-1   0 | -1 -1                  -2  0
-1   1 |  0 -2                  -1 -1
-1   2 |  1 -3                   0 -2

 0  -1 | -1  1   (x+y) (x-y)      ...     ...     ...
 0   0 |  0  0
 0   1 |  1 -1
 0   2 |  2 -2

 1  -1 |  0  2   ...
 1   0 |  1  1
 1   1 |  2  0
 1   2 |  3 -1

 2  -1 |  1  3   ...
 2   0 |  2  2
 2   1 |  3  1
 2   2 |  4  0


*/

function diagonal_edge(mat, wp) {
	let dw1 = wp[0]*(df(mat[0][2], mat[1][1]) + df(mat[1][1], mat[2][0]) +
        df(mat[1][3], mat[2][2]) + df(mat[2][2], mat[3][1])) +
				wp[1]*(df(mat[0][3], mat[1][2]) + df(mat[2][1], mat[3][0])) +
				wp[2]*(df(mat[0][3], mat[2][1]) + df(mat[1][2], mat[3][0])) +
				wp[3]*df(mat[1][2], mat[2][1]) +
				wp[4]*(df(mat[0][2], mat[2][0]) + df(mat[1][3], mat[3][1])) +
				wp[5]*(df(mat[0][1], mat[1][0]) + df(mat[2][3], mat[3][2]));

	let dw2 = wp[0]*(df(mat[0][1], mat[1][2]) + df(mat[1][2], mat[2][3]) +
        df(mat[1][0], mat[2][1]) + df(mat[2][1], mat[3][2])) +
				wp[1]*(df(mat[0][0], mat[1][1]) + df(mat[2][2], mat[3][3])) +
				wp[2]*(df(mat[0][0], mat[2][2]) + df(mat[1][1], mat[3][3])) +
				wp[3]*df(mat[1][1], mat[2][2]) +
				wp[4]*(df(mat[1][0], mat[3][2]) + df(mat[0][1], mat[2][3])) +
				wp[5]*(df(mat[0][2], mat[1][3]) + df(mat[2][0], mat[3][1]));

	return (dw1 - dw2);
}

///////////////////////// Super-xBR scaling
// perform super-xbr (fast shader version) scaling by factor f=2 only.
module.exports = function superxbr(data, w, h) {
  const f = 2;
	const outw = w*f, outh = h*f;
	const wp = [2.0, 1.0, -1.0, 4.0, -1.0, 1.0];
  const out = new Array(outw * outh);

	// First Pass
	const r = matrix4(), g = matrix4(), b = matrix4(), a = matrix4(), Y = matrix4();
  let rf, gf, bf, af, ri, gi, bi, ai;
  let d_edge;
  let min_r_sample, max_r_sample;
  let min_g_sample, max_g_sample;
  let min_b_sample, max_b_sample;
  let min_a_sample, max_a_sample;
	for (let y = 0; y < outh; ++y) {
		for (let x = 0; x < outw; ++x) {
			const cx = x / f, cy = y / f; // central pixels on original images
			// sample supporting pixels in original image
			for (let sx = -1; sx <= 2; ++sx) {
				for (let sy = -1; sy <= 2; ++sy) {
					// clamp pixel locations
					let csy = clamp(sy + cy, 0, h - 1);
					let csx = clamp(sx + cx, 0, w - 1);
					// sample & add weighted components
					let sample = data[csy*w + csx];
					r[sx + 1][sy + 1] = ((sample)>> 0)&0xFF;
					g[sx + 1][sy + 1] = ((sample)>> 8)&0xFF;
					b[sx + 1][sy + 1] = ((sample)>> 16)&0xFF;
					a[sx + 1][sy + 1] = ((sample)>> 24)&0xFF;
					Y[sx + 1][sy + 1] = (0.2126*r[sx + 1][sy + 1] + 0.7152*g[sx + 1][sy + 1] + 0.0722*b[sx + 1][sy + 1]);
				}
			}
			min_r_sample = Math.min(r[1][1], r[2][1], r[1][2], r[2][2]);
			min_g_sample = Math.min(g[1][1], g[2][1], g[1][2], g[2][2]);
			min_b_sample = Math.min(b[1][1], b[2][1], b[1][2], b[2][2]);
			min_a_sample = Math.min(a[1][1], a[2][1], a[1][2], a[2][2]);
			max_r_sample = Math.max(r[1][1], r[2][1], r[1][2], r[2][2]);
			max_g_sample = Math.max(g[1][1], g[2][1], g[1][2], g[2][2]);
			max_b_sample = Math.max(b[1][1], b[2][1], b[1][2], b[2][2]);
			max_a_sample = Math.max(a[1][1], a[2][1], a[1][2], a[2][2]);
			d_edge = diagonal_edge(Y, wp);
      if (d_edge <= 0) {
  			rf = w1*(r[0][3] + r[3][0]) + w2*(r[1][2] + r[2][1]);
  			gf = w1*(g[0][3] + g[3][0]) + w2*(g[1][2] + g[2][1]);
  			bf = w1*(b[0][3] + b[3][0]) + w2*(b[1][2] + b[2][1]);
  			af = w1*(a[0][3] + a[3][0]) + w2*(a[1][2] + a[2][1]);
      } else {
  			rf = w1*(r[0][0] + r[3][3]) + w2*(r[1][1] + r[2][2]);
  			gf = w1*(g[0][0] + g[3][3]) + w2*(g[1][1] + g[2][2]);
  			bf = w1*(b[0][0] + b[3][3]) + w2*(b[1][1] + b[2][2]);
  			af = w1*(a[0][0] + a[3][3]) + w2*(a[1][1] + a[2][2]);
      }
			// anti-ringing, clamp.
			rf = clamp(rf, min_r_sample, max_r_sample);
			gf = clamp(gf, min_g_sample, max_g_sample);
			bf = clamp(bf, min_b_sample, max_b_sample);
			af = clamp(af, min_a_sample, max_a_sample);
			ri = clamp(Math.ceil(rf), 0, 255);
			gi = clamp(Math.ceil(gf), 0, 255);
			bi = clamp(Math.ceil(bf), 0, 255);
			ai = clamp(Math.ceil(af), 0, 255);
			out[y*outw + x] = out[y*outw + x + 1] = out[(y + 1)*outw + x] = data[cy*w + cx];
			out[(y+1)*outw + x+1] = (ai << 24) | (bi << 16) | (gi << 8) | ri;
			++x;
		}
		++y;
	}

	// Second Pass
	wp[0] = 2.0;
	wp[1] = 0.0;
	wp[2] = 0.0;
	wp[3] = 0.0;
	wp[4] = 0.0;
	wp[5] = 0.0;

	for (let y = 0; y < outh; ++y) {
		for (let x = 0; x < outw; ++x) {
			// sample supporting pixels in original image
			for (let sx = -1; sx <= 2; ++sx) {
				for (let sy = -1; sy <= 2; ++sy) {
					// clamp pixel locations
					const csy = clamp(sx - sy + y, 0, f*h - 1);
					const csx = clamp(sx + sy + x, 0, f*w - 1);
					// sample & add weighted components
					const sample = out[csy*outw + csx];
					r[sx + 1][sy + 1] = ((sample)>> 0)&0xFF;
					g[sx + 1][sy + 1] = ((sample)>> 8)&0xFF;
					b[sx + 1][sy + 1] = ((sample)>> 16)&0xFF;
					a[sx + 1][sy + 1] = ((sample)>> 24)&0xFF;
					Y[sx + 1][sy + 1] = (0.2126*r[sx + 1][sy + 1] + 0.7152*g[sx + 1][sy + 1] + 0.0722*b[sx + 1][sy + 1]);
				}
			}
			min_r_sample = Math.min(r[1][1], r[2][1], r[1][2], r[2][2]);
			min_g_sample = Math.min(g[1][1], g[2][1], g[1][2], g[2][2]);
			min_b_sample = Math.min(b[1][1], b[2][1], b[1][2], b[2][2]);
			min_a_sample = Math.min(a[1][1], a[2][1], a[1][2], a[2][2]);
			max_r_sample = Math.max(r[1][1], r[2][1], r[1][2], r[2][2]);
			max_g_sample = Math.max(g[1][1], g[2][1], g[1][2], g[2][2]);
			max_b_sample = Math.max(b[1][1], b[2][1], b[1][2], b[2][2]);
			max_a_sample = Math.max(a[1][1], a[2][1], a[1][2], a[2][2]);
			d_edge = diagonal_edge(Y, wp);
      if (d_edge <= 0) {
  			rf = w3*(r[0][3] + r[3][0]) + w4*(r[1][2] + r[2][1]);
  			gf = w3*(g[0][3] + g[3][0]) + w4*(g[1][2] + g[2][1]);
  			bf = w3*(b[0][3] + b[3][0]) + w4*(b[1][2] + b[2][1]);
  			af = w3*(a[0][3] + a[3][0]) + w4*(a[1][2] + a[2][1]);
      } else {
  			rf = w3*(r[0][0] + r[3][3]) + w4*(r[1][1] + r[2][2]);
  			gf = w3*(g[0][0] + g[3][3]) + w4*(g[1][1] + g[2][2]);
  			bf = w3*(b[0][0] + b[3][3]) + w4*(b[1][1] + b[2][2]);
  			af = w3*(a[0][0] + a[3][3]) + w4*(a[1][1] + a[2][2]);
      }
			// anti-ringing, clamp.
			rf = clamp(rf, min_r_sample, max_r_sample);
			gf = clamp(gf, min_g_sample, max_g_sample);
			bf = clamp(bf, min_b_sample, max_b_sample);
			af = clamp(af, min_a_sample, max_a_sample);
			ri = clamp(Math.ceil(rf), 0, 255);
			gi = clamp(Math.ceil(gf), 0, 255);
			bi = clamp(Math.ceil(bf), 0, 255);
			ai = clamp(Math.ceil(af), 0, 255);
			out[y*outw + x + 1] = (ai << 24) | (bi << 16) | (gi << 8) | ri;

			for (let sx = -1; sx <= 2; ++sx) {
				for (let sy = -1; sy <= 2; ++sy) {
					// clamp pixel locations
					const csy = clamp(sx - sy + 1 + y, 0, f*h - 1);
					const csx = clamp(sx + sy - 1 + x, 0, f*w - 1);
					// sample & add weighted components
					const sample = out[csy*outw + csx];
					r[sx + 1][sy + 1] = ((sample)>> 0)&0xFF;
					g[sx + 1][sy + 1] = ((sample)>> 8)&0xFF;
					b[sx + 1][sy + 1] = ((sample)>> 16)&0xFF;
					a[sx + 1][sy + 1] = ((sample)>> 24)&0xFF;
					Y[sx + 1][sy + 1] = (0.2126*r[sx + 1][sy + 1] + 0.7152*g[sx + 1][sy + 1] + 0.0722*b[sx + 1][sy + 1]);
				}
			}
			d_edge = diagonal_edge(Y, wp);
      if (d_edge <= 0) {
  			rf = w3*(r[0][3] + r[3][0]) + w4*(r[1][2] + r[2][1]);
  			gf = w3*(g[0][3] + g[3][0]) + w4*(g[1][2] + g[2][1]);
  			bf = w3*(b[0][3] + b[3][0]) + w4*(b[1][2] + b[2][1]);
  			af = w3*(a[0][3] + a[3][0]) + w4*(a[1][2] + a[2][1]);
      } else {
  			rf = w3*(r[0][0] + r[3][3]) + w4*(r[1][1] + r[2][2]);
  			gf = w3*(g[0][0] + g[3][3]) + w4*(g[1][1] + g[2][2]);
  			bf = w3*(b[0][0] + b[3][3]) + w4*(b[1][1] + b[2][2]);
  			af = w3*(a[0][0] + a[3][3]) + w4*(a[1][1] + a[2][2]);
      }
			// anti-ringing, clamp.
			rf = clamp(rf, min_r_sample, max_r_sample);
			gf = clamp(gf, min_g_sample, max_g_sample);
			bf = clamp(bf, min_b_sample, max_b_sample);
			af = clamp(af, min_a_sample, max_a_sample);
			ri = clamp(Math.ceil(rf), 0, 255);
			gi = clamp(Math.ceil(gf), 0, 255);
			bi = clamp(Math.ceil(bf), 0, 255);
			ai = clamp(Math.ceil(af), 0, 255);
			out[(y+1)*outw + x] = (ai << 24) | (bi << 16) | (gi << 8) | ri;
			++x;
		}
		++y;
	}

	// Third Pass
	wp[0] =  2.0;
	wp[1] =  1.0;
	wp[2] = -1.0;
	wp[3] =  4.0;
	wp[4] = -1.0;
	wp[5] =  1.0;

	for (let y = outh - 1; y >= 0; --y) {
		for (let x = outw - 1; x >= 0; --x) {
			for (let sx = -2; sx <= 1; ++sx) {
				for (let sy = -2; sy <= 1; ++sy) {
					// clamp pixel locations
					const csy = clamp(sy + y, 0, f*h - 1);
					const csx = clamp(sx + x, 0, f*w - 1);
					// sample & add weighted components
					let sample = out[csy*outw + csx];
					r[sx + 2][sy + 2] = ((sample)>> 0)&0xFF;
					g[sx + 2][sy + 2] = ((sample)>> 8)&0xFF;
					b[sx + 2][sy + 2] = ((sample)>> 16)&0xFF;
					a[sx + 2][sy + 2] = ((sample)>> 24)&0xFF;
					Y[sx + 2][sy + 2] = (0.2126*r[sx + 2][sy + 2] + 0.7152*g[sx + 2][sy + 2] + 0.0722*b[sx + 2][sy + 2]);
				}
			}
			min_r_sample = Math.min(r[1][1], r[2][1], r[1][2], r[2][2]);
			min_g_sample = Math.min(g[1][1], g[2][1], g[1][2], g[2][2]);
			min_b_sample = Math.min(b[1][1], b[2][1], b[1][2], b[2][2]);
			min_a_sample = Math.min(a[1][1], a[2][1], a[1][2], a[2][2]);
			max_r_sample = Math.max(r[1][1], r[2][1], r[1][2], r[2][2]);
			max_g_sample = Math.max(g[1][1], g[2][1], g[1][2], g[2][2]);
			max_b_sample = Math.max(b[1][1], b[2][1], b[1][2], b[2][2]);
			max_a_sample = Math.max(a[1][1], a[2][1], a[1][2], a[2][2]);
			let d_edge = diagonal_edge(Y, wp);
      if (d_edge <= 0) {
  			rf = w1*(r[0][3] + r[3][0]) + w2*(r[1][2] + r[2][1]);
  			gf = w1*(g[0][3] + g[3][0]) + w2*(g[1][2] + g[2][1]);
  			bf = w1*(b[0][3] + b[3][0]) + w2*(b[1][2] + b[2][1]);
  			af = w1*(a[0][3] + a[3][0]) + w2*(a[1][2] + a[2][1]);
      } else {
  			rf = w1*(r[0][0] + r[3][3]) + w2*(r[1][1] + r[2][2]);
  			gf = w1*(g[0][0] + g[3][3]) + w2*(g[1][1] + g[2][2]);
  			bf = w1*(b[0][0] + b[3][3]) + w2*(b[1][1] + b[2][2]);
  			af = w1*(a[0][0] + a[3][3]) + w2*(a[1][1] + a[2][2]);
      }
			// anti-ringing, clamp.
			rf = clamp(rf, min_r_sample, max_r_sample);
			gf = clamp(gf, min_g_sample, max_g_sample);
			bf = clamp(bf, min_b_sample, max_b_sample);
			af = clamp(af, min_a_sample, max_a_sample);
		  ri = clamp(Math.ceil(rf), 0, 255);
			gi = clamp(Math.ceil(gf), 0, 255);
			bi = clamp(Math.ceil(bf), 0, 255);
			ai = clamp(Math.ceil(af), 0, 255);
			out[y*outw + x] = (ai << 24) | (bi << 16) | (gi << 8) | ri;
		}
	}

  return out;
};
