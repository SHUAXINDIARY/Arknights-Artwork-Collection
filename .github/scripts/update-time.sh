#!/bin/bash

# 获取最新 commit 的 ISO 格式时间
COMMIT_TIME=$(git log -1 --format="%cI")

echo "Latest commit time: $COMMIT_TIME"

# 使用 sed 替换 following.html 中的 LAST_UPDATE_TIME 值
sed -i "s/window\.LAST_UPDATE_TIME = \"[^\"]*\"/window.LAST_UPDATE_TIME = \"$COMMIT_TIME\"/" following.html

echo "Updated following.html with new timestamp"
