# super-xbr

A port of [Hyllian](mailto:sergiogdb@gmail.com)'s Super-xBR algorithm (http://pastebin.com/cbH8ZQQT) to JavaScript.

Scales raw image data by 2x using the Super xBR algorithm.
https://en.wikipedia.org/wiki/Image_scaling#xBR_family

### Usage

```
import superxbr from 'super-xbr';
const scaledPixels = superxbr(originalPixels, width, height);
```

#### Params

- `data`: an `W*H` array of 32-bit integers. The element at position `i` should be the RGBA pixel at `x = i%W, y = i/W`.
- `width`: width of the image in pixels.
- `height`: height of the image in pixels.

#### Return value

An array of size `4*W*H` representing the enlarged image.
The format will be same as the expected input for `data`.

### Sample

Created using `test.js test-original.png test-2x.png` (requires `npm install canvas`)

| Original | Scaled 2x |
|----------|----|
|<img src="test-original.png" height="276" />|<img src="test-2x.png" />|
