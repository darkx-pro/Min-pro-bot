// © 2025 Debraj. All Rights Reserved.
// Optimized for Termux & WhatsApp Baileys

const fs = require('fs');
const { tmpdir } = require("os");
const Crypto = require("crypto");
const path = require("path");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ff = require('fluent-ffmpeg');
const webp = require("node-webpmux");

ff.setFfmpegPath(ffmpegPath);

async function imageToWebp (media) {
    const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`);
    fs.writeFileSync(tmpFileIn, media);
    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on("error", (err) => {
                if (fs.existsSync(tmpFileIn)) fs.unlinkSync(tmpFileIn);
                reject(err);
            })
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec", "libwebp",
                "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0"
            ])
            .toFormat("webp")
            .save(tmpFileOut);
    });

    const buff = fs.readFileSync(tmpFileOut);
    if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut);
    if (fs.existsSync(tmpFileIn)) fs.unlinkSync(tmpFileIn);
    return buff;
}

async function videoToWebp (media) {
    const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`);
    fs.writeFileSync(tmpFileIn, media);
    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on("error", (err) => {
                if (fs.existsSync(tmpFileIn)) fs.unlinkSync(tmpFileIn);
                reject(err);
            })
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec", "libwebp",
                "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0",
                "-loop", "0",
                "-ss", "00:00:00",
                "-t", "00:00:05",
                "-preset", "default",
                "-an",
                "-vsync", "0"
            ])
            .toFormat("webp")
            .save(tmpFileOut);
    });

    const buff = fs.readFileSync(tmpFileOut);
    if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut);
    if (fs.existsSync(tmpFileIn)) fs.unlinkSync(tmpFileIn);
    return buff;
}

async function writeExifImg (media, metadata) {
    let wMedia = await imageToWebp(media);
    return await addExif(wMedia, metadata.packname, metadata.author, metadata.categories);
}

async function writeExifVid (media, metadata) {
    let wMedia = await videoToWebp(media);
    return await addExif(wMedia, metadata.packname, metadata.author, metadata.categories);
}

async function writeExif (media, metadata) {
    let wMedia = /webp/.test(media.mimetype) ? media.data : /image/.test(media.mimetype) ? await imageToWebp(media.data) : /video/.test(media.mimetype) ? await videoToWebp(media.data) : "";
    return await addExif(wMedia, metadata.packname, metadata.author, metadata.categories);
}

async function addExif(webpSticker, packname, author, categories = [''], extra = {}) {
    const img = new webp.Image();
    const json = { 
        'sticker-pack-id': Crypto.randomBytes(32).toString('hex'), 
        'sticker-pack-name': packname, 
        'sticker-pack-publisher': author, 
        'emojis': categories, 
        ...extra 
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    await img.load(webpSticker);
    img.exif = exif;
    return await img.save(null);
}

async function exifAvatar(buffer, packname, author, categories = [''], extra = {}) {
    return await addExif(buffer, packname, author, categories, { 'is-avatar-sticker': 1, ...extra });
}

module.exports = { 
    imageToWebp,
    videoToWebp, 
    writeExifImg, 
    writeExifVid, 
    writeExif, 
    exifAvatar, 
    addExif 
}
