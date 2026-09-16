#!/bin/bash

# Backup current frames to frames-v1 directory
mkdir -p /vercel/share/v0-project/public/frames-v1
cp /vercel/share/v0-project/public/frames/frame-*.jpg /vercel/share/v0-project/public/frames-v1/ 2>/dev/null

echo "Frames backed up to /public/frames-v1/"
ls /vercel/share/v0-project/public/frames-v1/ | wc -l
