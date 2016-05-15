#!/usr/bin/env node
'use strict';

if (process.argv.length < 4) {
  console.error('Usage: test.js in.png out.png');
  process.exit(1);
}

const fs = require('fs');
const Canvas = require('canvas');
const superxbr = require('./index');
const Image = Canvas.Image;

var file = fs.readFileSync(process.argv[2]);
var image = new Image();
image.src = file;

const canvas = new Canvas();
const ctx = canvas.getContext('2d');
canvas.width = image.width;
canvas.height = image.height;
ctx.drawImage(image, 0, 0, image.width, image.height);

// Compress RGBA into single integers
const count = image.width * image.height;
const data = ctx.getImageData(0, 0, image.width, image.height).data;
const original = new Array(count);
for (let i = 0; i < count; i++) {
  const index = i << 2;
  original[i] = (data[index + 3] << 24) + (data[index + 2] << 16) +
    (data[index + 1] << 8) + data[index];
}

const result = superxbr(original, image.width, image.height);

canvas.width *= 2;
canvas.height *= 2;
// Convert integers back to RGBA
const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const dest = newImageData.data;
for (let i = 0; i < count * 4; i++) {
  const index = i << 2;
  dest[index] = result[i] & 255;
  dest[index + 1] = (result[i] >> 8) & 255;
  dest[index + 2] = (result[i] >> 16) & 255;
  dest[index + 3] = (result[i] >> 24) & 255;
}
ctx.putImageData(newImageData, 0, 0);

const stream = canvas.pngStream();
const outStream = fs.createWriteStream(process.argv[3]);
stream.on('data', function(chunk) {
  outStream.write(chunk);
});
