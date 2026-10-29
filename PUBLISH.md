# 发布到 GitHub Pages

这份作品集是**纯静态 + Jekyll**：`docs/index.html` 是主页，`docs/reports/*.md` 由 GitHub Pages 内置的 Jekyll 渲染成 HTML。

## 一、推送仓库

```powershell
cd test-portfolio
git init
git add .
git commit -m "test: add mall QA portfolio"
git branch -M main
git remote add origin https://github.com/<your-github>/mall-test-portfolio.git
git push -u origin main
```

> 如果仓库名不是 `mall-test-portfolio`，作品集地址会变成 `https://<your-github>.github.io/<repo>/`，功能不受影响。

## 二、开启 Pages

1. 打开仓库 **Settings → Pages**；
2. **Source** 选择 **Deploy from a branch**；
3. **Branch** 选择 `main`，目录选择 **`/docs`**；
4. 点击 **Save**，等待 1–2 分钟；
5. 访问 `https://<your-github>.github.io/mall-test-portfolio/`。

## 三、替换占位信息

全局搜索并替换以下占位符：

| 占位符 | 替换为 | 出现位置 |
|---|---|---|
| `<your-github>` / `your-github` | 你的 GitHub 用户名 | `README.md`、`docs/index.html`、`.github/` |
| `yourname@example.com` | 你的邮箱 | `docs/index.html` |
| `https://<username>.github.io/mall-test-portfolio/` | 实际 Pages 地址 | `README.md` |

PowerShell 批量替换示例：

```powershell
$files = Get-ChildItem -Recurse -File -Include *.md,*.html
foreach ($f in $files) {
    $t = [System.IO.File]::ReadAllText($f.FullName)
    $t = $t.Replace('<your-github>', 'your-id').Replace('yourname@example.com', 'you@example.com')
    [System.IO.File]::WriteAllText($f.FullName, $t, (New-Object System.Text.UTF8Encoding($false)))
}
```

## 四、检查清单

- [ ] 主页能打开，9 份报告链接都能跳转
- [ ] 两张性能图表能悬停、能展开数据表
- [ ] `docs/evidence/pytest-report.html` 能打开
- [ ] `docs/evidence/jmeter-login-200/index.html` 能打开
- [ ] Postman 集合与 JMX 能下载
- [ ] 仓库里没有 `.venv/`、`__pycache__/`、`*.log`、227 MB 运行日志
- [ ] 已替换所有 `<your-github>` 与邮箱占位符

## 五、可选：自定义域名

1. 在仓库根目录添加 `CNAME` 文件，内容为你的域名（如 `qa.example.com`）；
2. 在域名服务商添加 CNAME 记录指向 `<your-github>.github.io`；
3. 在 **Settings → Pages → Custom domain** 填入域名并开启 HTTPS。

## 六、说明

- GitHub Pages 对项目站点默认使用 `https://<user>.github.io/<repo>/`，本仓库所有链接均为相对路径，无需改 `baseurl`。
- `docs/_config.yml` 已配置 `kramdown + GFM`，支持 Markdown 表格与代码高亮。
- 如果使用 GitHub Actions 的 "Static HTML" 部署方式，Jekyll 不会渲染 Markdown 报告；请使用上面的 **Deploy from a branch / docs** 方式。
