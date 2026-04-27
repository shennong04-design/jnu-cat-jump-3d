# 暨南猫咪跳一跳 · 手机端 H5 小游戏

以四只暨南猫咪为角色的“跳一跳”网页小游戏，主要面向手机用户。

## 已实现

- 四只角色：校霸、澳黑、琳琳、没礼貌
- 手机端长按蓄力，松手起跳
- 猫咪活动动作：
  - 待机呼吸浮动
  - 待机眨眼
  - 长时间不操作会原地小跳/摆动
  - 蓄力下蹲压缩
  - 起跳拉伸
  - 空中弧线运动、轻微翻转、残影
  - 落地压缩回弹、脚印、粒子、完美落点爱心
- 分数、最高分、连击、完美落点奖励
- 建筑平台图片资产：
  - 石牌校区 · 暨南大学校门
  - 石牌校区 · 图书馆
  - 番禺校区 · 番禺图书馆
  - 番禺校区 · 教学楼群
  - 珠海校区 · 珠海图书馆
  - 珠海校区 · 校园牌坊
  - 深圳校区 · 深圳学院楼
  - 华文学院 · 华文学院楼

## 关于建筑图片

当前环境无法联网检索和下载真实建筑照片，所以项目里先放入了可直接运行的风格化建筑 SVG 图片资产。  
后续如需换成真实校园照片，只需要保持同名文件路径，替换：

```text
assets/buildings/*.svg
```

也可以把 `game.js` 中的 `BUILDING_DATA` 图片路径改成你自己的照片路径。

## 本地运行

直接打开 `index.html`，或使用：

```bash
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

## GitHub Pages 部署

1. 新建仓库：`jnu-campus-cat-jump`
2. 上传本项目所有文件
3. 进入仓库 `Settings → Pages`
4. Source 选择 `GitHub Actions`
5. 等待 Actions 完成

如果你的 GitHub 用户名是 `shennong04-design`，仓库名是 `jnu-campus-cat-jump`，网址通常是：

```text
https://shennong04-design.github.io/jnu-campus-cat-jump/
```
